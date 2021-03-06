/**
 * Module Imports
 */
const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { join } = require("path");
const { DISCORD_TOKEN, DISCORD_PREFIX, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = require("./util/EvobotUtil");
const { RefreshableAuthProvider, StaticAuthProvider } = require('twitch-auth')
const tmi = require('twitch-auth-tmi');
const fs = require('fs');


const client = new Client({ 
  disableMentions: "everyone",
  restTimeOffset: 0
});

client.login(DISCORD_TOKEN);
client.commands = new Collection();
client.prefix = DISCORD_PREFIX;
client.queue = new Map();
const cooldowns = new Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Client Events
 */
client.on("ready", () => {
  console.log(`${client.user.username} ready!`);
  client.user.setActivity(`${DISCORD_PREFIX}help and ${DISCORD_PREFIX}play`, { type: "LISTENING" });
});
client.on("warn", (info) => console.log(info));
client.on("error", console.error);

/**
 * Import all commands
 */
const commandFiles = readdirSync(join(__dirname, "commands")).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", `${file}`));
  client.commands.set(command.name, command);
}

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(DISCORD_PREFIX)})\\s*`);
  if (!prefixRegex.test(message.content)) return;

  const [, matchedPrefix] = message.content.match(prefixRegex);

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

  // if (command.name == 'song_request') {
  //   return message.reply(`this command is only available from twitch chat`);
  // }

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    if (command.name == 'song_request') {
      command.execute(args, client);
    } else {
      command.execute(message, args);
    }
  } catch (error) {
    console.error(error);
    message.reply("There was an error executing that command.").catch(console.error);
  }
});

const tokenData = require('./tokens.json');
const clientId = TWITCH_CLIENT_ID;
const clientSecret = TWITCH_CLIENT_SECRET;
const authProvider = new RefreshableAuthProvider(
  new StaticAuthProvider(clientId, tokenData.accessToken),
  {
    clientSecret,
    refreshToken: tokenData.refreshToken,
    expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
    onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
      const newTokenData = {
        accessToken,
        refreshToken,
        expiryTimestamp: expiryDate === null ? null : expiryDate.getTime(),
        clientId,
        clientSecret
      };
      fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), function () {
        console.log('tokens updated')
      })
    }
  }
);

const twitch_client = new tmi.Client({
  options: { debug: true, messagesLogLevel: 'info' },
  connection: {
    reconnect: true,
    secure: true
  },
  authProvider: authProvider,
  channels: ['is0sans', 'omar10594']
});
twitch_client.connect().catch(console.error);
twitch_client.on('message', (channel, tags, message, self) => {
  if(self || !message.startsWith('!')) return;

  const args = message.slice(1).split(' ');
  const command = args.shift().toLowerCase();

  // if (command === 'music') {
  //   songRequestChannel.send(`!${args.join(' ')}`);
  // }

  if (command === 'sr') {
    try {
      const command = client.commands.get('song_request')
      command.execute(args, client);
    } catch (error) {
      console.error(error);
      twitch_client.action(channel, "There was an error executing the command in discord.");
    }
  }

  if (command === 'ping') {
    twitch_client.action(channel, `@${tags.username} pong!`);
  }

  if (command === 'disconnect') {
    twitch_client.disconnect();
  }
});

const express = require('express')
const app = express()
const port = 8080

app.get('/', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  try {
    res.send(healthcheck);
  } catch (e) {
    healthcheck.message = e;
    res.status(503).send();
  }
});

app.listen(port);
