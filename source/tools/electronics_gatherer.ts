import AL, { Rogue, ServerIdentifier, ServerRegion } from "alclient"
import fs from "fs"
import { getMsToNextMinute } from "../base/general.js"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { HoldPositionMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"

// Login, prepare, and get game data
await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await Promise.all([AL.Pathfinder.prepare(AL.Game.G, { cheat: true }), AL.Game.updateServersAndCharacters()])

const BUFFER = 15_000

const credentials = JSON.parse(fs.readFileSync("../../credentials.json", "utf-8"))

const baseStrategy = new BaseStrategy()
const respawnStrategy = new RespawnStrategy()
const holdStrategy = new HoldPositionMoveStrategy({ map: "cyberland", x: 0, y: 0 })

export class ElectronicsStrategy implements Strategy<Rogue> {
    public loops = new Map<LoopName, Loop<Rogue>>()

    public constructor() {
        this.loops.set("item", {
            fn: async (bot: Rogue) => {
                bot.socket.emit("eval", { command: "give spares" })
            },
            interval: 1000,
        })
    }
}
const electronicsStrategy = new ElectronicsStrategy()

let targetRegion: ServerRegion = "ASIA"
let targetIdentifier: ServerIdentifier = "I"

const nextServer = () => {
    if (targetRegion == "US") {
        if (targetIdentifier == "I") targetIdentifier = "II"
        else if (targetIdentifier == "II") targetIdentifier = "III"
        else if (targetIdentifier == "III") targetIdentifier = "PVP"
        else {
            targetRegion = "EU"
            targetIdentifier = "I"
        }
    } else if (targetRegion == "EU") {
        if (targetIdentifier == "I") targetIdentifier = "II"
        else if (targetIdentifier == "II") targetIdentifier = "PVP"
        else {
            targetRegion = "ASIA"
            targetIdentifier = "I"
        }
    } else {
        targetRegion = "US"
        targetIdentifier = "I"
    }
}

const serverLoop = async () => {
    try {
        nextServer()
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(serverLoop, getMsToNextMinute())
    }
}
serverLoop()

async function startGatherer(userId: string, userAuth: string, characterID: string) {
    let bot: Rogue
    try {
        bot = new AL.Rogue(userId, userAuth, characterID, AL.Game.G, AL.Game.servers[targetRegion][targetIdentifier])
        await bot.connect()
    } catch (e) {
        console.error(`${characterID} had an error (start) on ${targetRegion}${targetIdentifier}`)
        console.error(e)
        bot.disconnect()
        setTimeout(startGatherer, getMsToNextMinute() + BUFFER, userId, userAuth, characterID)
        return
    }

    const context: Strategist<Rogue> = new Strategist<Rogue>(bot, baseStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(holdStrategy)
    context.applyStrategy(electronicsStrategy)

    const connectLoop = async () => {
        try {
            console.log(`Connecting to ${targetRegion} ${targetIdentifier}...`)
            await context.changeServer(targetRegion, targetIdentifier)
        } catch (e) {
            console.error(`${characterID} had an error (connect) on ${targetRegion}${targetIdentifier}`)
            console.error(e)
            context?.bot?.disconnect()
        } finally {
            context?.bot?.socket?.removeAllListeners("disconnect")
            setTimeout(async () => {
                await connectLoop()
            }, getMsToNextMinute() + BUFFER)
        }
    }
    setTimeout(async () => {
        await connectLoop()
    }, getMsToNextMinute() + BUFFER)

    const disconnectLoop = async () => {
        try {
            console.log("Disconnecting...")

            context.bot.socket.removeAllListeners("disconnect")
            await context.bot.disconnect()
        } catch (e) {
            console.error(`${characterID} had an error (disconnect) on ${targetRegion}${targetIdentifier}`)
            console.error(e)
        } finally {
            setTimeout(async () => {
                await disconnectLoop()
            }, getMsToNextMinute() + (60_000 - BUFFER))
        }
    }
    setTimeout(async () => {
        await disconnectLoop()
    }, getMsToNextMinute() - BUFFER)
}

setTimeout(
    startGatherer,
    getMsToNextMinute() + BUFFER,
    credentials.userID,
    credentials.userAuth,
    AL.Game.characters.earthRog.id,
)
