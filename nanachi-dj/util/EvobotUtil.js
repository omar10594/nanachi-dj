exports.canModifyQueue = (member) => {
  const { channelID } = member.voice;
  const botChannel = member.guild.voice.channelID;

  if (channelID !== botChannel) {
    member.send("You need to join the voice channel first!").catch(console.error);
    return;
  }

  return true;
};

exports.DISCORD_TOKEN = process.env.NANACHI_DJ_DISCORD_TOKEN;
exports.DISCORD_PREFIX = process.env.NANACHI_DJ_DISCORD_PREFIX;
exports.TWITCH_CLIENT_ID = process.env.NANACHI_DJ_TWITCH_CLIENT_ID;
exports.TWITCH_CLIENT_SECRET = process.env.NANACHI_DJ_TWITCH_CLIENT_SECRET;
exports.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
exports.SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
exports.MAX_PLAYLIST_SIZE = process.env.MAX_PLAYLIST_SIZE;
exports.PRUNING = process.env.PRUNING;
exports.STAY_TIME = process.env.STAY_TIME;
exports.DEFAULT_VOLUME = process.env.DEFAULT_VOLUME;
