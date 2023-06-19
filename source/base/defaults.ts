import AL, { ItemName, ServerIdentifier, ServerRegion } from "alclient"

export const DEFAULT_REGION: ServerRegion = "EU"
export const DEFAULT_IDENTIFIER: ServerIdentifier = "I"

export const DEFAULT_CRAFTABLES = new Set<ItemName>([
    "armorring",
    "basketofeggs",
    "bfangamulet",
    "cake",
    "carrotsword",
    "firestars",
    "pouchbow",
    "resistancering",
    "snowflakes",
    "wbreeches",
    "wcap",
    "wgloves",
])

export const DEFAULT_EXCHANGEABLES = new Set<ItemName>([
    "armorbox",
    "basketofeggs",
    "candy0",
    "candy1",
    "candycane",
    "candypop",
    "gem0",
    "gem1",
    "gemfragment",
    "leather",
    "seashell",
    "weaponbox",
])
export const DEFAULT_GOLD_TO_HOLD = 100_000_000
export const DEFAULT_ITEMS_TO_HOLD = new Set<ItemName>([
    "computer",
    "goldbooster",
    "hpot1",
    "luckbooster",
    "mpot1",
    "supercomputer",
    "tracker",
    "xpbooster",
    "xptome"
])
export const DEFAULT_MERCHANT_ITEMS_TO_HOLD = new Set<ItemName>([
    ...DEFAULT_ITEMS_TO_HOLD,
    "cscroll0",
    "cscroll1",
    "cscroll2",
    "offering",
    "offeringp",
    "pickaxe",
    "rod",
    "scroll0",
    "scroll1",
    "scroll2",
])
export const DEFAULT_REPLENISHABLES = new Map<ItemName, number>([
    ["hpot1", 2500],
    ["mpot1", 2500],
    ["xptome", 1],
])
export const DEFAULT_MERCHANT_REPLENISHABLES = new Map<ItemName, number>([
    ["offering", 1],
    ["cscroll0", 500],
    ["cscroll1", 50],
    ["cscroll2", 5],
    ["scroll0", 500],
    ["scroll1", 50],
    ["scroll2", 5],
])
export const DEFAULT_REPLENISH_RATIO = 0.5

/**
 * Prices set < 0 will be set to `G.items[itemName].g * (-price)`
 * For example, if an item's price is set to `-0.9`, we will pay up to `G.items[itemName].g * 0.9` for it.
 */
export const DEFAULT_ITEMS_TO_BUY = new Map<ItemName, number>([
    ["5bucks", 100_000_000],
    ["amuletofm", -AL.Constants.PONTY_MARKUP],
    ["angelwings", -AL.Constants.PONTY_MARKUP],
    ["armorring", 1_000_000],
    ["basher", -AL.Constants.PONTY_MARKUP],
    ["bataxe", -AL.Constants.PONTY_MARKUP],
    ["bcape", -AL.Constants.PONTY_MARKUP],
    ["bfang", -AL.Constants.PONTY_MARKUP],
    ["bfangamulet", -AL.Constants.PONTY_MARKUP],
    ["bottleofxp", -AL.Constants.PONTY_MARKUP],
    ["broom", -AL.Constants.PONTY_MARKUP],
    ["bwing", -AL.Constants.PONTY_MARKUP],
    ["carrot", -AL.Constants.PONTY_MARKUP], // We can craft them in to carrot swords and sell the swords
    ["cdarktristone", -AL.Constants.PONTY_MARKUP],
    ["cearring", 1_000_000],
    ["computer", 100_000_000],
    ["crabclaw", -AL.Constants.PONTY_MARKUP], // We can craft them in to wbreeches
    ["cring", 1_000_000],
    ["critscroll", 5_000_000],
    ["crossbow", -AL.Constants.PONTY_MARKUP],
    ["cryptkey", 1_000_000],
    ["cscroll3", -AL.Constants.PONTY_MARKUP],
    ["ctristone", -AL.Constants.PONTY_MARKUP],
    ["cxjar", 1_000_000],
    ["cyber", -AL.Constants.PONTY_MARKUP],
    ["dartgun", -AL.Constants.PONTY_MARKUP],
    ["dexearring", -AL.Constants.PONTY_MARKUP],
    ["dexearringx", -AL.Constants.PONTY_MARKUP],
    ["dkey", 100_000_000],
    ["dragondagger", -AL.Constants.PONTY_MARKUP],
    ["egg0", -AL.Constants.PONTY_MARKUP],
    ["egg1", -AL.Constants.PONTY_MARKUP],
    ["egg2", -AL.Constants.PONTY_MARKUP],
    ["egg3", -AL.Constants.PONTY_MARKUP],
    ["egg4", -AL.Constants.PONTY_MARKUP],
    ["egg5", -AL.Constants.PONTY_MARKUP],
    ["egg6", -AL.Constants.PONTY_MARKUP],
    ["egg7", -AL.Constants.PONTY_MARKUP],
    ["egg8", -AL.Constants.PONTY_MARKUP],
    ["emotionjar", 1_000_000],
    ["essenceoffire", -AL.Constants.PONTY_MARKUP],
    ["essenceoffrost", -AL.Constants.PONTY_MARKUP],
    ["essenceofgreed", 25_000_000],
    ["essenceofnature", -AL.Constants.PONTY_MARKUP],
    ["exoarm", -AL.Constants.PONTY_MARKUP],
    ["fallen", 100_000_000],
    ["fierygloves", -AL.Constants.PONTY_MARKUP],
    ["firebow", -AL.Constants.PONTY_MARKUP],
    ["firestars", -AL.Constants.PONTY_MARKUP],
    ["frostbow", -AL.Constants.PONTY_MARKUP],
    ["froststaff", -AL.Constants.PONTY_MARKUP],
    ["frozenkey", 1_000_000],
    ["ftrinket", -AL.Constants.PONTY_MARKUP],
    ["fury", 100_000_000],
    ["gbow", -AL.Constants.PONTY_MARKUP],
    ["glolipop", -AL.Constants.PONTY_MARKUP],
    ["goldenpowerglove", -AL.Constants.PONTY_MARKUP],
    ["goldingot", -AL.Constants.PONTY_MARKUP],
    ["goldnugget", -AL.Constants.PONTY_MARKUP],
    ["goldring", -AL.Constants.PONTY_MARKUP],
    ["gstaff", -AL.Constants.PONTY_MARKUP],
    ["harbringer", -AL.Constants.PONTY_MARKUP],
    ["harmor", -AL.Constants.PONTY_MARKUP],
    ["harpybow", -AL.Constants.PONTY_MARKUP],
    ["hboots", -AL.Constants.PONTY_MARKUP],
    ["hdagger", -AL.Constants.PONTY_MARKUP],
    ["heartwood", -AL.Constants.PONTY_MARKUP],
    ["hgloves", -AL.Constants.PONTY_MARKUP],
    ["hhelmet", -AL.Constants.PONTY_MARKUP],
    ["hpants", -AL.Constants.PONTY_MARKUP],
    ["ink", -AL.Constants.PONTY_MARKUP],
    ["jacko", -AL.Constants.PONTY_MARKUP],
    ["lmace", -AL.Constants.PONTY_MARKUP],
    ["lostearring", -AL.Constants.PONTY_MARKUP],
    ["lotusf", -AL.Constants.PONTY_MARKUP],
    ["luckscroll", 5_000_000],
    ["luckyt", -AL.Constants.PONTY_MARKUP],
    ["mearring", -AL.Constants.PONTY_MARKUP],
    ["molesteeth", -AL.Constants.PONTY_MARKUP],
    ["mpxamulet", -AL.Constants.PONTY_MARKUP],
    ["mpxbelt", 100_000_000],
    ["mpxgloves", 100_000_000],
    ["mshield", -AL.Constants.PONTY_MARKUP],
    ["networkcard", -AL.Constants.PONTY_MARKUP],
    ["northstar", -AL.Constants.PONTY_MARKUP],
    ["offering", -0.95],
    ["offeringp", 1_000_000],
    ["offeringx", 100_000_000],
    ["ololipop", -AL.Constants.PONTY_MARKUP],
    ["orbofdex", -AL.Constants.PONTY_MARKUP],
    ["orbofint", -AL.Constants.PONTY_MARKUP],
    ["orbofsc", -AL.Constants.PONTY_MARKUP],
    ["orbofstr", -AL.Constants.PONTY_MARKUP],
    ["oxhelmet", -AL.Constants.PONTY_MARKUP],
    ["pickaxe", -AL.Constants.PONTY_MARKUP],
    ["pinkie", 300_000],
    ["platinumingot", -AL.Constants.PONTY_MARKUP],
    ["platinumnugget", -AL.Constants.PONTY_MARKUP],
    ["poison", -AL.Constants.PONTY_MARKUP],
    ["poker", -AL.Constants.PONTY_MARKUP],
    ["powerglove", -AL.Constants.PONTY_MARKUP],
    ["rabbitsfoot", -AL.Constants.PONTY_MARKUP],
    ["rapier", -AL.Constants.PONTY_MARKUP],
    ["resistancering", 1_000_000],
    ["ringhs", -AL.Constants.PONTY_MARKUP],
    ["ringofluck", -AL.Constants.PONTY_MARKUP],
    ["rod", -AL.Constants.PONTY_MARKUP],
    ["sanguine", -AL.Constants.PONTY_MARKUP],
    ["sbelt", -AL.Constants.PONTY_MARKUP],
    ["gslime", -AL.Constants.PONTY_MARKUP], // We can craft them in to wcap
    ["scroll3", -AL.Constants.PONTY_MARKUP],
    ["scroll4", -AL.Constants.PONTY_MARKUP],
    ["scythe", -AL.Constants.PONTY_MARKUP],
    ["shadowstone", -AL.Constants.PONTY_MARKUP],
    ["skullamulet", -AL.Constants.PONTY_MARKUP],
    ["snakeoil", -AL.Constants.PONTY_MARKUP],
    ["snowflakes", -AL.Constants.PONTY_MARKUP],
    ["snring", -AL.Constants.PONTY_MARKUP],
    ["spidersilk", -AL.Constants.PONTY_MARKUP],
    ["spores", -AL.Constants.PONTY_MARKUP], // We can craft wbreeches or wgloves
    ["starkillers", -AL.Constants.PONTY_MARKUP],
    ["stealthcape", -AL.Constants.PONTY_MARKUP],
    ["suckerpunch", 100_000_000],
    ["supercomputer", 100_000_000],
    ["supermittens", -AL.Constants.PONTY_MARKUP],
    ["t2quiver", -AL.Constants.PONTY_MARKUP],
    ["t3bow", -AL.Constants.PONTY_MARKUP],
    ["talkingskull", -AL.Constants.PONTY_MARKUP],
    ["tigerstone", -AL.Constants.PONTY_MARKUP],
    ["trigger", -AL.Constants.PONTY_MARKUP],
    ["tshirt3", -AL.Constants.PONTY_MARKUP],
    ["tshirt6", -AL.Constants.PONTY_MARKUP],
    ["tshirt7", -AL.Constants.PONTY_MARKUP],
    ["tshirt8", -AL.Constants.PONTY_MARKUP],
    ["tshirt88", -AL.Constants.PONTY_MARKUP],
    ["tshirt9", -AL.Constants.PONTY_MARKUP],
    ["vattire", -AL.Constants.PONTY_MARKUP],
    ["vcape", -AL.Constants.PONTY_MARKUP],
    ["vgloves", -AL.Constants.PONTY_MARKUP],
    ["vhammer", -AL.Constants.PONTY_MARKUP],
    ["vitring", -AL.Constants.PONTY_MARKUP],
    ["vorb", -AL.Constants.PONTY_MARKUP],
    ["vring", -AL.Constants.PONTY_MARKUP],
    ["warpvest", 100_000_000],
    ["wblade", 100_000_000],
    ["wbook1", -AL.Constants.PONTY_MARKUP],
    ["wbookhs", -AL.Constants.PONTY_MARKUP],
    ["weaver", -AL.Constants.PONTY_MARKUP],
    ["whiteegg", -1], // We can craft them in to cakes and sell the cakes
    ["wingedboots", -AL.Constants.PONTY_MARKUP],
    ["x0", -AL.Constants.PONTY_MARKUP],
    ["x1", -AL.Constants.PONTY_MARKUP],
    ["x2", -AL.Constants.PONTY_MARKUP],
    ["x3", -AL.Constants.PONTY_MARKUP],
    ["x4", -AL.Constants.PONTY_MARKUP],
    ["x5", -AL.Constants.PONTY_MARKUP],
    ["x6", -AL.Constants.PONTY_MARKUP],
    ["x7", -AL.Constants.PONTY_MARKUP],
    ["x8", -AL.Constants.PONTY_MARKUP],
    ["xarmor", -2],
    ["xboots", -2],
    ["xgloves", -2],
    ["xhelmet", -2],
    ["xpants", -2],
    ["xshield", -AL.Constants.PONTY_MARKUP],
    ["zapper", -AL.Constants.PONTY_MARKUP],
])