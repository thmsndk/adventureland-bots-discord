import AL from "alclient"

/** Config */
const merchantName = "earthMer"
const priestName = "earthPri"
const mageName = "earthMag"
const rangerName = "earthiverse"
const region: AL.ServerRegion = "ASIA"
const identifier: AL.ServerIdentifier = "I"

let merchant: AL.Merchant
let priest: AL.Priest
let mage: AL.Mage
let ranger: AL.Ranger

async function startRanger(ranger: AL.Ranger) {
    async function attackLoop() {
        try {
            const nearby = ranger.getNearestMonster("bscorpion")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, ranger.getCooldown("attack"))
    }
    attackLoop()

    const bscorpionSpawn = ranger.locateMonster("bscorpion")[0]
    async function moveLoop() {
        try {
            if (AL.Pathfinder.canWalk(ranger, bscorpionSpawn)) {
                const forces: { strength: number, angle: number }[] = []

                // Force #1: Towards the center of the bscorpion spawn
                const spawnStrength = (AL.Tools.distance(ranger, bscorpionSpawn) - (ranger.range / 2))
                const spawnAngle = Math.atan2(bscorpionSpawn.y - ranger.y, bscorpionSpawn.x - ranger.x)
                forces.push({ strength: spawnStrength, angle: spawnAngle })

                // Force #2: Perpendicular to the center of the bscorpion spawn (so we move in a circle)
                const circleStrength = ranger.speed / 4
                const circleAngle = spawnAngle + Math.PI / 2
                forces.push({ strength: circleStrength, angle: circleAngle })

                // Force #3: Away from the bscorpion
                const nearest = ranger.getNearestMonster("bscorpion")
                if (nearest) {
                    const bscorpion = nearest.monster
                    if (bscorpion && bscorpion.isAttackingUs(ranger)) {
                        const bscorpionStrength = nearest.distance - bscorpion.range
                        const bscorpionAngle = Math.atan2(bscorpion.y - ranger.y, bscorpion.x - ranger.x)
                    }
                }

                // Add up all the forces and move
                let newX = ranger.x
                let newY = ranger.y
                for (const force of forces) {
                    newX += Math.cos(force.angle) * force.strength
                    newY += Math.sin(force.angle) * force.strength
                }

                // We want to continuously move, so we don't mind the empty function
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                ranger.move(newX, newY).catch(() => { })
                console.log(forces)
            } else {
                // Move to the bscorpion spawn
                await ranger.smartMove(bscorpionSpawn, { getWithin: ranger.range / 2 })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startPriest(priest: AL.Priest) {
    async function moveLoop() {
        try {
            await priest.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startMage(mage: AL.Mage) {
    async function moveLoop() {
        try {
            await mage.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startMerchant(merchant: AL.Merchant) {
    async function moveLoop() {
        try {
            await merchant.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const priestP = AL.Game.startPriest(priestName, region, identifier)
    const mageP = AL.Game.startMage(mageName, region, identifier)
    const rangerP = AL.Game.startRanger(rangerName, region, identifier)
    merchant = await merchantP
    priest = await priestP
    mage = await mageP
    ranger = await rangerP

    // Set up functionality to reconnect if we disconnect
    // TODO: Add a delay
    const reconnect = async (character: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${character.id}...`)
        await character.disconnect()
        await character.connect()
        character.socket.on("disconnect", async () => { await reconnect(character) })
    }
    merchant.socket.on("disconnect", async () => { await reconnect(merchant) })
    priest.socket.on("disconnect", async () => { await reconnect(priest) })
    mage.socket.on("disconnect", async () => { await reconnect(mage) })
    ranger.socket.on("disconnect", async () => { await reconnect(ranger) })

    // Start the characters
    startMerchant(merchant)
    startPriest(priest)
    startMage(mage)
    startRanger(ranger)
}
run()