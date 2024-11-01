import { Client, TextChannel, EmbedBuilder } from "discord.js"
import AL, { PullMerchantsCharData, ItemDataTrade, ItemName, TitleName } from "alclient"

const FETCH_INTERVAL = 60000 // 1 minute interval for fetching merchants
let previousMerchants: PullMerchantsCharData[] | null = null
let previouslyAvailableItems: Set<string> = new Set()

// Initialize merchant tracking with Discord client and channel ID
export function initializeMerchantTracker(client: Client, tradeChannelId: string) {
    client.once("ready", () => {
        console.log(`Merchant tracker started on ${client.user?.tag}`)
        setInterval(() => void fetchAndCompareMerchants(client, tradeChannelId), FETCH_INTERVAL)
    })
}

// Mock initialization for testing with hardcoded data instead of getMerchants endpoint
export function testInitializeMerchantTracker(client: Client, tradeChannelId: string) {
    // Populate previous and new merchant responses with mock data to trigger each event
    const mockPreviousMerchants: PullMerchantsCharData[] = [
        {
            name: "MerchantA",
            level: 10,
            server: "US East",
            map: "main",
            x: 100,
            y: 100,
            afk: false,
            slots: {
                trade1: { rid: "test", name: "sword", level: 1, price: 1000, p: "shiny" },
                trade2: { rid: "test2", name: "shield", level: 1, price: 1500, p: "shiny" },
            },
            skin: "skin1",
            cx: {},
            stand: "cstand",
        },
        {
            name: "MerchantB",
            level: 15,
            server: "US West",
            map: "main",
            x: 200,
            y: 200,
            afk: true,
            slots: {
                trade1: { rid: "test3", name: "sword", level: 1, price: 1100, p: "shiny" },
            },
            skin: "skin2",
            cx: {},
            stand: "stand1",
        },
    ]

    const mockNewMerchants: PullMerchantsCharData[] = [
        {
            name: "MerchantA",
            level: 10,
            server: "US East",
            map: "main",
            x: 100,
            y: 100,
            afk: false,
            slots: {
                trade1: { rid: "test1", name: "sword", level: 1, price: 900, p: "shiny" }, // Price decrease
                trade2: { rid: "test2", name: "shield", level: 1, price: 1500, p: "shiny" }, // No change
            },
            skin: "skin1",
            cx: {},
            stand: "cstand",
        },
        {
            name: "MerchantB",
            level: 15,
            server: "US West",
            map: "main",
            x: 200,
            y: 200,
            afk: true,
            slots: {
                trade1: { rid: "test3", name: "sword", level: 1, price: 1200, p: "shiny" }, // Price increase
                trade2: { rid: "test4", name: "angelwings", level: 1, price: 200, p: "shiny" }, // New item
            },
            skin: "skin2",
            cx: {},
            stand: "stand1",
        },
        {
            name: "MerchantC",
            level: 5,
            server: "US East",
            map: "main",
            x: 300,
            y: 300,
            afk: false,
            slots: {
                trade1: { rid: "test5", name: "shield", level: 1, price: 1400, p: "shiny" }, // New merchant with existing item
            },
            skin: "skin3",
            cx: {},
            stand: "stand0",
        },
    ]

    previousMerchants = mockPreviousMerchants
    previouslyAvailableItems = new Set(
        mockPreviousMerchants.flatMap((m) => Object.values(m.slots).map((item) => item.name)),
    )

    client.once("ready", () => {
        // Call the comparison function with the mock data
        const events = analyzeMerchantData(mockPreviousMerchants, mockNewMerchants)
        void postEventsEmbeds(client, tradeChannelId, events)
    })
}

// Main function to fetch and compare merchant data
async function fetchAndCompareMerchants(client: Client, tradeChannelId: string) {
    try {
        const newMerchants: PullMerchantsCharData[] = await AL.Game.getMerchants()

        if (previousMerchants) {
            const events = analyzeMerchantData(previousMerchants, newMerchants)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (Object.keys(events).some((key) => events[key].length > 0)) {
                await postEventsEmbeds(client, tradeChannelId, events)
            }
        }

        previousMerchants = newMerchants
    } catch (error) {
        console.error("Error fetching merchant data:", error)
    }
}

// Helper function to create a unique identifier for item grouping
function getItemIdentifier(item: ItemDataTrade): string {
    return `${item.name}_${item.level}_${item.p}`
}
function analyzeMerchantData(oldData: PullMerchantsCharData[], newData: PullMerchantsCharData[]) {
    const events: {
        [itemId: string]: {
            item: ItemDataTrade
            merchant: PullMerchantsCharData | undefined
            type: "deal" | "priceIncrease" | "priceDecrease" | "itemUnavailable" | "itemAvailableAgain"
        }[]
    } = {}

    const allItemsNewData: { [itemId: string]: { merchant: PullMerchantsCharData; item: ItemDataTrade }[] } = {}
    const allItemsOldData: { [itemId: string]: ItemDataTrade[] } = {}

    newData.forEach((merchant) => {
        Object.entries(merchant.slots).forEach(([, item]) => {
            if (item) {
                const itemId = getItemIdentifier(item)
                if (!allItemsNewData[itemId]) {
                    allItemsNewData[itemId] = []
                }
                allItemsNewData[itemId].push({ merchant, item })
            }
        })
    })

    oldData.forEach((merchant) => {
        Object.values(merchant.slots).forEach((item) => {
            if (item) {
                const itemId = getItemIdentifier(item)
                if (!allItemsOldData[itemId]) {
                    allItemsOldData[itemId] = []
                }
                allItemsOldData[itemId].push(item)
            }
        })
    })

    for (const [itemId, newItems] of Object.entries(allItemsNewData)) {
        const lowestPrice = Math.min(...newItems.map(({ item }) => item.price))

        for (const { merchant, item } of newItems) {
            const oldItem = allItemsOldData[itemId]?.find((old) => old.price === item.price)

            if (!oldItem) {
                if (!events[itemId]) events[itemId] = []
                events[itemId].push({
                    item,
                    merchant,
                    type: item.price === lowestPrice ? "deal" : "priceIncrease",
                })
            } else if (oldItem.price !== item.price) {
                if (!events[itemId]) events[itemId] = []
                events[itemId].push({
                    item,
                    merchant,
                    type: item.price < oldItem.price ? "priceDecrease" : "priceIncrease",
                })
            }
        }
    }

    const availableItems = new Set(Object.keys(allItemsNewData))
    previouslyAvailableItems.forEach((itemId) => {
        if (!availableItems.has(itemId)) {
            if (!events[itemId]) events[itemId] = []
            const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]
            // TODO: look up old item prices?
            events[itemId].push({
                item: { rid: itemId, name, level, price: 0, p },
                merchant: undefined,
                type: "itemUnavailable",
            })
        }
    })

    for (const itemId of availableItems) {
        if (!previouslyAvailableItems.has(itemId)) {
            if (!events[itemId]) events[itemId] = []
            allItemsNewData[itemId].forEach(({ merchant, item }) => {
                events[itemId].push({
                    item,
                    merchant,
                    type: "itemAvailableAgain",
                })
            })
        }
    }

    previouslyAvailableItems = availableItems

    return events
}
async function postEventsEmbeds(
    client: Client,
    tradeChannelId: string,
    events: {
        [itemId: string]: {
            item: ItemDataTrade
            merchant: PullMerchantsCharData
            type: "deal" | "priceIncrease" | "priceDecrease" | "itemUnavailable" | "itemAvailableAgain"
        }[]
    },
) {
    const tradeChannel = client.channels.cache.get(tradeChannelId) as TextChannel
    if (!tradeChannel) {
        console.error("Trade channel not found")
        return
    }

    const embeds: EmbedBuilder[] = []

    const eventTypeStyles = {
        deal: { emoji: "🔥", title: "HOT DEAL!", color: 0xff4500, message: "Snag it before it’s gone!" },
        priceIncrease: { emoji: "⬆️", title: "Price Increase", color: 0xff0000, message: "The price just went up!" },
        priceDecrease: { emoji: "⬇️", title: "Price Decrease", color: 0x32cd32, message: "Lucky day! Lower price!" },
        itemUnavailable: {
            emoji: "🚫",
            title: "Item Unavailable",
            color: 0x808080,
            message: "This item is no longer available",
        },
        itemAvailableAgain: { emoji: "🎊", title: "Item Restocked", color: 0x1e90ff, message: "Restocked and ready!" },
    }

    for (const [, eventList] of Object.entries(events)) {
        eventList.forEach((event) => {
            // Lookup for gItem details
            const gItem = AL.Game.G.items[event.item.name]

            const style = eventTypeStyles[event.type]

            // const embed = new EmbedBuilder()
            //     .setTitle(`${style.emoji} ${style.title}`)
            //     .setDescription(
            //         `**${gItem.name}** (${event.item.name})\n*Event Type:* **${event.type}**\n${style.message}`,
            //     )
            //     .setColor(style.color)
            //     .setTimestamp()

            // if (event.merchant) {
            //     embed.addFields({
            //         name: `Merchant: ${event.merchant.name} - ${event.merchant.server}`,
            //         value: `🌍 **Map**: ${event.merchant.map} at (${event.merchant.x}, ${event.merchant.y})\n💸 **Price**: **${event.item.price} gold**`,
            //         inline: false,
            //     })
            // }

            const embed = new EmbedBuilder()
                .setTitle(`${style.emoji} ${style.title}: ${gItem.name} (${event.item.name})`)
                .setDescription(`*Event Type:* **${event.type}**\n${style.message}`)
                .setColor(style.color)
                .setTimestamp()
                .addFields(
                    { name: "Merchant", value: `${event.merchant?.name} - ${event.merchant?.server}`, inline: true },
                    {
                        name: "🌍 Location",
                        value: `${event.merchant?.map} (${event.merchant?.x}, ${event.merchant?.y})`,
                        inline: true,
                    },
                    { name: "💰 Price", value: ` **${event.item.price} gold**`, inline: true },
                )

            embeds.push(embed)
        })
    }

    for (let i = 0; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, i + 10)
        await tradeChannel.send({ embeds: batch })
    }
}
