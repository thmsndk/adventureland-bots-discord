import AL, { PingCompensatedCharacter, ServerIdentifier, ServerRegion, SkillName } from "alclient"

export type Loop<Type> = {
    fn: (bot: Type) => Promise<unknown>,
    /** If number, it will loop every this many ms. If SkillName, it will loop based on the cooldown of the skills in the array */
    interval: SkillName[] | number
}

export type LoopName =
    | "attack"
    | "avoid_stacking"
    | "buy"
    | "compound"
    | "equip"
    | "heal"
    | "loot"
    | "merchant_stand"
    | "mluck"
    | "move"
    | "party"
    | "respawn"
    | "rspeed"
    | "sell"
    | "tracker"
    | "upgrade"

export type Loops<Type> = Map<LoopName, Loop<Type>>

export interface Strategy<Type> {
    loops?: Loops<Type>
    /** This function will be called when the strategy gets applied to the bot */
    onApply?: (bot: Type) => void
    /** If the strategy is removed, this function will be called */
    onRemove?: (bot: Type) => void
}

export class Strategist<Type extends PingCompensatedCharacter> {
    public bot: Type

    private strategies = new Set<Strategy<Type>>()
    private loops: Loops<Type> = new Map<LoopName, Loop<Type>>()
    private stopped = false
    private timeouts = new Map<LoopName, NodeJS.Timeout>()

    public constructor(bot: Type, initialStrategy?: Strategy<Type>) {
        this.changeBot(bot)
        this.applyStrategy(initialStrategy)
    }

    public applyStrategy(strategy: Strategy<Type>) {
        if (!strategy) return // No strategy
        this.strategies.add(strategy)

        if (strategy.onApply) strategy.onApply(this.bot)

        if (!strategy.loops) return
        for (const [name, fn] of strategy.loops) {
            if (fn == undefined) {
                // Stop the loop
                this.stopLoop(name)
            } else if (this.loops.has(name)) {
                // Change the loop
                this.loops.set(name, fn)
            } else {
                // Start the loop
                this.loops.set(name, fn)

                const newLoop = async () => {
                    // Run the loop
                    try {
                        const loop = this.loops.get(name)
                        if (!loop || this.stopped) return // Stop the loop
                        if (this.bot.ready) {
                            await loop.fn(this.bot) // Run the loop function
                        }
                    } catch (e) {
                        console.error(e)
                    }

                    // Setup the next run
                    const loop = this.loops.get(name)
                    if (!loop || this.stopped) return // Stop the loop
                    if (typeof loop.interval == "number") this.timeouts.set(name, setTimeout(newLoop, loop.interval)) // Continue the loop
                    else if (Array.isArray(loop.interval)) {
                        const cooldown = Math.max(50, Math.min(...loop.interval.map((skill) => this.bot.getCooldown(skill))))
                        this.timeouts.set(name, setTimeout(newLoop, cooldown)) // Continue the loop
                    }
                }
                newLoop().catch(console.error)
            }
        }
    }

    public applyStrategies(strategies: Strategy<Type>[]) {
        for (const strategy of strategies) this.applyStrategy(strategy)
    }

    public changeBot(newBot: Type) {
        this.bot = newBot
        this.bot.socket.on("disconnect", () => this.reconnect())

        for (const strategy of this.strategies) {
            if (strategy.onApply) {
                strategy.onApply(newBot)
            }
        }
    }

    public async changeServer(region: ServerRegion, id: ServerIdentifier) {
        return new Promise<void>((resolve) => {
            // Disconnect the bot (this will remove the disconnect listener, too)
            this.bot.disconnect()

            const switchBots = async () => {
                try {
                    let newBot: PingCompensatedCharacter
                    switch (this.bot.ctype) {
                        case "mage": {
                            newBot = new AL.Mage(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "merchant": {
                            newBot = new AL.Merchant(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "paladin": {
                            newBot = new AL.Paladin(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "priest": {
                            newBot = new AL.Priest(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "ranger": {
                            newBot = new AL.Ranger(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "rogue": {
                            newBot = new AL.Rogue(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        case "warrior": {
                            newBot = new AL.Warrior(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[region][id])
                            break
                        }
                        default: {
                            throw new Error(`No handler for ${this.bot.ctype}`)
                        }
                    }

                    await newBot.connect()
                    this.changeBot(newBot as Type)
                } catch (e) {
                    setTimeout(switchBots, 1000)
                }
                resolve()
            }
            switchBots().catch(console.error)
        })
    }

    public isStopped() {
        return this.stopped
    }

    public removeStrategy(strategy: Strategy<Type>) {
        if (!this.strategies.has(strategy)) return // We don't have this strategy enabled

        if (strategy.loops) {
            for (const [loopName] of strategy.loops) {
                this.stopLoop(loopName)
            }
        }
        if (strategy.onRemove) strategy.onRemove(this.bot)

        this.strategies.delete(strategy)
    }

    public async reconnect(): Promise<void> {
        this.bot.disconnect()

        try {
            let newBot: PingCompensatedCharacter
            switch (this.bot.ctype) {
                case "mage": {
                    newBot = new AL.Mage(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "merchant": {
                    newBot = new AL.Merchant(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "paladin": {
                    newBot = new AL.Paladin(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "priest": {
                    newBot = new AL.Priest(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "ranger": {
                    newBot = new AL.Ranger(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "rogue": {
                    newBot = new AL.Rogue(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                case "warrior": {
                    newBot = new AL.Warrior(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, AL.Game.servers[this.bot.serverData.region][this.bot.serverData.name])
                    break
                }
                default: {
                    throw new Error(`No handler for ${this.bot.ctype}`)
                }
            }

            await newBot.connect()
            this.changeBot(newBot as Type)
        } catch (e) {
            this.bot.disconnect()
            console.error(e)
            const wait = /wait_(\d+)_second/.exec(e)
            if (wait && wait[1]) {
                setTimeout(() => this.reconnect(), 2000 + Number.parseInt(wait[1]) * 1000)
            } else if (/limits/.test(e)) {
                setTimeout(() => this.reconnect(), AL.Constants.RECONNECT_TIMEOUT_MS)
            } else {
                setTimeout(() => this.reconnect(), 10000)
            }
        }
    }

    private stopLoop(loopName: LoopName): void {
        // Clear the timeout
        const timeout = this.timeouts.get(loopName)
        if (timeout) clearTimeout(timeout)

        // Delete the loop
        this.loops.delete(loopName)
    }

    public stop(): void {
        this.bot.socket.removeAllListeners("disconnect")
        this.stopped = true
        for (const [, timeout] of this.timeouts) clearTimeout(timeout)
        this.bot.disconnect()
    }
}