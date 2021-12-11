/* eslint-disable no-undef */
load_code("base") // Performs the healing, looting, and movement for us

// Script variables
const SCRIPT_NAME = "default"
const MERCHANT = "attackMer"
const CHARACTERS = ["attackMag", "attackMag2", "attackMag3"]
const MONSTER = "bee"

if (!character.controller) {
    // We are the main character, let's start our other characters
    for (const friend of CHARACTERS) {
        if (friend == character.id) continue // It's us, continue
        start_character(friend, SCRIPT_NAME)
    }

    // Start tracking statistics in a minute (to give time to let the others start)
    setTimeout(() => { startStatisticsLoop(SCRIPT_NAME, CHARACTERS) }, 60000)
}

async function attackLoop() {
    try {
        const nearest = get_nearest_monster({ type: MONSTER })
        if (!nearest) {
            set_message("No Monsters")
        } else if (can_attack(nearest)) {
            set_message("Attacking")
            await attack(nearest)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
}

if (character.ctype == "merchant") {
    //
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}