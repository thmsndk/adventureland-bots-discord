import AL, { BankPackName, Character, Entity, ItemData, ItemName, Merchant, MonsterName } from "alclient"
import { ITEMS_TO_CRAFT, ITEMS_TO_EXCHANGE, ITEMS_TO_HOLD, ITEMS_TO_LIST, ITEMS_TO_SELL, LOOP_MS, sleep } from "./general.js"
import { bankingPosition, mainFishingSpot, miningSpot } from "./locations.js"

export const MERCHANT_GOLD_TO_HOLD = 100_000_000
export const MERCHANT_ITEMS_TO_HOLD: Set<ItemName> = new Set([
    ...ITEMS_TO_HOLD,
    // Merchant Stand
    "stand0",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll",
    // Prims
    "offering", "offeringp",
    // Fishing Rod and Pickaxe
    "pickaxe", "rod",
    // Main Items
    "dartgun", "wbook1"
])

export async function attackTheseTypesMerchant(bot: Merchant, types: MonsterName[], friends: Character[] = []): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack
    if (bot.c.town) return // Don't attack if teleporting

    const targets: Entity[] = []
    for (const entity of bot.getEntities({
        canDamage: true,
        couldGiveCredit: true,
        typeList: types,
        willDieToProjectiles: false,
        withinRange: bot.range
    })) {
        targets.push(entity)
    }
    if (targets.length == 0) return // No targets

    const entity = targets[0]

    // Remove them from our friends' entities list if we're going to kill it
    if (bot.canKillInOneShot(entity)) {
        for (const friend of friends) {
            if (!friend) continue // No friend
            if (friend.id == bot.id) continue // Don't delete it from our own list
            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
            friend.deleteEntity(entity.id)
        }
    }

    await bot.basicAttack(entity.id)
}

/**
 * WORK IN PROGRESS. NOT FINISHED. DO NOT USE.
 * Finds things that we can upgrade when our inventory and bank are both full, and attempts to upgrade them.
 * @param bot
 * @returns
 */
export async function doEmergencyBanking(bot: Merchant, itemsToHold = MERCHANT_ITEMS_TO_HOLD, itemsToSell = ITEMS_TO_SELL): Promise<void> {
    if (bot.map !== "bank" && bot.map !== "bank_b" && bot.map !== "bank_u") return // Not in the bank
    if (bot.esize > 1) return // We have more than one free slot, we're not in trouble

    // Check if our bank is full. If it's not, don't perform emergency banking
    for (const bankPackName in bot.bank) {
        if (bankPackName == "gold") continue
        for (const bankSlot of bot.bank[bankPackName as BankPackName]) {
            if (!bankSlot) return // We found an empty spot, don't clean the bank
        }
    }

    const availableInventorySlots: number[] = []
    for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i]

        if (!item) {
            // No item in this slot
            availableInventorySlots.push(i)
            continue
        }
        if (item.l) continue // Item is locked
        if (item.p) continue // Item is special
        if (itemsToHold.has(item.name)) continue // We want to hold this item
        if ((item.level ?? 0) <= itemsToSell[item.name]) {
            // We can go sell this item
            await bot.smartMove("main")
            await sleep(5000) // Leaving the bank doesn't free up our character right away
            if (bot.items[i]) await bot.sell(i, item.q ?? 1)
            return // We sold something to free up space, go do whatever now.
        }

        availableInventorySlots.push(i)
    }

    // Look for things we can combine in to one stack.
    const stackList = {}

    // Create the list of duplicate items
    for (const bankSlot in bot.bank) {
        const matches = /items(\d+)/.exec(bankSlot)
        // Only get stuff from the packs in the current level
        if (bot.map == "bank") {
            if (!matches || Number.parseInt(matches[1]) > 7) continue
        } else if (bot.map == "bank_b") {
            if (!matches || Number.parseInt(matches[1]) < 8 || Number.parseInt(matches[1]) > 23) continue
        } else if (bot.map == "bank_u") {
            if (!matches || Number.parseInt(matches[1]) < 24) continue
        }

        for (let i = 0; i < bot.bank[bankSlot].length; i++) {
            const item = bot.bank[bankSlot as BankPackName][i]
            if (!item) continue // Empty slot
            if (!item.q) continue // Not stackable
            if (item.q >= bot.G.items[item.name].s) continue // Maximum stack quantity already reached
            if (!stackList[item.name]) stackList[item.name] = []
            stackList[item.name].push([bankSlot, i, item.q])
        }
    }

    // Remove items with only one stack
    for (const itemName in stackList) {
        const items = stackList[itemName]
        if (items.length == 1) delete stackList[itemName]
    }

    // Find things we can stack
    let stacked = false
    for (const itemName in stackList) {
        const stacks = stackList[itemName]
        const stackLimit = bot.G.items[itemName].s
        for (let j = 0; j < stacks.length - 1 && availableInventorySlots.length; j++) {
            const stack1 = stacks[j]
            const stack2 = stacks[j + 1]
            if (stack1[2] + stack2[2] > stackLimit) continue // Can't stack, too much

            // TODO: If we have a stand or computer with an empty space, use it to help create full stacks

            // We can stack something!
            const inventoryPos = availableInventorySlots.pop()
            if (inventoryPos !== undefined) {
                await bot.withdrawItem(stack1[0], stack1[1], inventoryPos)
                await bot.withdrawItem(stack2[0], stack2[1], inventoryPos)
                await bot.depositItem(inventoryPos, stack2[0], stack2[1])
                stack2[2] += stack1[2]
                stacked = true
            }
        }
    }
    if (stacked) return // We found something to stack

    // Find things we can sell
    const sellThese: number[] = []
    for (const bankSlot in bot.bank) {
        const matches = /items(\d+)/.exec(bankSlot)
        // Only get stuff from the packs in the current level
        if (bot.map == "bank") {
            if (!matches || Number.parseInt(matches[1]) > 7) continue
        } else if (bot.map == "bank_b") {
            if (!matches || Number.parseInt(matches[1]) < 8 || Number.parseInt(matches[1]) > 23) continue
        } else if (bot.map == "bank_u") {
            if (!matches || Number.parseInt(matches[1]) < 24) continue
        }

        for (let i = 0; i < bot.bank[bankSlot].length && availableInventorySlots.length; i++) {
            const item = bot.bank[bankSlot as BankPackName][i]
            if (!item) continue // Empty slot
            if (item.l) continue // Item is locked
            if (item.p) continue // Item is special
            if (!itemsToSell[item.name] || itemsToSell[item.name] <= (item.level ?? 0)) continue // We don't want to sell it
            const inventoryPos = availableInventorySlots.pop()
            await bot.withdrawItem(bankSlot as BankPackName, i, inventoryPos)
            sellThese.push(inventoryPos)
        }
    }
    if (sellThese.length) {
        // Go sell the items
        await bot.smartMove("main")
        await sleep(5000) // Leaving the bank doesn't free up our character right away
        for (const i of sellThese) {
            const item = bot.items[i]
            if (!item) continue // Already sold
            try {
                await bot.sell(i, item.q ?? 1)
            } catch (e) {
                console.error(e)
            }
        }
        return
    }

    // TODO: If we have a compound scroll in our inventory, find items to compound

    // TODO: If we have an upgrade scroll in our inventory, find items to upgrade
}

export async function doBanking(bot: Merchant, goldToHold = MERCHANT_GOLD_TO_HOLD, itemsToHold = MERCHANT_ITEMS_TO_HOLD, itemsToSell = ITEMS_TO_SELL, itemsToCraft = ITEMS_TO_CRAFT, itemsToExchange = ITEMS_TO_EXCHANGE, itemsToList = ITEMS_TO_LIST): Promise<void> {
    await bot.closeMerchantStand()
    await bot.smartMove(bankingPosition)
    await bot.openMerchantStand()

    // Deposit extra gold, or get more gold
    const excessGold = bot.gold - goldToHold
    if (excessGold > 0) {
        await bot.depositGold(excessGold)
    } else if (excessGold < 0 && bot.bank.gold > 0) {
        await bot.withdrawGold(Math.min(bot.bank.gold, -excessGold))
    }

    // Un-PVP Items
    for (let i = 0; i < bot.items.length; i++) {
        const item = bot.items[i]
        if (!item) continue

        if (item.v) {
            // Swap to remove PvP, then swap again
            await bot.depositItem(i, "items0", 0)
            await bot.depositItem(i, "items0", 0)
        }
    }

    // Deposit items
    for (let i = 0; i < bot.items.length; i++) {
        const item = bot.items[i]
        if (!item) continue
        if (itemsToHold.has(item.name)) continue // We want to hold it
        if (item.l == "l") continue // We want to hold it
        if (((item.level ?? 0) <= itemsToSell[item.name]) && !item.p) continue // We want to sell it
        try {
            // Deposit it in the bank
            await bot.depositItem(i)
        } catch (e) {
            console.error(e)
        }
    }

    // Store information about everything in our bank to use it later to find upgradable stuff
    const bankItems: ItemData[] = []
    for (let i = 0; i <= 7; i++) {
        const bankPack = `items${i}` as Exclude<BankPackName, "gold">
        if (!bot?.bank[bankPack]) continue // This bank slot isn't available
        for (const item of bot.bank[bankPack]) {
            bankItems.push(item)
        }
    }
    let freeSpaces = bot.esize

    // Withdraw things we want to hold
    for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
        const item = bankItems[i]
        if (!item) continue // No item

        if (!itemsToHold.has(item.name)) continue // We don't want to hold this item
        if (bot.hasItem(item.name)) {
            const gInfo = bot.G.items[item.name]
            if (!gInfo.s) continue // Not stackable
            if (bot.countItem(item.name) + item.q > gInfo.s) continue // We can't stack them in one spot

            const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
            const slot = i % 42
            bot.withdrawItem(pack, slot)
            continue
        }

        const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
        const slot = i % 42
        bot.withdrawItem(pack, slot)
        freeSpaces--
    }

    // Withdraw compoundable & upgradable things
    const itemsByLevel = bot.locateItemsByLevel(bankItems)
    for (const dName in itemsByLevel) {
        const itemName = dName as ItemName
        const gInfo = bot.G.items[itemName]
        if (gInfo.grades == undefined) continue
        const level0Grade = gInfo.grades.lastIndexOf(0) + 1

        if (gInfo.upgrade && freeSpaces > 3) {
            // Item is upgradable, withdraw lower level items to upgrade
            let firstItemSlot: number
            let firstItemWithdrawn = false
            for (let dLevel = 12; dLevel >= 0 && freeSpaces > 3; dLevel--) {
                const items = itemsByLevel[itemName][dLevel]
                if (items == undefined) continue // No items of this type at this level
                if (dLevel >= 9 - level0Grade) {
                    // Don't withdraw items higher than this for the purpose of upgrading them
                    if (!firstItemSlot) firstItemSlot = items[0]
                } else {
                    for (let i = 0; i < items.length && freeSpaces > 2; i++) {
                        const slot = items[i]
                        if (firstItemSlot == undefined) {
                            firstItemSlot = slot
                            continue
                        }
                        if (!firstItemWithdrawn) {
                            // Withdraw the first item, because our other upgrade logic will only upgrade if we have two items of the same type in our inventory
                            const realPack = `items${Math.floor((firstItemSlot) / 42)}` as Exclude<BankPackName, "gold">
                            const realSlot = firstItemSlot % 42
                            await bot.withdrawItem(realPack, realSlot)
                            freeSpaces--
                            firstItemWithdrawn = true
                        }
                        // Withdraw the item to upgrade
                        const realPack = `items${Math.floor((slot) / 42)}` as Exclude<BankPackName, "gold">
                        const realSlot = slot % 42
                        await bot.withdrawItem(realPack, realSlot)
                        freeSpaces--
                    }
                }
            }
        } else if (gInfo.compound && freeSpaces > 5) {
            // Item is compoundable, withdraw lower level items to compound
            let firstItemSlot: number
            let firstItemWithdrawn = false
            for (let dLevel = 7; dLevel >= 0 && freeSpaces > 5; dLevel--) {
                const items = itemsByLevel[itemName][dLevel]
                if (items == undefined) continue // No items of this type at this level
                if (dLevel >= 4 - level0Grade) {
                    // Don't withdraw items higher than this for the purpose of compounding them
                    if (!firstItemSlot) firstItemSlot = items[0]
                } else {
                    if (firstItemSlot !== undefined && items.length < 3) continue // Not enough to compound
                    else if (firstItemSlot == undefined && items.length < 4) {
                        firstItemSlot = items[0]
                        continue // Not enough to compound
                    }
                    for (let i = 0; i < items.length - 2 && freeSpaces > 5; i++) {
                        const slot1 = items[i]
                        if (firstItemSlot == undefined) {
                            firstItemSlot = slot1
                            continue
                        }
                        if (!firstItemWithdrawn) {
                            // Withdraw the first item, because our other upgrade logic will only upgrade if we have two items of the same type in our inventory
                            const realPack = `items${Math.floor((firstItemSlot) / 42)}` as Exclude<BankPackName, "gold">
                            const realSlot = firstItemSlot % 42
                            await bot.withdrawItem(realPack, realSlot)
                            freeSpaces--
                            firstItemWithdrawn = true
                        }
                        // Withdraw the item to upgrade
                        const realPack1 = `items${Math.floor((slot1) / 42)}` as Exclude<BankPackName, "gold">
                        const realSlot1 = slot1 % 42
                        await bot.withdrawItem(realPack1, realSlot1)
                        freeSpaces--
                        const slot2 = items[i + 1]
                        const realPack2 = `items${Math.floor((slot2) / 42)}` as Exclude<BankPackName, "gold">
                        const realSlot2 = slot2 % 42
                        await bot.withdrawItem(realPack2, realSlot2)
                        freeSpaces--
                        const slot3 = items[i + 2]
                        const realPack3 = `items${Math.floor((slot3) / 42)}` as Exclude<BankPackName, "gold">
                        const realSlot3 = slot3 % 42
                        await bot.withdrawItem(realPack3, realSlot3)
                        freeSpaces--
                        i += 2
                    }
                }
            }
        } else {
            // Item is not upgradable or compoundable
            continue
        }
    }

    // Withdraw items to craft with
    for (const item of itemsToCraft) {
        const gCraft = bot.G.craft[item]
        if (!gCraft) continue
        if (freeSpaces <= gCraft.items.length) continue // Not enough space to craft
        const withdrawThese: [BankPackName, number][] = []
        let craftable = true
        for (const [requiredQuantity, requiredItem, requiredItemLevel] of gCraft.items) {
            // If the item is compoundable or upgradable, the level needs to be 0
            let fixedItemLevel = requiredItemLevel
            if (requiredItemLevel === undefined) {
                const gInfo = bot.G.items[requiredItem]
                if (gInfo.upgrade || gInfo.compound) fixedItemLevel = 0
            }

            if (bot.hasItem(requiredItem, bot.items, { level: fixedItemLevel, quantityGreaterThan: requiredQuantity - 1 })) continue // We already have it in our inventory
            const slot = bot.locateItem(requiredItem, bankItems, { level: fixedItemLevel, quantityGreaterThan: requiredQuantity - 1 })
            if (slot == undefined) {
                // We don't have one of the items required to craft
                craftable = false
                break
            }
            const realPack = `items${Math.floor((slot) / 42)}` as Exclude<BankPackName, "gold">
            const realSlot = slot % 42
            withdrawThese.push([realPack, realSlot])
        }
        if (craftable) {
            for (const withdraw of withdrawThese) {
                await bot.withdrawItem(withdraw[0], withdraw[1])
                freeSpaces--
            }
        }
    }

    // Withdraw exchangeable items
    for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
        const item = bankItems[i]
        if (!item) continue // No item

        if (!itemsToExchange.has(item.name)) continue // Not exchangeable

        const gInfo = bot.G.items[item.name]
        if (item.q < gInfo.e) continue // Not enough to exchange

        // Withdraw the item
        const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
        const slot = i % 42
        await bot.withdrawItem(pack, slot)
        freeSpaces--
    }

    // Withdraw level 2 golden earrings
    for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
        const item = bankItems[i]
        if (!item) continue // No item

        if (item.name !== "lostearring") continue
        if (item.level !== 2) continue

        // Withdraw the item
        const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
        const slot = i % 42
        await bot.withdrawItem(pack, slot)
        freeSpaces--
    }

    // Withdraw items to sell
    for (let i = 0; i < bankItems.length && freeSpaces > 1; i++) {
        const item = bankItems[i]
        if (!item) continue // No item
        if (item.l) continue // Item is locked
        if (item.p) continue // Item is special
        if (!((item.level ?? 0) <= itemsToSell[item.name])) continue // The item level is too high to sell

        // Withdraw the item
        const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
        const slot = i % 42
        await bot.withdrawItem(pack, slot)
        freeSpaces--
    }

    // Withdraw items to list
    for (let i = 0; i < bankItems.length && freeSpaces > 1; i++) {
        const item = bankItems[i]
        if (!item) continue // No item
        if (item.l) continue // Item is locked
        if (item.p) continue // Item is special
        if (!itemsToList[item.name]) continue // We don't want to list the item
        if (item.level !== undefined && !itemsToList[item.name][item.level]) continue // We don't want to list the item at its given level

        // Withdraw the item
        const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackName, "gold">
        const slot = i % 42
        await bot.withdrawItem(pack, slot)
        freeSpaces--
    }
}

export async function goFishing(bot: Merchant): Promise<void> {
    if (!bot.canUse("fishing", { ignoreEquipped: true })) return
    if (!bot.hasItem("rod") && !bot.isEquipped("rod")) return // We don't have a rod

    bot.closeMerchantStand()
    await bot.smartMove(mainFishingSpot) // Move to fishing spot

    // Equip fishing rod if we don't have it already equipped
    const mainhand = bot.slots.mainhand?.name
    let mainhandSlot: number
    const offhand = bot.slots.offhand?.name
    let offhandSlot: number
    if (!bot.isEquipped("rod")) {
        const promises: Promise<unknown>[] = []
        if (offhand) promises.push(bot.unequip("offhand").then((i) => { offhandSlot = i }))
        mainhandSlot = bot.locateItem("rod", bot.items)
        promises.push(bot.equip(mainhandSlot))
        await Promise.all(promises)
    }

    await bot.fish()

    // Re-equip if we changed weapons
    const promises: Promise<unknown>[] = []
    if (bot.slots.mainhand?.name !== mainhand) {
        if (mainhandSlot !== undefined) promises.push(bot.equip(mainhandSlot, "mainhand"))
    }
    if (bot.slots.offhand?.name !== offhand) {
        if (offhandSlot !== undefined) promises.push(bot.equip(offhandSlot, "offhand"))
    }
    await Promise.all(promises)
}

export async function goMining(bot: Merchant): Promise<void> {
    if (!bot.canUse("mining", { ignoreEquipped: true })) return
    if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) return // We don't have a pickaxe

    bot.closeMerchantStand()
    await bot.smartMove(miningSpot) // Move to mining spot

    // Equip pickaxe if we don't have it already equipped
    const mainhand = bot.slots.mainhand?.name
    let mainhandSlot: number
    const offhand = bot.slots.offhand?.name
    let offhandSlot: number
    if (!bot.isEquipped("pickaxe")) {
        const promises: Promise<unknown>[] = []
        if (offhand) promises.push(bot.unequip("offhand").then((i) => { offhandSlot = i }))
        mainhandSlot = bot.locateItem("pickaxe", bot.items)
        promises.push(bot.equip(mainhandSlot))
        await Promise.all(promises)
    }

    await bot.mine()

    // Re-equip if we changed weapons
    const promises: Promise<unknown>[] = []
    if (bot.slots.mainhand?.name !== mainhand) {
        if (mainhandSlot !== undefined) promises.push(bot.equip(mainhandSlot, "mainhand"))
    }
    if (bot.slots.offhand?.name !== offhand) {
        if (offhandSlot !== undefined) promises.push(bot.equip(offhandSlot, "offhand"))
    }
    await Promise.all(promises)
}

export function startMluckLoop(bot: Merchant): void {
    async function mluckLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("mluck")) {
                if (!bot.s.mluck || bot.s.mluck.f !== bot.id) await bot.mluck(bot.id) // mluck ourselves

                for (const [, player] of bot.players) {
                    if (AL.Tools.distance(bot, player) > bot.G.skills.mluck.range) continue // Too far away to mluck
                    if (player.npc) continue // It's an NPC, we can't mluck NPCs.

                    if (!player.s.mluck) {
                        await bot.mluck(player.id) // Give the mluck
                    } else if (!player.s.mluck.strong && player.s.mluck.f !== bot.id) {
                        if (!bot.id.startsWith("earthMer") && player.s.mluck.f.startsWith("earthMer")) continue // Don't compete with earthiverse
                        await bot.mluck(player.id) // Steal the mluck
                    } else if ((!player.s.mluck.strong && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))
                        || (player.s.mluck.strong && player.s.mluck.f == bot.id && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))) {
                        await bot.mluck(player.id) // Extend the mluck
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("mluckLoop", setTimeout(async () => { mluckLoop() }, LOOP_MS))
    }
    mluckLoop()
}