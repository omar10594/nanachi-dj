/**
 * Module Imports
 */
import { Client } from "discord.js";
import { ApiClient } from 'twitch';
import { ClientCredentialsAuthProvider } from 'twitch-auth';
import { DirectConnectionAdapter, EventSubListener } from 'twitch-eventsub';
import { NgrokAdapter } from 'twitch-eventsub-ngrok';

/**
 * Constants
 */
const twitchClientId = process.env.NAGATORO_SAN_TWITCH_CLIENT_ID;
const twitchClientSecret = process.env.NAGATORO_SAN_TWITCH_CLIENT_SECRET;
const discordToken = process.env.NAGATORO_SAN_DISCORD_TOKEN;

/**
 * Discord
 */
const discord_client = new Client({
  disableMentions: "everyone",
  restTimeOffset: 0
});

discord_client.login(discordToken);

discord_client.on("ready", (_data) => {
  console.log(`${discord_client.user.username} ready!`);
  discord_client.user.setActivity(`senpai `, { type: "WATCHING" });
});
discord_client.on("warn", (info) => console.log(info));
discord_client.on("error", console.error);

/**
 * Twitch
 */
const authProvider = new ClientCredentialsAuthProvider(twitchClientId, twitchClientSecret);
const apiClient = new ApiClient({ authProvider });
const listener = new EventSubListener(apiClient, new NgrokAdapter(), 'thisShouldBeARandomlyGeneratedFixedString');

// const listener = new EventSubListener(apiClient, new DirectConnectionAdapter({
//   hostName: 'example.com',
//   sslCert: {
//     key: 'aaaaaaaaaaaaaaa',
//     cert: 'bbbbbbbbbbbbbbb'
//   }
// }), 'thisShouldBeARandomlyGeneratedFixedString');

async function listenChannelEvents(twitchUserId, discordUserId, event, message) {
  const discord_user = await discord_client.users.fetch(discordUserId);

  await listener[`subscribeTo${event}Events`](twitchUserId, e => {
    discord_user.send(message(e));
  });
}

function channelStartedStreamMessage(e) {
  `El canal ${e.broadcasterDisplayName} ha empezado stream en https://twitch.tv/${e.broadcasterDisplayName}`;
}

const user = await apiClient.helix.users.getUserByName('omar10594');

await apiClient.helix.eventSub.deleteAllSubscriptions();

await listenChannelEvents('142110121', '353337058271690755', 'StreamOnline', channelStartedStreamMessage);
await listenChannelEvents('227353789', '353337058271690755', 'StreamOnline', channelStartedStreamMessage);
await listenChannelEvents('462742579', '353337058271690755', 'StreamOnline', channelStartedStreamMessage);
await listenChannelEvents('511200875', '353337058271690755', 'StreamOnline', channelStartedStreamMessage);
await listenChannelEvents('450122015', '364170048677609475', 'StreamOnline', (e) => {
  'Asi que haces stream senpai :smirk:'
});
await listenChannelEvents('167553789', '353337058271690755', 'ChannelUpdate', (e) => {
  'Asi que haces actualizaste la informacion de tu stream senpai :smirk:'
});

await listener.listen();

/**
 * Healthcheck
 */
import express from 'express';

const app = express()
const port = 8181

app.get('/', async (req, res) => {
  const subscriptions = [];
  (await apiClient.helix.eventSub.getSubscriptions()).data.forEach((subscription) => {
    subscriptions.push({ status: subscription.status, type: subscription.type, condition: subscription.condition, transport: subscription._transport })
  });
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    subscriptions: subscriptions
  };
  try {
    res.send(healthcheck);
  } catch (e) {
    healthcheck.message = e;
    res.status(503).send();
  }
});

app.listen(port);