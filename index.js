const Discord = require('discord.js');
const atob = require('atob');
const {http} = require('follow-redirects');
const colors = require('css-color-names');
const {drawShip} = require('./render.js');
const {getStats} = require('./stats.js');
const {token} = require('./token.json');

var discord = new Discord.Client();
discord.on('ready', () => {
    console.log(`${discord.user.tag}` + " ready");
});

discord.on('disconnect', () => {
    process.exit();
});

discord.on('error', e => console.error("Discord error"));

discord.on('message', msg => {
    let cmd = msg.content.split(/ +/);
    if(cmd[0] === "!shipey") {
        if(cmd.length < 2) {
            msg.channel.send("Usage: !shipey [color] <shipey | pastebin url | gist url>");
            return;
        }

        if(cmd.length > 2) {
            var color = hexToRgb(colors[cmd[1]]) || hexToRgb(cmd[1]);
            if(!color)
                color = [255, 255, 255];
            cmd.splice(1, 1);
        }
        if(cmd[1].startsWith("http")) {
            getHttp(cmd[1], (shipey) => sendShipey(msg.channel, shipey, color));
        } else {
            sendShipey(msg.channel, cmd[1], color);
        }
    }
});

var hexToRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

var sendShipey = (channel, shipey, color) => {
    try {
        var spec = JSON.parse(atob(shipey.slice(4)));
    } catch(e) {
        channel.send("Error parsing shipey");
        return;
    }

    let stats = getStats(spec);
    let embed = new Discord.RichEmbed().setColor(color);
    embed.addField("Cost", "$" + stats.cost, true);
    embed.addField("HP", stats.hp, true);
    embed.addField("Mass", stats.mass + "t", true);
    embed.addField("DPS", stats.dps.toFixed(1) + "dmg/s", true);
    embed.addField("Speed", stats.speed.toFixed(1) + "m/s", true);
    embed.addField("Turn", stats.turnSpeed.toFixed(1) + "°/s", true);
    embed.addField("E-Gen", stats.genEnergy.toFixed(1) + "e/s", true);
    embed.addField("E-Store", stats.storeEnergy + "e", true);
    embed.addField("Shield", stats.shield + "sh", true);
    embed.addField("Shield Gen", stats.genShield + "sh/s", true);
    embed.addField("Radius", stats.radius.toFixed(1) + "m", true);
    embed.addField("Jump Distance", stats.jumpDistance.toFixed(0) + "m", true);

    let img = drawShip(spec, stats, color);

    channel.send({file: img, embed: embed});
}

var getHttp = (url, cb) => {

    [host, path] = url.replace(/^http[s]*:\/\//i, "").split(/\/(.+)/);

    if(host === "pastebin.com" && path.match(/[a-zA-Z0-9]{8}/)) {
        path = "raw/" + path;
    } else if(host === "gist.github.com" && path.match(/[a-zA-Z0-9]+\/[a-z0-9]{32}/)) {
        host = "gist.githubusercontent.com";
        path += "/raw";
    }

    http.get({
        host: host,
        path: "/" + path
    }, function(res) {
        var body = "";

        res.on('data', function(d) {
            body += d;
        });

        res.on('end', function() {
            if(cb) cb(body);
        });
    }).on('error', e => cb(null));
}

discord.login(token);
