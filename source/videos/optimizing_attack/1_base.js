/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

function ms_to_next_skill(skill) {
    const next_skill = parent.next_skill[skill]
    if (next_skill == undefined) return 0
    const ms = parent.next_skill[skill].getTime() - Date.now()
    return ms < 0 ? 0 : ms
}

/** We are going to track our own pings, because there's some problems with the built-in parent.pings
 *  when you send a lot of attacks at the same time. */
const MAX_PINGS = 10
var pings2 = [character.ping]
parent.socket.on("pong", (ms) => {
    pings2.unshift(ms) // Add new ping
    pings2.splice(MAX_PINGS) // Delete older pings
})

async function moveLoop() {
    try {
        let nearest = get_nearest_monster()
        if (!is_in_range(nearest)) {
            // Move closer
            move(
                character.x + (nearest.x - character.x) / 2,
                character.y + (nearest.y - character.y) / 2
            )
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { moveLoop() }, 250)
}
moveLoop()

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { lootLoop() }, 250)
}
lootLoop()

async function regenLoop() {
    try {
        const hp_ratio = character.hp / character.max_hp
        const mp_ratio = character.mp / character.max_mp

        // NOTE: If you want to use potions, modify this function,
        // because potions share a cooldown with regen_hp and regen_mp

        if (mp_ratio < hp_ratio && can_use("regen_mp")) {
            // We have less MP than HP, so let's regen some MP.
            await use_skill("regen_mp")
            reduce_cooldown("regen_mp", Math.min(...pings2))
        } else if (can_use("regen_hp")) {
            // We have less HP than MP, so let's regen some HP.
            await use_skill("regen_hp")
            reduce_cooldown("regen_hp", Math.min(...pings2))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { regenLoop() }, Math.max(100, ms_to_next_skill("use_hp")))
}
regenLoop()