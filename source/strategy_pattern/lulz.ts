import AL, { CharacterType, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { ItemName } from "alclient"
import { Strategist } from "./context.js"
import { BaseAttackStrategy } from "./strategies/attack.js"
import { MageAttackStrategy } from "./strategies/attack_mage.js"
import { AvoidStackingStrategy } from "./strategies/avoid_stacking.js"
import { BaseStrategy } from "./strategies/base.js"
import { BuyStrategy } from "./strategies/buy.js"
import { ImprovedMoveStrategy } from "./strategies/move.js"
import { RequestPartyStrategy } from "./strategies/party.js"
import { SellStrategy } from "./strategies/sell.js"
import { TrackerStrategy } from "./strategies/tracker.js"

const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"

export const MAX_CHARACTERS = 8
const CHARACTERS: PingCompensatedCharacter[] = []
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

export async function startLulzCharacter(type: CharacterType, userID: string, userAuth: string, characterID: string, monsters: MonsterName[]) {
    if (CHARACTERS.length >= MAX_CHARACTERS) throw `Too many characters are already running (We only support ${MAX_CHARACTERS} characters simultaneously)`
    for (const character of CHARACTERS) {
        if (character.characterID == characterID) throw `There is a character with the ID '${characterID}' (${character.id}) already running. Stop the character first to change its settings.`
    }

    let bot: PingCompensatedCharacter
    switch (type) {
        case "mage": {
            bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "paladin": {
            bot = new AL.Paladin(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "priest": {
            bot = new AL.Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "ranger": {
            bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "rogue": {
            bot = new AL.Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "warrior": {
            bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
    }
    await bot.connect()
    CHARACTERS.push(bot)

    bot.socket.on("code_eval", (data) => {
        if (data == "stop" || data == "disconnect") {
            stopLulzCharacter(characterID)
        }
    })

    const baseStrategy = new BaseStrategy(CHARACTERS)
    const context = new Strategist(bot, baseStrategy)
    CONTEXTS.push(context)

    switch (type) {
        case "mage": {
            context.applyStrategy(new MageAttackStrategy({ characters: CHARACTERS, typeList: monsters }))
            break
        }
        default: {
            context.applyStrategy(new BaseAttackStrategy({ characters: CHARACTERS, typeList: monsters }))
            break
        }
    }

    const moveStrategy = new ImprovedMoveStrategy(monsters)
    context.applyStrategy(moveStrategy)
    context.applyStrategy(new TrackerStrategy())
    context.applyStrategy(new AvoidStackingStrategy())
    context.applyStrategy(new BuyStrategy({
        buyMap: undefined,
        replenishables: new Map<ItemName, number>([
            ["hpot1", 2500],
            ["mpot1", 2500]
        ])
    }))
    context.applyStrategy(new SellStrategy({
        sellMap: new Map<ItemName, [number, number][]>([
            ["beewings", undefined],
            ["cclaw", undefined],
            ["crabclaw", undefined],
            ["gslime", undefined],
            ["gstaff", undefined],
            ["hpamulet", undefined],
            ["hpbelt", undefined],
            ["ringsj", undefined],
            ["stinger", undefined],
            ["wcap", undefined],
            ["wshoes", undefined],
        ])
    }))
    context.applyStrategy(new RequestPartyStrategy("earthMer"))

    setInterval(async () => {
        // TODO: Move this to a move strategy
        try {
            if (bot.smartMoving) return
            if ((!bot.hasItem("hpot1") || !bot.hasItem("mpot1")) && bot.gold > (AL.Game.G.items.mpot1.g * 100) || bot.isFull()) {
            // Go get potions
                context.removeStrategy(moveStrategy)

                await bot.smartMove("mpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })

                let potsToBuy = Math.min(100 - bot.countItem("mpot1"), bot.gold / AL.Game.G.items.mpot1.g)
                if (potsToBuy > 0) await bot.buy("mpot1", potsToBuy)

                potsToBuy = Math.min(100 - bot.countItem("hpot1"), bot.gold / AL.Game.G.items.hpot1.g)
                if (potsToBuy > 0) await bot.buy("hpot1", potsToBuy)
            }
        } catch (e) {
            console.error(e)
        }
        context.applyStrategy(moveStrategy)
    }, 1000)
}

export async function stopLulzCharacter(characterID: string) {
    for (let i = 0; i < CONTEXTS.length; i++) {
        const context = CONTEXTS[i]
        if (context.bot.characterID !== characterID) continue

        // Stop the context, and remove it from our contexts list
        context.stop()
        CONTEXTS.splice(i, 1)[0]
        break
    }
    for (let i = 0; i < CHARACTERS.length; i++) {
        const character = CHARACTERS[i]
        if (character.characterID !== characterID) continue

        // Remove the character from our characters list
        CHARACTERS.splice(i, 1)[0]
        break
    }
}