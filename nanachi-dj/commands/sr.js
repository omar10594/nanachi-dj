const { playSongRequest } = require("../include/play_song_request");
const ytdl = require("ytdl-core");
const YouTubeAPI = require("simple-youtube-api");
const scdl = require("soundcloud-downloader").default;
const https = require("https");
const { YOUTUBE_API_KEY, SOUNDCLOUD_CLIENT_ID, DEFAULT_VOLUME } = require("../util/EvobotUtil");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);

module.exports = {
  name: "song_request",
  cooldown: 3,
  aliases: ["sr"],
  description: "Plays audio from YouTube or Soundcloud in the song request voice channel from Twitch",
  async execute(args, discord_client) {
    const guild = discord_client.guilds.cache.find(guild => guild.name === 'Chilling');
    const text_channel = guild.channels.cache.find(ch => ch.name === 'song-request' && ch.type === 'text');
    const channel = guild.channels.cache.find(ch => ch.name === 'song-request' && ch.type === 'voice');

    const serverQueue = discord_client.queue.get(guild.id);

    if (!args.length)
      return text_channel
        .send(`Usage: ${discord_client.prefix}play <YouTube URL | Video Name | Soundcloud URL>`)
        .catch(console.error);

    const permissions = channel.permissionsFor(discord_client.user);
    if (!permissions.has("CONNECT"))
      return text_channel.send("Cannot connect to voice channel, missing permissions");
    if (!permissions.has("SPEAK"))
      return text_channel.send("I cannot speak in this voice channel, make sure I have the proper permissions!");

    const search = args.join(" ");
    const videoPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
    const playlistPattern = /^.*(list=)([^#\&\?]*).*/gi;
    const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
    const mobileScRegex = /^https?:\/\/(soundcloud\.app\.goo\.gl)\/(.*)$/;
    const url = args[0];
    const urlValid = videoPattern.test(args[0]);

    // Playlist url
    if (!videoPattern.test(args[0]) && playlistPattern.test(args[0])) {
      return text_channel.send("Playlist are not sopported yet for twitch song request");
    } else if (scdl.isValidUrl(url) && url.includes("/sets/")) {
      return text_channel.send("Playlist are not sopported yet for twitch song request");
    }

    if (mobileScRegex.test(url)) {
      try {
        https.get(url, function (res) {
          if (res.statusCode == "302") {
            return discord_client.commands.get("song_request").execute([res.headers.location], discord_client);
          } else {
            return text_channel.send("No content could be found at that url.").catch(console.error);
          }
        });
      } catch (error) {
        console.error(error);
        return text_channel.send(error.message).catch(console.error);
      }
      return text_channel.send("Following url redirection...").catch(console.error);
    }

    const queueConstruct = {
      textChannel: text_channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: DEFAULT_VOLUME || 100,
      playing: true
    };

    let songInfo = null;
    let song = null;

    if (urlValid) {
      try {
        songInfo = await ytdl.getInfo(url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds
        };
      } catch (error) {
        console.error(error);
        return text_channel.send(error.message).catch(console.error);
      }
    } else if (scRegex.test(url)) {
      try {
        const trackInfo = await scdl.getInfo(url, SOUNDCLOUD_CLIENT_ID);
        song = {
          title: trackInfo.title,
          url: trackInfo.permalink_url,
          duration: Math.ceil(trackInfo.duration / 1000)
        };
      } catch (error) {
        console.error(error);
        return text_channel.send(error.message).catch(console.error);
      }
    } else {
      try {
        const results = await youtube.searchVideos(search, 1, { part: "snippet" });
        songInfo = await ytdl.getInfo(results[0].url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds
        };
      } catch (error) {
        console.error(error);
        return text_channel.send(error.message).catch(console.error);
      }
    }

    if (serverQueue) {
      serverQueue.songs.push(song);
      return serverQueue.textChannel
        .send(`✅ **${song.title}** has been added to the queue by a twitch user`)
        .catch(console.error);
    }

    queueConstruct.songs.push(song);
    discord_client.queue.set(guild.id, queueConstruct);

    try {
      queueConstruct.connection = await channel.join();
      await queueConstruct.connection.voice.setSelfDeaf(true);
      playSongRequest(queueConstruct.songs[0], discord_client, guild, text_channel);
    } catch (error) {
      console.error(error);
      discord_client.queue.delete(guild.id);
      await channel.leave();
      return text_channel.send(`Could not join the channel: ${error}`).catch(console.error);
    }
  }
};
