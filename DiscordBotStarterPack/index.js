const Discord = require("discord.js");
const Config = require("./config.json");

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_BANS,
    Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
    Discord.Intents.FLAGS.GUILD_WEBHOOKS,
    Discord.Intents.FLAGS.GUILD_INVITES,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    Discord.Intents.FLAGS.GUILD_PRESENCES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
    Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  ],
});

client.login(Config.botSettings.token);

client.once("ready", () => {
  client.user.setStatus("online"); // online, idle, dnd, offline
  client.user.setActivity("Activity of your bot here");
  console.log(`${client.user.tag} successfully connected to Discord.`);
});

const fs = require("fs");

client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
client.aliases = new Discord.Collection();

fs.readdirSync("./commands").forEach(() => {
  const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const commandMainFile = require(`./commands/${file}`);
    if (commandMainFile.help.name) {
      client.commands.set(commandMainFile.help.name, commandMainFile);
    }
    commandMainFile.help.aliases.forEach((alias) => {
      client.aliases.set(alias, commandMainFile.help.name);
    });
  }
});

client.on("messageCreate", (message) => {
  let client = message.client;
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.toLowerCase().startsWith(Config.botSettings.prefix))
    return;
  const command = message.content
    .toLowerCase()
    .split(" ")[0]
    .slice(Config.botSettings.prefix.length);
  const params = message.content.split(" ").slice(1);
  let cmd;
  if (client.commands.has(command)) {
    cmd = client.commands.get(command);
  } else if (client.aliases.get(command)) {
    cmd = client.commands.get(client.aliases.get(command));
  }
  if (cmd) {
    if (client.cooldowns.has(`${command}_${message.author.id}`)) {
      const finish = client.cooldowns.get(`${command}_${message.author.id}`);
      const date = new Date();
      const remaining = (new Date(finish - date).getTime() / 1000).toFixed(2);
      const cooldownEmbed = new Discord.MessageEmbed()
        .setTitle("Cooldown:")
        .setDescription(
          `>>> **You need to wait \`${remaining}\` seconds to use the command named \`${Config.botSettings.prefix}${command}\` again.**`
        )
        .setColor("RED");
      return message.reply({ embeds: [cooldownEmbed] });
    }
    const finish = new Date();
    finish.setSeconds(finish.getSeconds() + cmd.help.cooldown);
    cmd.run(client, message, params);
    if (cmd.help.cooldown > 0) {
      client.cooldowns.set(`${command}_${message.author.id}`, finish);
      setTimeout(() => {
        client.cooldowns.delete(`${command}_${message.author.id}`);
      }, cmd.help.cooldown * 1000);
    }
  } else {
    const array = [];
    client.commands.forEach((item) => {
      array.push(item.help.name);
      item.help.aliases.forEach((reactor) => array.push(reactor));
    });
    const finder = require("string-similarity").findBestMatch(command, array);
    const result = new Discord.MessageEmbed()
      .setTitle("Commands:")
      .setDescription(
        `>>> **Did you mean? \n \`${Config.botSettings.prefix}${finder.bestMatch.target}\`**`
      )
      .setColor("RED");
    message.reply({ embeds: [result] });
  }
});
