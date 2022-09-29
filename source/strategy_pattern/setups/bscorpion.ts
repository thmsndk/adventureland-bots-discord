import AL, { PingCompensatedCharacter } from "alclient"
import { offsetPosition } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

export function constructPlantoidSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("plantoid")[0]

    return {
        configs: [
            {
                id: "bscorpion_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            targetingPartyMember: true,
                            type: "plantoid"
                        }),
                        move: new ImprovedMoveStrategy("bscorpion", { idlePosition: offsetPosition(spawn, 5, 0) })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_LUCK,
                            type: "plantoid",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 100, sides: 16 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } }
                            },
                            targetingPartyMember: true,
                            type: "plantoid"
                        }),
                        move: new ImprovedMoveStrategy("bscorpion", { idlePosition: offsetPosition(spawn, -5, 0) })
                    }
                ]
            },
        ]
    }
}