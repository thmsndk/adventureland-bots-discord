import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { compoundItem, upgradeItem, upgradeIfMany } from './upgrade'
import { sellUnwantedItems, exchangeItems } from './trade';

class Merchant extends Character {
    targetPriority: MonsterName[] = []; // Nothing for now, merchants can't usually attack.
    newTargetPriority = {}
    mainTarget: MonsterName = null;

    protected mainLoop(): void {
        try {
            // Movement
            if (this.holdPosition) {
                // Don't move.
            } else if (!smart.moving) { // TODO: Add a check that we're not using our pathfinding.
                super.avoidAggroMonsters();
                super.avoidAttackingMonsters();

                // event monsters
                let event = false;
                for (let eventMonsterName in parent.S) {
                    let eventMonster: any = parent.S[eventMonsterName]
                    if (!eventMonster.live) continue; // Not live
                    if (eventMonster.hp / eventMonster.max_hp > 0.9) continue; // Nobody's attacking it

                    event = true;
                    if (parent.distance(parent.character, eventMonster) > 250) smart_move(eventMonster);
                }

                // full inventory
                let full = true;
                for (let i = 0; i < 42; i++) {
                    if (parent.character.items[i]) continue;
                    full = false;
                    break;
                }

                // travel back and forth between characters
                if (full) {
                    game_log("moving to the bank")
                    smart_move("bank")
                } else if (event) {
                    // We're dealing with an event, don't move to characters.
                } else if (parent.distance(parent.character, parent.party["earthiverse"]) < 250) {
                    game_log("moving to town from earthiverse")
                    smart_move({ map: "main", x: -50, y: -390 })
                } else if (parent.distance(parent.character, parent.party["earthMag"]) < 250) {
                    game_log("moving to town from earthMag")
                    smart_move({ map: "main", x: -60, y: -390 })
                } else if (parent.distance(parent.character, parent.party["earthWar"]) < 250) {
                    game_log("moving to town from earthWar")
                    smart_move({ map: "main", x: -40, y: -390 })
                } else if (parent.distance(parent.character, { map: "main", x: -50, y: -390 }) < 5) {
                    game_log("moving to earthMag")
                    smart_move(parent.party["earthMag"])
                } else if (parent.distance(parent.character, { map: "main", x: -60, y: -390 }) < 5) {
                    game_log("moving to earthWar")
                    smart_move(parent.party["earthWar"])
                } else if (parent.distance(parent.character, { map: "main", x: -40, y: -390 }) < 5) {
                    game_log("moving to earthiverse")
                    smart_move(parent.party["earthiverse"])
                } else {
                    game_log("default moving to earthiverse")
                    smart_move(parent.party["earthiverse"])
                }
            }

            sellUnwantedItems();
            exchangeItems();

            // Bank stuff
            // TODO: Check for things we can upgrade
            if (parent.character.map == "bank") {
                if (parent.character.gold > 25000000) {
                    bank_deposit(parent.character.gold - 25000000)
                }
                for (let i = 0; i < 42; i++) {
                    if (!character.items[i]) continue;

                    // Items0
                    if (["5bucks", "ascale", "beewings", "bfur", "candy0", "candy1", "candycane", "carrot", "crabclaw", "cscale", "essenceoffrost", "feather0", "frogt", "gslime", "ijx", "leather", "lotusf", "mistletoe", "monstertoken", "poison", "pumpkinspice", "rattail", "seashell", "shadowstone", "smoke", "smush", "snakefang", "snakeoil", "spidersilk", "spores", "vitscroll", "whiteegg"].includes(parent.character.items[i].name)) {
                        bank_store(i, "items0")
                    }

                    // Items1
                    if (["dexring", "intring", "strring", "dexbelt", "intbelt", "strbelt"].includes(parent.character.items[i].name)) {
                        bank_store(i, "items1")
                    }

                    // Items2
                    if (["dexearring", "intearring", "strearring", "dexamulet", "intamulet", "stramulet", "wbook0", "wbook1", "lostearring"].includes(parent.character.items[i].name)) {
                        bank_store(i, "items2")
                    }

                    // Items3
                    if (["lantern", "talkingskull", "jacko", "swordofthedead", "daggerofthedead", "staffofthedead", "bowofthedead", "wbook0", "wbook1"].includes(parent.character.items[i].name)) {
                        bank_store(i, "items3")
                    }
                }
            }

            //// Wearables
            // Rings
            compoundItem("dexring", 3);
            compoundItem("intring", 3);
            compoundItem("strring", 3);

            // Amulets
            compoundItem("dexamulet", 3);
            compoundItem("intamulet", 3);
            compoundItem("stramulet", 3);

            // Earrings
            compoundItem("dexearring", 3);
            compoundItem("intearring", 3);
            compoundItem("strearring", 3);

            // Belts
            compoundItem("dexbelt", 3);
            compoundItem("intbelt", 3);
            compoundItem("strbelt", 3);

            // Offhands
            upgradeItem("quiver", 8);
            upgradeItem("t2quiver", 5);
            compoundItem("wbook0", 3);
            compoundItem("wbook1", 2);

            // Capes
            upgradeItem("cape", 6);

            // Orbs
            compoundItem("orbg", 2);
            compoundItem("jacko", 2);
            compoundItem("lantern", 2);

            //// Weapons
            upgradeItem("firestaff", 7);
            upgradeItem("fireblade", 7);
            upgradeItem("t2bow", 7);

            //// Miscellaneous
            compoundItem("lostearring", 2);

            // Merchant Set
            upgradeItem("mcgloves", 6);
            upgradeItem("mcpants", 6);
            upgradeItem("mcarmor", 6);
            upgradeItem("mcboots", 6);
            upgradeItem("mchat", 6);

            // Heavy Set
            upgradeItem("helmet1", 8)
            upgradeItem("coat1", 8)
            upgradeItem("pants1", 8)
            upgradeItem("shoes1", 8)
            upgradeItem("gloves1", 8)

            // Normal Set
            upgradeItem("coat", 9);
            upgradeItem("pants", 9);
            upgradeItem("gloves", 9);
            upgradeItem("shoes", 9);
            upgradeItem("helmet", 9);
            upgradeItem("bow", 9);

            // buyAndUpgrade("coat")
            // buyAndUpgrade("pants")
            // buyAndUpgrade("gloves")
            // buyAndUpgrade("shoes")
            // buyAndUpgrade("helmet")

            upgradeIfMany();

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    public run(): void {
        super.run();
        this.luckLoop();
        this.lootLoop();
    }

    protected attackLoop(): void {
        // Nothing for now, merchants can't usually attack.
    }

    private luckedCharacters: any = {}
    public luckLoop(): void {
        if (parent.character.mp < 10) {
            // Do nothing
        } else if (!parent.character.s || !parent.character.s["mluck"] || parent.character.s["mluck"].ms < 10000 || parent.character.s["mluck"].f != parent.character.name) {
            // Luck ourself
            use_skill("mluck", character);
        } else {
            // Luck others
            for (let id in parent.entities) {
                let luckTarget = parent.entities[id];
                if (!luckTarget.player || luckTarget.npc) continue; // not a player
                if (distance(character, luckTarget) > 250) continue; // out of range
                if (this.luckedCharacters[luckTarget.name] && this.luckedCharacters[luckTarget.name] > Date.now() - parent.character.ping) continue; // Prevent spamming luck
                if (!luckTarget.s || !luckTarget.s["mluck"] || luckTarget.s["mluck"].ms < 300000 || luckTarget.s["mluck"].f != parent.character.name) {
                    this.luckedCharacters[luckTarget.name] = Date.now();
                    use_skill("mluck", luckTarget);
                    game_log("lucking " + luckTarget.name)
                    break;
                }
            }
        }

        setTimeout(() => { this.luckLoop() }, Math.max(100, parent.next_skill["mluck"] - Date.now()));
    }
}

export let merchant = new Merchant();