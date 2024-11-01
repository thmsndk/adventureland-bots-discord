import AL from "alclient"
import { Client, IntentsBitField } from "discord.js"
import fs from "fs"
import interactionCreate from "./interactionCreate.js"
import ready from "./listeners/ready.js"
import { initializeMerchantTracker, testInitializeMerchantTracker } from "./merchantTracker.js"

const credentials = JSON.parse(fs.readFileSync("../../../credentials.json", "utf-8"))
await AL.Game.getGData(true, false)
await AL.Game.loginJSONFile("../../../credentials.json")

console.log("Bot is starting...")

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
})
// const client = new Client({
//     intents: [IntentsBitField.Flags.MessageContent],
// })

ready(client)
// interactionCreate(client)

// Initialize the merchant tracking with the client instance
// initializeMerchantTracker(client, "1079859790831951914") // Pass the trade channel ID
testInitializeMerchantTracker(client, "1079859790831951914")

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
void client.login(credentials.discord.auth)
