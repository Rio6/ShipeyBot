const Discord = require('discord.js');
const {token} = require('./token.json');

if(process.argv.length < 5) {
    console.error("server channel message");
    process.exit(1);
}

let serverName = process.argv[2];
let channelName = process.argv[3];
let message = process.argv[4];

let discord = new Discord.Client();
discord.on('ready', () => {
    for(let [_, server] of discord.guilds) {
        if(server.name === serverName) {
            for(let [_, channel] of server.channels) {
                if(channel.type === "text" && channel.name === channelName) {
                    channel.send(message).catch(console.error);
                }
            }
        }
    }

    discord.destroy();
});

discord.on('disconnect', () => {
    process.exit();
});

discord.on('error', e => console.error("Discord error"));

discord.login(token);
