import AL from "alclient"
import { Client, IntentsBitField } from "discord.js"
import fs from "fs"
import interactionCreate from "./interactionCreate.js"
import ready from "./listeners/ready.js"
import { initializeMerchantTracker } from "./merchantTracker.js"

const credentials = JSON.parse(fs.readFileSync("../../../credentials.json", "utf-8"))
await AL.Game.getGData(true, false)
await AL.Game.loginJSONFile("../../../credentials.json")

console.log("Bot is starting...")

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent]
})

ready(client)
interactionCreate(client)

// Initialize the merchant tracking with the client instance
initializeMerchantTracker(client, "1079859790831951914") // Pass the trade channel ID

