import AL from "alclient"
import { identifier, region, startMerchant, startShared } from "./runners.js"

/** Config */
const follower1Name = "fgsfds"
const follower2Name = "fsjal"
const follower3Name = "funny"
const merchantName = "orlyowl"

/** Characters */
let follower1: AL.Warrior
let follower2: AL.Warrior
let follower3: AL.Warrior
let merchant: AL.Merchant

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startFollower1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower1) await follower1.disconnect()
                follower1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower1, merchantName)
                follower1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower1) await follower1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startFollower1Loop(follower1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower2) await follower2.disconnect()
                follower2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower2, merchantName)
                follower2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower2) await follower2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startFollower2Loop(follower2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower3) await follower3.disconnect()
                follower3 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower3, merchantName)
                follower3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower3) await follower3.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startFollower3Loop(follower3Name, region, identifier).catch(() => { /* ignore errors */ })

    const startMerchantLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) await merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startMerchant(merchant, [follower1, follower2, follower3], { map: "main", x: 50, y: 0 })
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) await merchant.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop(merchantName, region, identifier).catch(() => { /* ignore errors */ })
}
run()