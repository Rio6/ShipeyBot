const Discord = require('discord.js');
const {token} = require('./token.json');

if(process.argv.length < 4) {
    console.error("<channel-id> message");
    process.exit(1);
}

let channelId = process.argv[2];
let message = process.argv.slice(3).join(' ');

let discord = new Discord.Client();
discord.on('ready', async () => {
    const channel = await discord.channels.fetch(channelId);
    await channel.send(message).catch(console.error);
    discord.destroy();
});

discord.on('disconnect', () => {
    process.exit();
});

discord.on('error', e => console.error("Discord error"));

discord.login(token);
