import AL from "alclient"
import { Client, IntentsBitField, type TextChannel } from "discord.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import type { GLike } from "./commands/itemIcon.js"
import { fetchTradeMarket, tradeMarketHasListings } from "./commands/tradeMarket.js"
import { buildTradeReply, pickTradeIconOverlays } from "./commands/tradeReply.js"

const ALDATA_BASE_URL = (process.env.ALDATA_URL ?? "http://localhost:8080").replace(/\/$/, "")
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const credentialsCandidates = [
    process.env.AL_CREDENTIALS,
    path.resolve(__dirname, "../../../../credentials.json"),
].filter((p): p is string => typeof p === "string" && p.length > 0)

type DiscordCredentials = {
    discord: { auth: string; TRADE_CHANNEL: string }
}

function loadCredentials(): DiscordCredentials {
    for (const candidate of credentialsCandidates) {
        if (!fs.existsSync(candidate)) continue
        console.log(`Using credentials: ${candidate}`)
        const parsed: unknown = JSON.parse(fs.readFileSync(candidate, "utf-8"))
        if (
            !parsed ||
            typeof parsed !== "object" ||
            !("discord" in parsed) ||
            !parsed.discord ||
            typeof parsed.discord !== "object"
        ) {
            throw new Error(`Invalid credentials shape in ${candidate}`)
        }
        const discord = parsed.discord as Record<string, unknown>
        if (typeof discord.auth !== "string" || typeof discord.TRADE_CHANNEL !== "string") {
            throw new Error(`Missing discord.auth / discord.TRADE_CHANNEL in ${candidate}`)
        }
        return { discord: { auth: discord.auth, TRADE_CHANNEL: discord.TRADE_CHANNEL } }
    }
    throw new Error("Could not find credentials.json (set AL_CREDENTIALS or place credentials.json at repo root)")
}

async function buildTradeMessages(item: string) {
    const G = await AL.Game.getGData()
    const gItem = G.items[item as keyof typeof G.items]
    if (!gItem) {
        return [
            {
                content: `Simulated \`/trade ${item}\`\nI couldn't find \`${item}\` in G (v${G.version}) 🤔`,
            },
        ]
    }

    const market = await fetchTradeMarket(ALDATA_BASE_URL, item)
    if (!market.merchantsOk && !market.tradesOk) {
        return [
            {
                content: `Simulated \`/trade ${item}\` (ALData: ${ALDATA_BASE_URL})\nSorry, I had an error finding data for \`${item}\`. 😥`,
            },
        ]
    }

    if (!tradeMarketHasListings(market)) {
        return [
            {
                content: `📢 **Simulated \`/trade ${item}\`** (ALData: \`${ALDATA_BASE_URL}\`)\nI couldn't find anyone trading \`${item}\` 🥲`,
            },
        ]
    }

    const overlays = pickTradeIconOverlays({
        selling: market.selling,
        buying: market.buying,
        swapOffering: market.swapOffering,
        swapWanting: market.swapWanting,
        dealWts: market.dealWts,
        dealWtb: market.dealWtb,
    })

    return buildTradeReply({
        item,
        gPrice: gItem.g,
        selling: market.selling,
        buying: market.buying,
        swapOffering: market.swapOffering,
        swapWanting: market.swapWanting,
        dealWts: market.dealWts,
        dealWtb: market.dealWtb,
        footer: `ALData ${ALDATA_BASE_URL}`,
        contentPrefix: `📢 **Simulated \`/trade ${item}\`**`,
        icon: {
            G: G as GLike,
            ...overlays,
        },
    })
}

async function pickItemsFromTrades(): Promise<string[]> {
    try {
        const res = await fetch(`${ALDATA_BASE_URL}/trades`)
        if (!res.ok) return []
        const owners: unknown = await res.json()
        if (!Array.isArray(owners)) return []
        const names = new Set<string>()
        for (const owner of owners) {
            if (!owner || typeof owner !== "object") continue
            const listings = (owner as { listings?: unknown }).listings
            if (!Array.isArray(listings)) continue
            for (const listing of listings) {
                if (!listing || typeof listing !== "object") continue
                const name = (listing as { name?: unknown }).name
                if (typeof name === "string" && name) names.add(name)
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
const tradeChannel = process.env.TRADE_CHANNEL ?? credentials.discord.TRADE_CHANNEL

console.log(`ALDATA_URL=${ALDATA_BASE_URL}`)
console.log(`Items: ${finalItems.join(", ")}`)
console.log(`Channel: ${tradeChannel}`)

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
})

async function runSimulation(): Promise<void> {
    try {
        const channel = await client.channels.fetch(tradeChannel)
        if (!channel || !("send" in channel)) {
            throw new Error(`Channel ${tradeChannel} is not a text channel`)
        }
        const textChannel = channel as TextChannel

        await textChannel.send(
            `🧪 **Local trade simulation starting**\nALData: \`${ALDATA_BASE_URL}\`\nItems: ${finalItems
                .map((i) => `\`${i}\``)
                .join(", ")}`,
        )

        for (const item of finalItems) {
            const messages = await buildTradeMessages(item)
            console.log(`--- ${item} (${messages.length} message(s)) ---`)
            for (const message of messages) {
                await textChannel.send({
                    content: message.content,
                    embeds: message.embeds,
                    files: message.files,
                })
            }
        }

        await textChannel.send("🧪 **Local trade simulation finished**")
        console.log("Posted all simulated /trade messages.")
    } catch (e) {
        console.error(e)
    } finally {
        void client.destroy()
        process.exit(0)
    }
}

let started = false
const onReady = () => {
    if (started) return
    started = true
    void runSimulation()
}

// discord.js v14 emits "ready"; v15 renames to "clientReady".
client.once("clientReady", onReady)
client.once("ready", onReady)

await client.login(credentials.discord.auth)
