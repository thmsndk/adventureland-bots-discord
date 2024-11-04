import { Client, TextChannel, EmbedBuilder } from "discord.js"
import AL, { PullMerchantsCharData, ItemDataTrade, ItemName, TitleName } from "alclient"
import { abbreviateNumber, getTitleName } from "./utils.js"

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
        void postEventsMessage(client, tradeChannelId, events)
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

                console.log(`${merchant.name} was filtered out from analysis because they've just opened their stand`)

                return false
            })

            // TODO: Remove merchants after a certain period of inactivity / not being present in new merchants
            // Handle players opening and closing their stands and thus not being present in the dataset.
            for (const merchant of previousMerchants) {
                if (!newMerchants.find((x) => x.name === merchant.name)) {
                    console.log(`${merchant.name} added from previous merchants because their stand is now closed`)
                    newMerchants.push(merchant) // add for next run because their stand is now closed
                    filteredMerchants.push(merchant) // add for analyze because their stand is now closed
                }
            }

            const events = analyzeMerchantData(previousMerchants, filteredMerchants)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (Object.keys(events).some((key) => events[key].length > 0)) {
                await postEventsMessage(client, tradeChannelId, events)
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
    | "priceIncreaseSellOrder"
    | "priceDecreaseSellOrder"
    | "itemUnavailable"
    | "itemNoLongerSold"
    | "itemAvailableAgain" // technically both buy and sell orders
    | "itemBeingSold"

type Event = {
    item: ItemDataTrade
    merchant: PullMerchantsCharData | undefined
    type: EventTypes
    previous?: { item: ItemDataTrade; merchant: PullMerchantsCharData | undefined }
}

function analyzeMerchantData(oldData: PullMerchantsCharData[], newData: PullMerchantsCharData[]) {
    console.log("analyzeMerchantData")

    const events: Record<string, Event[]> = {}

    const previousItemsData = processMerchantData(oldData)
    const itemsData = processMerchantData(newData)

    // Events
    // TODO: restock, listed more of the item, or more quantity if stackable items

    // TODO: - Merchant internal changes
    // TODO:   - A merchant increased their own price
    // TODO:   - A merchant decreased their own price
    // TODO:   - A merchant listed an item they did not have before
    // TODO:   - A merchant removed an item and is no longer selling it

    // TODO: wait with internal merchant changes for now

    for (const itemId in itemsData) {
        const itemData = itemsData[itemId]
        const previousItemData = previousItemsData[itemId]

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
                // Sorted ascending
                .sort((a, b) => a.item.price - b.item.price)[0]
            if (cheaperThanPrevious) {
                if (!events[itemId]) events[itemId] = []

                // previous sell price, sorted descending
                const previousItem = previousItemData.sell.sort((a, b) => a.item.price - b.item.price)[0]

                events[itemId].push({
                    item: cheaperThanPrevious.item,
                    merchant: cheaperThanPrevious.merchant,
                    // type: "hotSellOrder",
                    type: "priceDecreaseSellOrder",
                    previous: previousItem,
                })
            }

            // - STONKS - An item is increased in price e.g primlings going from 2.5m to 3m e.g. no merchant is selling this item at a lower price
            const moreExpensiveThanPrevious = itemData.sell
                .filter((x) => x.item.price > previousItemData.maxSellPrice && x.item.price <= itemData.minSellPrice)
                // Sorted ascending
                .sort((a, b) => a.item.price - b.item.price)[0]
            if (moreExpensiveThanPrevious) {
                if (!events[itemId]) events[itemId] = []

                // previous sell price, sorted descending
                const previousItem = previousItemData.sell.sort((a, b) => a.item.price - b.item.price)[0]

                events[itemId].push({
                    item: moreExpensiveThanPrevious.item,
                    merchant: moreExpensiveThanPrevious.merchant,
                    type: "priceIncreaseSellOrder",
                    previous: previousItem,
                })
            }

            // TODO: - A merchants wants to buy an item at a higher price than existing buy orders
        }
    }

    for (const itemId in previousItemsData) {
        const itemData = itemsData[itemId]
        const previousItemData = previousItemsData[itemId]

        if (!itemData) {
            if (!events[itemId]) events[itemId] = []

            // Item is no longer listed at market at all
            const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]

            // previous sell price, sorted descending
            const previousItem = previousItemData.sell.sort((a, b) => a.item.price - b.item.price)[0]

            events[itemId].push({
                item: previousItem.item,
                merchant: previousItem.merchant,
                type: "itemUnavailable",
            })

            // console.log("itemUnavailable", previousItemData, itemData)
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

            // previous sell price, sorted descending
            const previousItem = previousItemData.sell.sort((a, b) => a.item.price - b.item.price)[0]

            events[itemId].push({
                item: previousItem.item,
                merchant: previousItem.merchant,
                type: "itemNoLongerSold",
            })
        }
    }

    return events
}
async function postEventsMessage(client: Client, tradeChannelId: string, events: Record<string, Event[]>) {
    const tradeChannel = client.channels.cache.get(tradeChannelId) as TextChannel
    if (!tradeChannel) {
        console.error("Trade channel not found")
        return
    }

    console.log("postEventsMessage")

    if (Object.keys(events).length == 0) {
        console.log("No events")
        return
    }

    await postEventASCIIMessage(tradeChannel, events)

    await postEventsEmbeds(tradeChannel, events)
}

type EventTypeStyle = {
    emoji: string
    title: string
    color: number
    message: string
}

const eventTypeStyles: Partial<Record<EventTypes, EventTypeStyle>> = {
    hotSellOrder: { emoji: "🔥", title: "HOT DEAL!", color: 0xff4500, message: "Snag it before it’s gone!" },
    priceIncreaseSellOrder: {
        emoji: "📈",
        title: "Price Increase",
        color: 0xff0000,
        message: "The price just went up!",
    },
    priceDecreaseSellOrder: {
        emoji: "📉",
        title: "Price Decrease",
        color: 0x32cd32,
        message: "Lucky day! Lower price!",
    },
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

async function postEventsEmbeds(tradeChannel: TextChannel, events: Record<string, Event[]>) {
    // TODO: A message per item with embeds? or an embed per item?
    // TODO: We gotta remember the limits of how many messages can be sent?
    const embeds: EmbedBuilder[] = []

    // TODO: Perhaps a message per item with embeds?
    // TODO: or a single embed for an item, with all relevant events
    // TODO: For some reason i'm generating hot deal, price increase, item restock for sword
    for (const [itemId, eventList] of Object.entries(events)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]

        eventList.forEach((event) => {
            // Lookup for gItem details
            const gItem = AL.Game.G.items[event.item.name]

            let titleName = getTitleName(event.item, AL.Game.G)
            if (titleName) {
                titleName += " "
            }

            const itemLevel = event.item.level ? `+${event.item.level} ` : ""
            const itemName = `${itemLevel}${titleName}${gItem.name}`

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
                .setTitle(`${style.emoji} ${itemName} (${event.item.name})`)
                .setDescription(`**${style.title}**\n${style.message}`)
                // .setDescription(`${style.title} - *Event Type:* **${event.type}**\n${style.message}`)
                .setColor(style.color)
                .setTimestamp()

            if (event.merchant) {
                embed.addFields(
                    { name: "Merchant", value: `${event.merchant?.name}`, inline: true },
                    {
                        name: "🌍 Location",
                        value: `${event.merchant?.server}\n${event.merchant?.map} (${event.merchant?.x}, ${event.merchant?.y})`,
                        inline: true,
                    },
                )

                const trend = event.previous ? `${getPriceTrend(event.item.price, event.previous.item.price)}` : ""

                embed.addFields({
                    name: "💰 Price",
                    value: `${trend}\n**${abbreviateNumber(event.item.price)}**`,
                    inline: true,
                })
            }

            embeds.push(embed)
        })
    }

    for (let i = 0; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, i + 10)
        await tradeChannel.send({ embeds: batch })
    }
}

async function postEventASCIIMessage(tradeChannel: TextChannel, events: Record<string, Event[]>) {
    const maxMessageLength = 2000
    let currentMessage = "📢 **Merchant Tracker Update** 📢\n"
    currentMessage += "----------------------------------------\n"

    for (const [itemId, eventList] of Object.entries(events)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [name, level, p]: [ItemName, number, TitleName] = itemId.split("_") as [ItemName, number, TitleName]
        for (const event of eventList) {
            const titleName = getTitleName(event.item, AL.Game.G) ? `${getTitleName(event.item, AL.Game.G)} ` : ""
            const itemLevel = event.item.level ? `+${event.item.level} ` : ""
            const gItemName = AL.Game.G.items[event.item.name].name
            const itemName = `${itemLevel}${titleName}${gItemName}`

            let eventMessage = `🔹 **${itemName}** (${event.item.name})\n`
            const style = eventTypeStyles[event.type]

            eventMessage += `\n${style.emoji} **${style.title}**: ${style.message}\n`
            if (event.merchant) {
                eventMessage += `${event.merchant.name} 🌍 ${event.merchant.server}, ${event.merchant.map} (${event.merchant.x}, ${event.merchant.y})\n`
            }

            eventMessage += `💰 *Price*: ${abbreviateNumber(event.item.price)}`

            if (event.previous) {
                const trend = `${getPriceTrend(event.item.price, event.previous.item.price)}`
                eventMessage += `${trend}\n`
            }

            // Check if adding this event would exceed the character limit
            if (currentMessage.length + eventMessage.length > maxMessageLength) {
                // Send the current message and start a new one
                await tradeChannel.send(currentMessage)
                currentMessage = ""
            }

            // Add the event message to the current message
            currentMessage += eventMessage
        }
    }

    // Send any remaining message content
    if (currentMessage.length > 0) {
        await tradeChannel.send(currentMessage)
    }
}

function getPriceTrend(currentPrice: number, previousPrice: number): string {
    const difference = currentPrice - previousPrice
    const percentageChange = Math.abs((difference / previousPrice) * 100).toFixed(2)

    if (difference > 0) {
        // return `📈 +${difference}` // Diff Increase
        return `📈 +${percentageChange}%` // % Increase
    } else if (difference < 0) {
        // return `📉 -${Math.abs(difference)}` // Diff Decrease
        return `📉 -${percentageChange}%` // % Decrease
    } else {
        return "— No change" // No change
    }
}
