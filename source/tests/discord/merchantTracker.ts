import { Client, TextChannel, EmbedBuilder } from "discord.js"
import AL, { PullMerchantsCharData, ItemDataTrade, ItemName, TitleName } from "alclient"

const FETCH_INTERVAL = 60000 // 1 minute interval for fetching merchants
let previousMerchants: PullMerchantsCharData[] | null = null

// Initialize merchant tracking with Discord client and channel ID
export function initializeMerchantTracker(client: Client, tradeChannelId: string) {
    client.once("ready", () => {
        console.log(`Merchant tracker started on ${client.user?.tag}`)
        setInterval(() => void fetchAndCompareMerchants(client, tradeChannelId), FETCH_INTERVAL)
    })
}

// Mock initialization for testing with hardcoded data instead of getMerchants endpoint
export function testInitializeMerchantTracker(client: Client, tradeChannelId: string) {
    // Mock previous merchant responses
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
                trade1: { rid: "test1", name: "sword", level: 1, price: 1000, p: "shiny", b: false },
                trade2: { rid: "test2", name: "shield", level: 1, price: 1500, p: "shiny", b: false },
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
                trade1: { rid: "test3", name: "sword", level: 1, price: 1100, p: "shiny", b: false },
                trade2: { rid: "test4", name: "bow", level: 1, price: 1200, p: "shiny", b: false },
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
                // trade1: { rid: "test5", name: "helmet", level: 1, price: 500, p: "shiny", b: false },
                trade2: { rid: "test6", name: "hboots", level: 1, price: 300, p: "shiny", b: true },
                // Trigger no longer being sold.
                trade3: { rid: "test5", name: "phelmet", level: 1, price: 500, p: "shiny", b: false },
            },
            skin: "skin3",
            cx: {},
            stand: "stand0",
        },
    ]

    // Mock new merchant responses
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
                // Price decrease (HOT DEAL, it's now the cheapest sword being sold)
                // it's also a merchant price decrease for merchant A
                trade1: { rid: "test1", name: "sword", level: 1, price: 900, p: "shiny", b: false },
                trade2: { rid: "test2", name: "shield", level: 1, price: 1500, p: "shiny", b: false },
                // New item (listed by a merchant, noone else was selling this, but is someone buying it? and what is the price comparison?)
                trade3: { rid: "test7", name: "dagger", level: 1, price: 800, p: "shiny", b: false },
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
                // Merchant increased price
                trade1: { rid: "test3", name: "sword", level: 1, price: 1200, p: "shiny", b: false },
                // Price increase (STONKS) this is now the cheapest bow
                trade2: { rid: "test4", name: "bow", level: 1, price: 1300, p: "shiny", b: false },
                // New item (listed by a merchant, noone else was selling this, but is someone buying it? and what is the price comparison?)
                trade3: { rid: "test7", name: "dagger", level: 1, price: 800, p: "shiny", b: false },
            },
            skin: "skin2",
            cx: {},
            stand: "stand1",
        },
        {
            name: "MerchantD",
            level: 20,
            server: "US Central",
            map: "main",
            x: 400,
            y: 400,
            afk: false,
            slots: {
                // merchant did not sell this before, but others did.
                trade1: { rid: "test8", name: "sword", level: 1, price: 1000, p: "shiny", b: false },
            },
            skin: "skin4",
            cx: {},
            stand: "stand0",
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
                // Buy order price increase
                trade2: { rid: "test6", name: "hboots", level: 1, price: 350, p: "shiny", b: true },
            },
            skin: "skin3",
            cx: {},
            stand: "stand0",
        },
    ]

    // Set the initial state
    previousMerchants = mockPreviousMerchants

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
            // We only want to inspect changes in a merchants inventory, so if a new merchant appears with new items, we won't catch them. but we won't spam restock events either every time they open/close thier stand
            const filteredMerchants = newMerchants.filter((merchant) => {
                const merchantHadStandOpenLastScan = previousMerchants.find((x) => x.name === merchant.name)

                if (merchantHadStandOpenLastScan) {
                    return true
                }

                console.log(
                    `${merchant.name} was filtered out from new merchants because they've just opened their stand`,
                )

                return false
            })

            // TODO: Remove merchants after a certain period of inactivity / not being present in new merchants
            // Handle players opening and closing their stands and thus not being present in the dataset.
            for (const merchant of previousMerchants) {
                if (!newMerchants.find((x) => x.name === merchant.name)) {
                    console.log(`${merchant.name} added from previous merchants`)
                    newMerchants.push(merchant) // add for next run because their stand is now closed
                    filteredMerchants.push(merchant) // add for analyze because their stand is now closed
                }
            }

            const events = analyzeMerchantData(previousMerchants, filteredMerchants)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (Object.keys(events).some((key) => events[key].length > 0)) {
                await postEventsEmbeds(client, tradeChannelId, events)
            } else {
                console.log("no events")
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
type BuySellMinMax = {
    buy: { merchant: PullMerchantsCharData; item: ItemDataTrade }[]
    sell: { merchant: PullMerchantsCharData; item: ItemDataTrade }[]

    minBuyPrice?: number
    maxBuyPrice?: number

    minSellPrice?: number
    maxSellPrice?: number
}

type ItemDataById = {
    [itemId: string]: BuySellMinMax & {
        merchants: Record<string, BuySellMinMax>
    }
}

function processMerchantData(data: PullMerchantsCharData[]): ItemDataById {
    const itemDataById: ItemDataById = {}

    for (const merchant of data) {
        for (const [, item] of Object.entries(merchant.slots)) {
            if (!item) continue // Skip if item is not defined

            const itemId = getItemIdentifier(item)
            if (!itemDataById[itemId]) {
                itemDataById[itemId] = {
                    buy: [],
                    sell: [],
                    minBuyPrice: Infinity,
                    maxBuyPrice: -Infinity,
                    minSellPrice: Infinity,
                    maxSellPrice: -Infinity,
                    // TODO: merchants should be the actual merchant as key so we can detect internal merchant changes
                    merchants: {},
                }
            }

            const itemData = itemDataById[itemId]

            if (!itemData.merchants[merchant.name]) {
                itemData.merchants[merchant.name] = {
                    buy: [],
                    sell: [],

                    minBuyPrice: Infinity,
                    maxBuyPrice: -Infinity,
                    minSellPrice: Infinity,
                    maxSellPrice: -Infinity,
                }
            }

            const merchantData = itemData.merchants[merchant.name]

            if (item.b) {
                // Buy order
                itemData.buy.push({ merchant, item })
                itemData.minBuyPrice = Math.min(itemData.minBuyPrice, item.price)
                itemData.maxBuyPrice = Math.max(itemData.maxBuyPrice, item.price)

                merchantData.buy.push({ merchant, item })
                merchantData.minBuyPrice = Math.min(merchantData.minBuyPrice, item.price)
                merchantData.maxBuyPrice = Math.max(merchantData.maxBuyPrice, item.price)
            } else {
                // Sell order
                itemData.sell.push({ merchant, item })
                itemData.minSellPrice = Math.min(itemData.minSellPrice, item.price)
                itemData.maxSellPrice = Math.max(itemData.maxSellPrice, item.price)

                merchantData.sell.push({ merchant, item })
                merchantData.minSellPrice = Math.min(merchantData.minSellPrice, item.price)
                merchantData.maxSellPrice = Math.max(merchantData.maxSellPrice, item.price)
            }
        }
    }

    return itemDataById
}

type EventTypes =
    | "hotSellOrder"
    | "priceIncrease"
    | "priceDecrease"
    | "itemUnavailable"
    | "itemNoLongerSold"
    | "itemAvailableAgain" // technically both buy and sell orders
    | "itemBeingSold"

function analyzeMerchantData(oldData: PullMerchantsCharData[], newData: PullMerchantsCharData[]) {
    const events: {
        [itemId: string]: {
            item: ItemDataTrade
            merchant: PullMerchantsCharData | undefined
            type: EventTypes
        }[]
    } = {}

    const allItemsNewData = processMerchantData(newData)
    const allItemsOldData = processMerchantData(oldData)

    // Events

    // TODO: - A merchants wants to buy an item at a higher price than existing buy orders, perhaps sell orders

    // TODO: restock, listed more of the item, or more quantity if stackable items

    // TODO: - Merchant internal changes
    // TODO:   - A merchant increased their own price
    // TODO:   - A merchant decreased their own price
    // TODO:   - A merchant listed an item they did not have before
    // TODO:   - A merchant removed an item and is no longer selling it

    // TODO: wait with internal merchant changes for now

    for (const itemId in allItemsNewData) {
        const itemData = allItemsNewData[itemId]
        const previousItemData = allItemsOldData[itemId]

        if (!previousItemData || previousItemData.sell.length == 0) {
            if (!events[itemId]) events[itemId] = []

            // One ore more merchants are now selling an item that was not sold before
            // TODO: what about existing buy orders?
            // If it's cheaper than existing buy orders it's a HOT DEAL
            // if it's more expensive, it's just being sold now

            itemData.sell.forEach(({ merchant, item }) => {
                events[itemId].push({
                    item,
                    merchant,
                    type: "itemBeingSold",
                })
            })
        } else {
            // TODO: What if someone is selling an item cheaper, than others are buying it, is it then a HOT DEAL? Do we want to broadcast that?

            // a new price that is cheaper than previously, is a HOT DEAL, do we even want to label it as a hot deal, or just a price decrease?
            const cheaperThanPrevious = itemData.sell
                .filter((x) => x.item.price < previousItemData.minSellPrice)
                .sort((a, b) => a.item.price - b.item.price)[0]
            if (cheaperThanPrevious) {
                if (!events[itemId]) events[itemId] = []

                // TODO: how about how much cheaper it is? e.g. the price diff?
                events[itemId].push({
                    item: cheaperThanPrevious.item,
                    merchant: cheaperThanPrevious.merchant,
                    // type: "hotSellOrder",
                    type: "priceDecrease",
                })
            }

            // - STONKS - An item is increased in price e.g primlings going from 2.5m to 3m e.g. no merchant is selling this item at a lower price
            const moreExpensiveThanPrevious = itemData.sell
                .filter((x) => x.item.price > previousItemData.maxSellPrice && x.item.price <= itemData.minSellPrice)
                .sort((a, b) => a.item.price - b.item.price)[0]
            if (moreExpensiveThanPrevious) {
                if (!events[itemId]) events[itemId] = []

                // TODO: How much more expensive is it?
                events[itemId].push({
                    item: moreExpensiveThanPrevious.item,
                    merchant: moreExpensiveThanPrevious.merchant,
                    type: "priceIncrease",
                })
            }
        }
    }

    for (const itemId in allItemsOldData) {
        const itemData = allItemsNewData[itemId]
        const previousItemData = allItemsOldData[itemId]

        if (!itemData) {
            if (!events[itemId]) events[itemId] = []

            // Item is no longer listed at market at all
            const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]
            // TODO: look up old item prices buying and sell?
            events[itemId].push({
                item: { rid: itemId, name, level, price: 0, p },
                merchant: undefined,
                type: "itemUnavailable",
            })
        }

        if (
            itemData &&
            itemData.sell.length == 0 &&
            itemData.buy.length > 0 &&
            previousItemData &&
            previousItemData.sell.length > 0
        ) {
            if (!events[itemId]) events[itemId] = []
            // No merchants are selling this item anymore
            const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]
            // TODO: look up old item sell prices
            // TODO: What about merchants still buying it?
            events[itemId].push({
                item: { rid: itemId, name, level, price: 0, p },
                merchant: undefined,
                type: "itemNoLongerSold",
            })
        }
    }

    // for (const [itemId, newItems] of Object.entries(allItemsNewData)) {
    //     const lowestPrice = Math.min(...newItems.map(({ item }) => item.price))

    //     for (const { merchant, item } of newItems) {
    //         const oldItem = allItemsOldData[itemId]?.find((old) => old.price === item.price)

    //         if (!oldItem) {
    //             if (!events[itemId]) events[itemId] = []
    //             events[itemId].push({
    //                 item,
    //                 merchant,
    //                 type: item.price === lowestPrice ? "deal" : "priceIncrease",
    //             })
    //         } else if (oldItem.price !== item.price) {
    //             if (!events[itemId]) events[itemId] = []
    //             events[itemId].push({
    //                 item,
    //                 merchant,
    //                 type: item.price < oldItem.price ? "priceDecrease" : "priceIncrease",
    //             })
    //         }
    //     }
    // }

    // const availableItems = new Set(Object.keys(allItemsNewData))
    // previouslyAvailableItems.forEach((itemId) => {
    //     if (!availableItems.has(itemId)) {
    //         if (!events[itemId]) events[itemId] = []
    //         const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]
    //         // TODO: look up old item prices?
    //         events[itemId].push({
    //             item: { rid: itemId, name, level, price: 0, p },
    //             merchant: undefined,
    //             type: "itemUnavailable",
    //         })
    //     }
    // })

    // for (const itemId of availableItems) {
    //     if (!previouslyAvailableItems.has(itemId)) {
    //         if (!events[itemId]) events[itemId] = []
    //         allItemsNewData[itemId].forEach(({ merchant, item }) => {
    //             events[itemId].push({
    //                 item,
    //                 merchant,
    //                 type: "itemAvailableAgain",
    //             })
    //         })
    //     }
    // }

    // previouslyAvailableItems = availableItems

    return events
}
async function postEventsEmbeds(
    client: Client,
    tradeChannelId: string,
    events: {
        [itemId: string]: {
            item: ItemDataTrade
            merchant: PullMerchantsCharData
            type: EventTypes
        }[]
    },
) {
    const tradeChannel = client.channels.cache.get(tradeChannelId) as TextChannel
    if (!tradeChannel) {
        console.error("Trade channel not found")
        return
    }

    // TODO: A message per item with embeds? or an embed per item?
    // TODO: We gotta remember the limits of how many messages can be sent?
    const embeds: EmbedBuilder[] = []

    type EventTypeStyle = {
        emoji: string
        title: string
        color: number
        message: string
    }

    const eventTypeStyles: Partial<Record<EventTypes, EventTypeStyle>> = {
        hotSellOrder: { emoji: "🔥", title: "HOT DEAL!", color: 0xff4500, message: "Snag it before it’s gone!" },
        priceIncrease: { emoji: "📈", title: "Price Increase", color: 0xff0000, message: "The price just went up!" },
        priceDecrease: { emoji: "📉", title: "Price Decrease", color: 0x32cd32, message: "Lucky day! Lower price!" },
        itemUnavailable: {
            emoji: "🚫",
            title: "Item Unavailable",
            color: 0x808080,
            message: "This item is no longer available, no one is buying or selling",
        },
        itemNoLongerSold: {
            emoji: "🚫",
            title: "Not Sold",
            color: 0x808080,
            message: "This item is no longer being sold",
        },
        itemAvailableAgain: { emoji: "🎊", title: "Item Restocked", color: 0x1e90ff, message: "Restocked and ready!" },
        itemBeingSold: {
            emoji: "💸",
            title: "Item Restocked!",
            color: 0x1e90ff,
            message: "Item is now being sold again",
        },
    }

    // TODO: Perhaps a message per item with embeds?
    // TODO: or a single embed for an item, with all relevant events
    // TODO: For some reason i'm generating hot deal, price increase, item restock for sword
    for (const [itemId, eventList] of Object.entries(events)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]

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

            // TODO: one embed, with multiple merchant fields, we don't know the order of the events, group/ sort by type
            const embed = new EmbedBuilder()
                .setTitle(`${style.emoji} ${style.title}: ${gItem.name} (${event.item.name})`)
                .setDescription(`*Event Type:* **${event.type}**\n${style.message}`)
                .setColor(style.color)
                .setTimestamp()

            if (event.merchant) {
                embed.addFields(
                    { name: "Merchant", value: `${event.merchant?.name} - ${event.merchant?.server}`, inline: true },
                    {
                        name: "🌍 Location",
                        value: `${event.merchant?.map} (${event.merchant?.x}, ${event.merchant?.y})`,
                        inline: true,
                    },
                    { name: "💰 Price", value: ` **${event.item.price} gold**`, inline: true },
                )
            }

            embeds.push(embed)
        })
    }

    for (let i = 0; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, i + 10)
        await tradeChannel.send({ embeds: batch })
    }
}
