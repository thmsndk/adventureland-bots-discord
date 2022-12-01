import AL, { IPosition, MonsterName, Pathfinder, Character, PingCompensatedCharacter, Entity, ServerInfoDataLive, MapName, GMap } from "alclient"
import { sleep } from "../../base/general.js"
import { offsetPositionParty } from "../../base/locations.js"
import { sortClosestDistancePathfinder, sortTypeThenClosest } from "../../base/sort.js"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export class BasicMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public types: MonsterName[]

    public constructor(type: MonsterName | MonsterName[]) {
        if (Array.isArray(type)) {
            this.types = type
        } else {
            this.types = [type]
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })
    }

    private async move(bot: Character) {
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            bot.smartMove(nearest, { getWithin: Math.max(0, bot.range - nearest.speed), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export class FinishMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.turnInMonsterHunt(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    protected async turnInMonsterHunt(bot: Type) {
        if (!bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(suppress_errors)
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50, avoidTownWarps: true })
        await bot.finishMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export class FollowFriendMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public friendContext: Strategist<PingCompensatedCharacter>

    /**
     * Follows another bot
     * @param friendContext The friend to follow
     */
    public constructor(friendContext: Strategist<PingCompensatedCharacter>) {
        this.friendContext = friendContext
        if (!friendContext) throw new Error("No friend specified")

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Character) {
        const friend = this.friendContext.bot
        if (!friend || !friend.ready) return // No friend!?

        return bot.smartMove(friend, { getWithin: 10 })
    }
}

export class GetHolidaySpiritStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getHolidaySpirit(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async getHolidaySpirit(bot: Type) {
        if (bot.s.holidayspirit) return // We already have holiday spirit
        await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(suppress_errors)
        await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50, avoidTownWarps: true })
        await bot.getHolidaySpirit()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export class GetMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getMonsterHunt(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async getMonsterHunt(bot: Type) {
        if (bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(suppress_errors)
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50, avoidTownWarps: true })
        await bot.getMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export type HoldPositionMoveStrategyOptions = {
    /** If set, we will offset the given location by this amount */
    offset?: {
        x?: number
        y?: number
    }
}

export class HoldPositionMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public location: IPosition

    public constructor(location: IPosition, options?: HoldPositionMoveStrategyOptions) {
        this.location = { ...location }

        if (options?.offset) {
            if (options.offset.x) this.location.x += options.offset.x
            if (options.offset.y) this.location.y += options.offset.y
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Character) {
        await bot.smartMove(this.location, { useBlink: true })
    }
}

export type ImprovedMoveStrategyOptions = {
    /** Where to wait if there are no monsters to move to */
    idlePosition?: IPosition

    /** If set, we will offset the given location by this amount */
    offset?: {
        x?: number
        y?: number
    }
}

export class ImprovedMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public types: MonsterName[]
    protected spawns: IPosition[] = []
    protected options: ImprovedMoveStrategyOptions
    protected sort: (a: Entity, b: Entity) => number

    public constructor(type: MonsterName | MonsterName[], options?: ImprovedMoveStrategyOptions) {
        if (!options) options = {}
        this.options = options

        if (Array.isArray(type)) {
            this.types = type
        } else {
            this.types = [type]
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })

        if (options.idlePosition) {
            this.spawns.push({ ...options.idlePosition })
        } else {
            for (const type of this.types) {
                for (const spawn of Pathfinder.locateMonster(type)) {
                    this.spawns.push({ ...spawn })
                }
            }
        }

        if (this.options.offset) {
            for (const spawn of this.spawns) {
                if (this.options.offset.x) spawn.x += this.options.offset.x
                if (this.options.offset.y) spawn.y += this.options.offset.y
            }
        }
    }

    public onApply (bot: Character) {
        this.spawns.sort(sortClosestDistancePathfinder(bot))
        this.sort = sortTypeThenClosest(bot, this.types)
    }

    private async move(bot: Character) {
        const targets = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false })
        targets.sort(this.sort)

        // Move to next monster
        let lastD = 0
        for (const target of targets) {
            const d = AL.Tools.distance({ x: bot.x, y: bot.y }, { x: target.x, y: target.y })
            if (d < bot.range) {
                lastD = d
                continue
            }

            if (lastD) {
                bot.smartMove(target, { getWithin: d - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            } else {
                bot.smartMove(target, { resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            }
            return
        }

        if (bot.map !== this.spawns[0].map) {
            // Move to spawn
            await bot.smartMove(this.spawns[0], {
                avoidTownWarps: bot.targets > 0,
                resolveOnFinalMoveStart: true,
                useBlink: true,
                stopIfTrue: () => {
                    if (bot.map !== this.spawns[0].map) return false
                    const entities = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false, withinRange: "attack" })
                    return entities.length > 0
                }
            })
        } else if (lastD) {
            // Move towards center of closest spawn
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { getWithin: AL.Tools.distance({ x: bot.x, y: bot.y }, this.spawns[0]) - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        } else if (!bot.smartMoving) {
            // No targets nearby, move to spawn
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { resolveOnFinalMoveStart: true, useBlink: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export type MoveInCircleMoveStrategyOptions = {
    /** The center of the circle to walk */
    center: IPosition
    /** The radius of the circle to walk */
    radius: number
    /** The number of sides to make the circle */
    sides?: number
    /** If true, we will move counter-clockwise instead */
    ccw?: true
}

export class MoveInCircleMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: MoveInCircleMoveStrategyOptions

    public constructor(options: MoveInCircleMoveStrategyOptions) {
        if (options.sides === undefined){
            options.sides = 3
        } else if (options.sides !== undefined && options.sides < 3) {
            console.warn("[MoveInCircleMoveStrategy] # Sides must be a minimum of 3, setting to 3.")
            options.sides = 3
        }
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })
    }

    private move(bot: Character) {
        const angle = (2 * Math.PI) / this.options.sides
        const center = this.options.center
        const radius = this.options.radius
        if (AL.Pathfinder.canWalkPath(bot, center)) {
            const angleFromCenterToCurrent = Math.atan2(bot.y - center.y, bot.x - center.x)
            const endGoalAngle = angleFromCenterToCurrent + (this.options.ccw ? -angle : angle)
            const endGoal = { x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }
            bot.move(endGoal.x, endGoal.y, { resolveOnStart: true }).catch(() => { /** Suppress errors */ })
        } else {
            // Move to where we can walk
            return bot.smartMove(center, { getWithin: radius, useBlink: true })
        }
    }
}

export type SpecialMonsterMoveStrategyOptions = {
    /** If true, we won't use the database locations */
    disableCheckDB?: true
    /** If true, we will ignore moving if the monster is on one of these maps */
    ignoreMaps?: MapName[]
    /** The monster we want to look for */
    type: MonsterName
}

export class SpecialMonsterMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: SpecialMonsterMoveStrategyOptions

    public constructor(options: SpecialMonsterMoveStrategyOptions) {
        this.options = options
        if (!this.options.ignoreMaps) this.options.ignoreMaps = []

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })
    }

    protected async move(bot: Character) {
        const stopIfTrue = (): boolean => {
            const sInfo = bot.S?.[this.options.type] as ServerInfoDataLive
            if (sInfo) {
                if (!sInfo.live) return true // It's dead
                if (sInfo.map !== bot.smartMoving.map) return true // It moved maps
            }

            const target = bot.getEntity({ type: this.options.type })
            if (!target) return false // No target, don't stop
            if (Pathfinder.canWalkPath(bot, target)) return true // We can walk to it, stop!
        }

        // Look for it nearby
        let target = bot.getEntity({ returnNearest: true, type: this.options.type })
        if (target) {
            await bot.smartMove(target, { getWithin: bot.range - 10, stopIfTrue: stopIfTrue, useBlink: true })
            return bot.smartMove(target, { getWithin: bot.range - 10, useBlink: true })
        }

        // Look for it in the server data
        const sInfo = bot.S?.[this.options.type] as ServerInfoDataLive
        if (
            sInfo && sInfo.live && sInfo.x !== undefined && sInfo.y !== undefined
            && !this.options.ignoreMaps.includes(sInfo.map)
        ) {
            const destination = bot.S[this.options.type] as IPosition
            if (AL.Tools.distance(bot, destination) > bot.range) {
                return bot.smartMove(destination, { getWithin: bot.range - 10, stopIfTrue: stopIfTrue, useBlink: true })
            }
        }

        let dbTarget: IPosition
        if (!this.options.disableCheckDB) {
            // Look for it in our database
            dbTarget = await AL.EntityModel.findOne({
                lastSeen: { $gt: Date.now() - 60_000 },
                map: { $nin: this.options.ignoreMaps },
                serverIdentifier: bot.server.name,
                serverRegion: bot.server.region,
                type: this.options.type
            }).sort({ lastSeen: -1 }).lean().exec()
            if (dbTarget && dbTarget.x !== undefined && dbTarget.y !== undefined) {
                return bot.smartMove(dbTarget, { getWithin: bot.range - 10, stopIfTrue: stopIfTrue, useBlink: true })
            }
        }

        // Look for if there's a spawn for it
        for (const spawn of Pathfinder.locateMonster(this.options.type)) {
            if (this.options.ignoreMaps.includes(spawn.map)) continue

            // Move to the next spawn
            await bot.smartMove(spawn, { getWithin: bot.range - 10, stopIfTrue: () => bot.getEntity({ type: this.options.type }) !== undefined })

            target = bot.getEntity({ returnNearest: true, type: this.options.type })
            if (target) return bot.smartMove(target, { getWithin: bot.range - 10, stopIfTrue: stopIfTrue, useBlink: true })
        }

        // Go through all the spawns on the map to look for it
        if ((dbTarget && dbTarget.x == undefined && dbTarget.y == undefined && dbTarget.map)
        || (sInfo && sInfo.live && sInfo.x !== undefined && sInfo.y !== undefined && !this.options.ignoreMaps.includes(sInfo.map))) {
            const spawns: IPosition[] = []

            const gMap = bot.G.maps[(dbTarget.map ?? bot.S[this.options.type]["map"]) as MapName] as GMap
            if (gMap.ignore) return
            if (gMap.instance || !gMap.monsters || gMap.monsters.length == 0) return // Map is unreachable, or there are no monsters

            for (const spawn of gMap.monsters) {
                const gMonster = bot.G.monsters[spawn.type]
                if (gMonster.aggro >= 100 || gMonster.rage >= 100) continue // Skip aggro spawns
                if (spawn.boundary) {
                    spawns.push({ "map": dbTarget.map, "x": (spawn.boundary[0] + spawn.boundary[2]) / 2, "y": (spawn.boundary[1] + spawn.boundary[3]) / 2 })
                } else if (spawn.boundaries) {
                    for (const boundary of spawn.boundaries) {
                        spawns.push({ "map": boundary[0], "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 })
                    }
                }
            }

            // Sort to improve efficiency a little
            spawns.sort((a, b) => a.x - b.x)

            for (const spawn of spawns) {
                // Move to the next spawn
                await bot.smartMove(spawn, { getWithin: AL.Constants.MAX_VISIBLE_RANGE / 2, stopIfTrue: () => bot.getEntity({ type: this.options.type }) !== undefined })

                target = bot.getEntity({ returnNearest: true, type: this.options.type })
                if (target) return bot.smartMove(target, { getWithin: bot.range - 10, stopIfTrue: stopIfTrue, useBlink: true })
            }
        }
    }
}