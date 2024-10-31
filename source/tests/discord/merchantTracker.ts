import { Client, TextChannel, EmbedBuilder } from "discord.js"
import AL, { PullMerchantsCharData, ItemDataTrade } from "alclient"

// const FETCH_INTERVAL = 60000 // 1 minute interval for fetching merchants
const FETCH_INTERVAL = 10000 // 10 second for fetching merchants
let previousMerchants: PullMerchantsCharData[] | null = null
previousMerchants = [
    {
        name: "Telokis",
        level: 85,
        afk: "code",
        skin: "marmor7c",
        cx: { hair: "hairdo424" },
        stand: "cstand",
        x: 0,
        y: -69.99999,
        map: "main",
        server: "ASIA I",
        slots: {
            trade1: {
                name: "fury",
                rid: "H2dV",
                price: 4000000000,
                b: true,
                q: 5,
                level: 0,
            },
            trade2: {
                name: "wingedboots",
                rid: "eOyU",
                price: 300000000,
                b: true,
                q: 5,
                level: 8,
            },
            trade3: { name: "gem0", rid: "R5RF", price: 300000, b: true, q: 9999 },
            trade5: {
                name: "supermittens",
                rid: "ZO5G",
                price: 5000000000,
                b: true,
                q: 3,
                level: 0,
            },
            trade7: { name: "tigerhelmet", level: 7, price: 35000000, rid: "mOQu" },
            trade8: { price: 35000000, name: "tigerhelmet", rid: "k5h3", level: 7 },
            trade9: { price: 35000000, name: "tigerhelmet", rid: "V2HI", level: 7 },
            trade11: { name: "tigerhelmet", level: 7, price: 35000000, rid: "r3SU" },
            trade12: { name: "tigerstone", level: 3, price: 400000000, rid: "pfzo" },
            trade13: { name: "mittens", level: 9, price: 1500000000, rid: "k98A" },
            trade14: { name: "mittens", level: 9, price: 1500000000, rid: "oApK" },
            trade16: {
                name: "monstertoken",
                rid: "Ef4d",
                price: 300000,
                b: true,
                q: 9917,
            },
            trade17: {
                name: "monstertoken",
                rid: "B26V",
                price: 300000,
                b: true,
                q: 9999,
            },
            trade19: { name: "candy0", rid: "S5Of", price: 1000000, b: true, q: 9999 },
            trade20: {
                name: "tigerhelmet",
                level: 0,
                price: 5000000,
                p: "shiny",
                rid: "d497",
            },
            trade22: {
                name: "monstertoken",
                rid: "TCkD",
                price: 300000,
                b: true,
                q: 9999,
            },
            trade23: {
                name: "monstertoken",
                rid: "LicB",
                price: 300000,
                b: true,
                q: 9999,
            },
            trade28: { name: "feather0", rid: "SxhW", price: 200000, b: true, q: 9996 },
            trade29: {
                name: "luckscroll",
                rid: "UgTG",
                price: 5000000000,
                b: true,
                q: 3,
            },
            trade30: {
                name: "goldscroll",
                rid: "N6s9",
                price: 2500000000,
                b: true,
                q: 3,
            },
        },
    },
]

// Initialize merchant tracking with Discord client and channel ID
export function initializeMerchantTracker(client: Client, tradeChannelId: string) {
    client.once("ready", () => {
        console.log(`Merchant tracker started on ${client.user?.tag}`)
        setInterval(() => void fetchAndCompareMerchants(client, tradeChannelId), FETCH_INTERVAL)
    })
}

// Main function to fetch and compare merchant data
async function fetchAndCompareMerchants(client: Client, tradeChannelId: string) {
    console.log("fetchAndCompareMerchants")
    try {
        const newMerchants: PullMerchantsCharData[] = (await AL.Game.getMerchants()).filter((x) => x.name === "Plutus")
        // const m = newMerchants.find((x) => x.name === "Plutus")
        // console.log(m)

        if (previousMerchants) {
            const newDeals = extractNewDeals(previousMerchants, newMerchants)
            console.log("newDeals", newDeals)
            if (Object.keys(newDeals).length > 0) {
                await postGroupedDealsEmbeds(client, tradeChannelId, newDeals)
            }
        }

        previousMerchants = newMerchants
    } catch (error) {
        console.error("Error fetching merchant data:", error)
    }
}

// Compare old and new data to identify new deals or price changes, grouping by item name and including merchant details
function extractNewDeals(oldData: PullMerchantsCharData[], newData: PullMerchantsCharData[]) {
    const dealsByItem: { [itemName: string]: { merchant: PullMerchantsCharData; item: ItemDataTrade }[] } = {}

    for (const newMerchant of newData) {
        const oldMerchant = oldData.find((merchant) => merchant.name === newMerchant.name)

        for (const [slot, newItem] of Object.entries(newMerchant.slots)) {
            if (!newItem) continue

            const oldItem = oldMerchant?.slots[slot as keyof typeof newMerchant.slots]

            // If there's no old item or if it has changed, it's a new or updated deal
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                if (!dealsByItem[newItem.name]) {
                    dealsByItem[newItem.name] = []
                }

                // Add the specific item and its merchant details as a deal
                dealsByItem[newItem.name].push({ merchant: newMerchant, item: newItem })
            }
        }
    }

    return dealsByItem
}

// Send an embed for each item, listing all merchants with that item and relevant details
async function postGroupedDealsEmbeds(
    client: Client,
    tradeChannelId: string,
    dealsByItem: { [itemName: string]: { merchant: PullMerchantsCharData; item: ItemDataTrade }[] },
) {
    const tradeChannel = client.channels.cache.get(tradeChannelId) as TextChannel
    if (!tradeChannel) {
        console.error("Trade channel not found")
        return
    }

    const embeds: EmbedBuilder[] = []

    for (const [itemName, deals] of Object.entries(dealsByItem)) {
        const embed = new EmbedBuilder()
            .setTitle(`🛒 New Deals for ${itemName}`)
            .setDescription(`Latest merchant offers for **${itemName}**`)
            .setColor(0x00ae86)
            .setTimestamp()

        deals.forEach(({ merchant, item }) => {
            embed.addFields({
                name: `${merchant.name} (Lvl ${merchant.level}) - ${merchant.server}`,
                value: `**Location**: ${merchant.map} (${merchant.x}, ${merchant.y})\n**Status**: ${
                    merchant.afk ? "AFK" : "Active"
                }\n**Price**: **${item.price} gold**`,
                inline: false,
            })
        })

        embeds.push(embed)
    }

    // embeds[BASE_TYPE_MAX_LENGTH]: Must be 10 or fewer in length.
    if (embeds.length > 0) {
        await tradeChannel.send({ embeds: embeds.slice(0, 10) })
    }
}
