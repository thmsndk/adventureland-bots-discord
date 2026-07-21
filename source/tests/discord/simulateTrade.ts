/**
 * Simulate /trade replies by posting to TRADE_CHANNEL (public, not ephemeral).
 *
 * Usage (from repo root after build):
 *   ALDATA_URL=http://localhost:8080 node build/tests/discord/simulateTrade.js cryptkey tombkey cape
 *
 * Defaults to a few common keys if no items are passed.
 */
import AL, { ItemDataTrade, ItemName } from "alclient"
import { Client, IntentsBitField, TextChannel } from "discord.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

type ItemRef = { name: string; level?: number; p?: string }
type TradeOffer = { item: ItemRef; give: number; receive: number; negotiable?: boolean }
type TradeSide = {
    price?: number
    priceNegotiable?: boolean
    note?: string
    quantity?: number
    trades?: TradeOffer[]
}
type TradeListing = ItemRef & { note?: string; wts?: TradeSide; wtb?: TradeSide }
type OwnerTrades = { owner: string; listings: TradeListing[]; lastUpdated?: number; label?: string }

const DISCORD_CONTENT_LIMIT = 2000
const ALDATA_BASE_URL = (process.env.ALDATA_URL ?? "http://localhost:8080").replace(/\/$/, "")

function ownerDisplayName(ownerTrades: OwnerTrades): string {
    return ownerTrades.label || ownerTrades.owner
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const credentialsCandidates = [
    process.env.AL_CREDENTIALS,
    path.resolve(__dirname, "../../../../credentials.json"),
    path.resolve("C:/Projects/AdventureLand/adventureland-bots-discord/credentials.json"),
    path.resolve("C:/Projects/AdventureLand/earthiverse/adventureland-bots-discord/credentials.json"),
].filter(Boolean) as string[]

function loadCredentials() {
    for (const candidate of credentialsCandidates) {
        if (fs.existsSync(candidate)) {
            console.log(`Using credentials: ${candidate}`)
            return JSON.parse(fs.readFileSync(candidate, "utf-8"))
        }
    }
    throw new Error("Could not find credentials.json")
}

function truncateDiscordContent(content: string): string {
    if (content.length <= DISCORD_CONTENT_LIMIT) return content
    const suffix = "\n… (truncated)"
    return content.slice(0, DISCORD_CONTENT_LIMIT - suffix.length) + suffix
}

function formatListingMeta(listing: ItemRef): string {
    const parts: string[] = []
    if (listing.level !== undefined) parts.push(`level ${listing.level}`)
    if (listing.p) parts.push(listing.p)
    return parts.join(" ")
}

function formatBankSideLines(owner: string, sideLabel: "WTS" | "WTB", listing: TradeListing, side: TradeSide): string[] {
    const lines: string[] = []
    const quantity = side.quantity === undefined ? "" : `${side.quantity} `
    const meta = formatListingMeta(listing)
    const metaPart = meta ? `${meta} ` : ""
    const note = side.note ?? listing.note

    if (side.price !== undefined) {
        const obo = side.priceNegotiable ? " (OBO)" : ""
        const notePart = note ? ` — ${note}` : ""
        lines.push(`${owner} ${sideLabel} ${quantity}${metaPart}@ ${side.price.toLocaleString()}${obo}${notePart}`)
    }

    if (side.trades) {
        for (const offer of side.trades) {
            const negotiable = offer.negotiable ? " (negotiable)" : ""
            const offerMeta = formatListingMeta(offer.item)
            const forItem = offerMeta ? `${offerMeta} ${offer.item.name}` : offer.item.name
            lines.push(`${owner} ${sideLabel} ${quantity}${offer.give}:${offer.receive} for ${forItem}${negotiable}`)
        }
    }

    return lines
}

async function buildTradeMessage(item: string): Promise<string> {
    const G = await AL.Game.getGData()
    const gItem = G.items[item as ItemName]
    if (!gItem) {
        return `Simulated \`/trade ${item}\`\nI couldn't find \`${item}\` in G (v${G.version}) 🤔`
    }

    const [merchantsResponse, tradesResponse] = await Promise.all([
        fetch(`${ALDATA_BASE_URL}/merchants/`),
        fetch(`${ALDATA_BASE_URL}/trades`),
    ])

    const merchantsOk = merchantsResponse.status === 200
    const tradesOk = tradesResponse.status === 200

    if (!merchantsOk && !tradesOk) {
        return `Simulated \`/trade ${item}\` (ALData: ${ALDATA_BASE_URL})\nSorry, I had an error finding data for \`${item}\`. 😥`
    }

    const buyingData: any[] = []
    const sellingData: any[] = []
    const bankWtsLines: string[] = []
    const bankWtbLines: string[] = []

    if (merchantsOk) {
        const data = await merchantsResponse.json()
        for (const player of data) {
            if (Date.now() - Date.parse(player.lastSeen) > 8.64e7) continue
            for (const slotName in player.slots) {
                const slot = player.slots[slotName] as ItemDataTrade
                if (!slot || slot.name !== item) continue
                if (slot.giveaway) continue

                if (slot.b) {
                    buyingData.push({
                        id: player.id,
                        level: slot.level,
                        price: slot.price,
                        q: slot.q,
                        serverIdentifier: player.serverIdentifier,
                        serverRegion: player.serverRegion,
                    })
                } else {
                    sellingData.push({
                        id: player.id,
                        level: slot.level,
                        p: slot.p,
                        price: slot.price,
                        q: slot.q,
                        serverIdentifier: player.serverIdentifier,
                        serverRegion: player.serverRegion,
                    })
                }
            }
        }
    }

    if (tradesOk) {
        const owners = (await tradesResponse.json()) as OwnerTrades[]
        for (const ownerTrades of owners) {
            for (const listing of ownerTrades.listings ?? []) {
                if (listing.name !== item) continue
                if (listing.wts) {
                    bankWtsLines.push(...formatBankSideLines(ownerDisplayName(ownerTrades), "WTS", listing, listing.wts))
                }
                if (listing.wtb) {
                    bankWtbLines.push(...formatBankSideLines(ownerDisplayName(ownerTrades), "WTB", listing, listing.wtb))
                }
            }
        }
    }

    const hasMerchants = buyingData.length > 0 || sellingData.length > 0
    const hasBank = bankWtsLines.length > 0 || bankWtbLines.length > 0

    let content = `📢 **Simulated \`/trade ${item}\`** (ALData: \`${ALDATA_BASE_URL}\`)\n`
    content += `The base price, according to \`G\`, is \`${gItem.g}\`.`

    if (!hasMerchants && !hasBank) {
        content += `\nI couldn't find anyone trading \`${item}\` 🥲`
        return truncateDiscordContent(content)
    }

    if (sellingData.length) {
        sellingData.sort((a, b) => {
            if (a.level && b.level) return b.level - a.level
            if (a.p && !b.p) return -1
            if (!a.p && b.p) return 1
            if (a.p && b.p) return (b.p as string).localeCompare(a.p)
            return b.price - a.price
        })
        content += `\nI found the following players selling \`${item}\` 🙂\n\`\`\``
        for (const d of sellingData) {
            const quantity = d.q === undefined ? "" : `${d.q} `
            const title = d.p ? `${d.p} ` : ""
            const level = d.level === undefined ? "" : `level ${d.level} `
            content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is selling ${quantity}${title}${level}@ ${d.price.toLocaleString()}`
        }
        content += "```"
    }

    if (buyingData.length) {
        buyingData.sort((a, b) => {
            if (a.level && b.level) return b.level - a.level
            if (a.p && !b.p) return -1
            if (!a.p && b.p) return 1
            if (a.p && b.p) return (b.p as string).localeCompare(a.p)
            return b.price - a.price
        })
        content += `\nI found the following players buying \`${item}\` 🙂\n\`\`\``
        for (const d of buyingData) {
            const quantity = `${d.q} `
            const level = d.level === undefined ? "" : `level ${d.level} `
            content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is buying ${quantity}${level}@ ${d.price.toLocaleString()}`
        }
        content += "```"
    }

    if (bankWtsLines.length) {
        content += `\nBank WTS for \`${item}\`:\n\`\`\``
        for (const line of bankWtsLines) content += `\n${line}`
        content += "```"
    }

    if (bankWtbLines.length) {
        content += `\nBank WTB for \`${item}\`:\n\`\`\``
        for (const line of bankWtbLines) content += `\n${line}`
        content += "```"
    }

    return truncateDiscordContent(content)
}

async function pickItemsFromTrades(): Promise<string[]> {
    try {
        const res = await fetch(`${ALDATA_BASE_URL}/trades`)
        if (!res.ok) return []
        const owners = (await res.json()) as OwnerTrades[]
        const names = new Set<string>()
        for (const owner of owners) {
            for (const listing of owner.listings ?? []) {
                if (listing.name) names.add(listing.name)
            }
        }
        return [...names].slice(0, 5)
    } catch {
        return []
    }
}

const credentials = loadCredentials()
await AL.Game.getGData(true, false)

const argItems = process.argv.slice(2).filter((a) => !a.startsWith("-"))
const items = argItems.length ? argItems : await pickItemsFromTrades()
const finalItems = items.length ? items : ["cryptkey", "tombkey", "spiderkey"]

console.log(`ALDATA_URL=${ALDATA_BASE_URL}`)
console.log(`Items: ${finalItems.join(", ")}`)
console.log(`Channel: ${credentials.discord.TRADE_CHANNEL}`)

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
})

client.once("ready", async () => {
    try {
        const channel = await client.channels.fetch(credentials.discord.TRADE_CHANNEL)
        if (!channel || !channel.isTextBased()) {
            throw new Error(`Channel ${credentials.discord.TRADE_CHANNEL} is not a text channel`)
        }
        const textChannel = channel as TextChannel

        await textChannel.send(
            `🧪 **Local trade simulation starting**\nALData: \`${ALDATA_BASE_URL}\`\nItems: ${finalItems.map((i) => `\`${i}\``).join(", ")}`,
        )

        for (const item of finalItems) {
            const content = await buildTradeMessage(item)
            console.log(`--- ${item} (${content.length} chars) ---`)
            await textChannel.send(content)
        }

        await textChannel.send("🧪 **Local trade simulation finished**")
        console.log("Posted all simulated /trade messages.")
    } catch (e) {
        console.error(e)
    } finally {
        client.destroy()
        process.exit(0)
    }
})

await client.login(credentials.discord.auth)
