import AL, { Character, Mage, Priest, Ranger } from "alclient"
import { goGetRspeedBuff, goToBankIfFull, goToNearestWalkableToMonster, goToPotionSellerIfLow, ITEMS_TO_HOLD, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { bankingPosition, halloweenSafeSnakes } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { attackTheseTypesPriest } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"

async function startShared(bot: Character, merchant: string, friends: Character[], leader, members) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot, friends)
    if (bot.ctype !== "merchant") {
        if (bot.id == leader) {
            startPartyLoop(bot, leader, members)
        } else {
            bot.timeouts.set("partyLoop", setTimeout(async () => { startPartyLoop(bot, leader, members) }, 2000))
        }
    }
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [merchant], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)
}

export async function startMage(bot: Mage, merchant: string, friends: Character[], partyLeader: string, partyMembers: string[]) {
    startShared(bot, merchant, friends, partyLeader, partyMembers)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesMage(bot, ["snake", "osnake"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            if (bot.gold > 5_000_000) {
                await bot.smartMove(bankingPosition) // Move to bank teller to give bank time to get ready

                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.l == "l") continue // Don't send locked items
                    if (ITEMS_TO_HOLD.has(item.name)) continue

                    try {
                        await bot.depositItem(i)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (bot.gold > 1_000_000) await bot.depositGold(bot.gold - 1_000_000)
            }

            // Get some buffs from rogues
            await goGetRspeedBuff(bot)

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await goToNearestWalkableToMonster(bot, ["snake", "osnake"], halloweenSafeSnakes, bot.range - 25)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

export async function startPriest(bot: Priest, merchant: string, friends: Character[], partyLeader: string, partyMembers: string[]) {
    startShared(bot, merchant, friends, partyLeader, partyMembers)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesPriest(bot, ["snake", "osnake"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            if (bot.gold > 5_000_000) {
                await bot.smartMove(bankingPosition) // Move to bank teller to give bank time to get ready

                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.l == "l") continue // Don't send locked items
                    if (ITEMS_TO_HOLD.has(item.name)) continue

                    try {
                        await bot.depositItem(i)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (bot.gold > 1_000_000) await bot.depositGold(bot.gold - 1_000_000)
            }

            // Get some buffs from rogues
            await goGetRspeedBuff(bot)

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await goToNearestWalkableToMonster(bot, ["snake", "osnake"], halloweenSafeSnakes, bot.range - 25)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

export async function startRanger(bot: Ranger, merchant: string, friends: Character[], partyLeader: string, partyMembers: string[]) {
    startShared(bot, merchant, friends, partyLeader, partyMembers)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesRanger(bot, ["snake", "osnake"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            if (bot.gold > 5_000_000) {
                await bot.smartMove(bankingPosition) // Move to bank teller to give bank time to get ready

                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.l == "l") continue // Don't send locked items
                    if (ITEMS_TO_HOLD.has(item.name)) continue

                    try {
                        await bot.depositItem(i)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (bot.gold > 1_000_000) await bot.depositGold(bot.gold - 1_000_000)
            }

            // Get some buffs from rogues
            await goGetRspeedBuff(bot)

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await goToNearestWalkableToMonster(bot, ["snake", "osnake"], halloweenSafeSnakes, bot.range - 25)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}