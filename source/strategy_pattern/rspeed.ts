import AL, { ItemName, LimitDCReportData, PingCompensatedCharacter, Rogue } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "./context.js"
import { BaseAttackStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { BuyStrategy } from "./strategies/buy.js"
import { BasicMoveStrategy } from "./strategies/move.js"
import { RespawnStrategy } from "./strategies/respawn.js"
import { GiveRogueSpeedStrategy } from "./strategies/rspeed.js"
import { SellStrategy } from "./strategies/sell.js"
import { TrackerStrategy } from "./strategies/tracker.js"

async function getPlayerWithoutRSpeed(bot: PingCompensatedCharacter) {
    try {
        const noSpeedChars = await AL.PlayerModel.find({
            lastSeen: { $gt: Date.now() - 60_000 },
            "s.rspeed": undefined,
            serverIdentifier: bot.server.name, serverRegion: bot.server.region,
        }).lean().exec()
        return noSpeedChars[0]
    } catch (e) {
        console.error(e)
    }
}

export class GoGiveRogueSpeedStrategy<Type extends Rogue> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.goGiveRogueSpeed(bot)
            },
            interval: 5000
        })
    }

    private async goGiveRogueSpeed(bot: Type) {
        if (!bot.canUse("rspeed")) return

        const player = await getPlayerWithoutRSpeed(bot)
        if (!player) return
        console.log(`Moving to rspeed '${player.name}'.`)
        await bot.smartMove(player, { avoidTownWarps: true }).catch(/** Suppress errors */)
        await bot.requestEntitiesData()
    }
}

export class GoSellThingsStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await bot.smartMove("hpot1", { avoidTownWarps: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
            },
            interval: 5000
        })
    }
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()

    const rogue1 = await AL.Game.startRogue("attackRog", "US", "I")
    const context1 = new Strategist<Rogue>(rogue1, baseStrategy)
    startRspeedRogue(context1)

    const rogue2 = await AL.Game.startRogue("attackRog2", "US", "II")
    const context2 = new Strategist<Rogue>(rogue2, baseStrategy)
    startRspeedRogue(context2)

    const rogue3 = await AL.Game.startRogue("attackRog3", "US", "III")
    const context3 = new Strategist<Rogue>(rogue3, baseStrategy)
    startRspeedRogue(context3)
}
run()

const moveStrategy = new BasicMoveStrategy(["bee"])
const goGiveRogueSpeedStrategy = new GoGiveRogueSpeedStrategy()
const goSellThingsStrategy = new GoSellThingsStrategy()
const attackStrategy = new BaseAttackStrategy({ characters: [], typeList: ["bee"] })
const trackerStrategy = new TrackerStrategy()
const rspeedStrategy = new GiveRogueSpeedStrategy()
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500]
    ])
})
const respawnStrategy = new RespawnStrategy()

async function startRspeedRogue(context: Strategist<Rogue>) {
    context.bot.socket.on("limitdcreport", async (data: LimitDCReportData) => {
        console.log("~~ disconnected for doing too many things ~~")
        console.log(data)
    })

    const sellStrategy = new SellStrategy({
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
    })

    context.applyStrategy(moveStrategy)
    context.applyStrategy(attackStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(rspeedStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(respawnStrategy)

    setInterval(async () => {
        // Move to sell items
        if (context.bot.isFull()) {
            context.applyStrategy(goSellThingsStrategy)
            return
        } else {
            context.removeStrategy(goSellThingsStrategy)
        }

        // Move to give rspeed to someone
        if (context.bot.canUse("rspeed")) {
            const shouldGo = await getPlayerWithoutRSpeed(context.bot)
            if (shouldGo) {
                context.applyStrategy(goGiveRogueSpeedStrategy)
                return
            } else {
                context.removeStrategy(goGiveRogueSpeedStrategy)
            }
        }

        // Move to attack bees
        context.applyStrategy(moveStrategy)
    }, 5000)
}