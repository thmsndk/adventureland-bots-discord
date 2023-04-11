import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH } from "./equipment.js"

const monsters: MonsterName[] = ["armadillo", "phoenix"]

export function constructArmadilloSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("armadillo")

    return {
        configs: [
            {
                id: "armadillo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructArmadilloHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("armadillo")

    return {
        configs: [
            {
                id: "armadillo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}