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
    if(cmd[0] === "!shipey" || cmd[0] === "!weapey") {
        let showWeapons = cmd[0] === "!weapey";
        if(cmd.length < 2) {
            msg.channel.send("Usage: <!shipey|!weapey> [color] <shipey | pastebin url | gist url>");
            return;
        }

        if(cmd.length > 2) {
            var color = hexToRgb(colors[cmd[1]]) || hexToRgb(cmd[1]);
            if(!color)
                color = [255, 255, 255];
            cmd.splice(1, 1);
        }
        if(cmd[1].startsWith("http")) {
            getHttp(cmd[1], (shipey) => sendShipey(msg.channel, shipey, color, showWeapons));
        } else {
            sendShipey(msg.channel, cmd[1], color, showWeapons);
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

var sendShipey = (channel, shipey, color, showWeapons = false) => {
    try {
        var spec = JSON.parse(atob(shipey.slice(4)));
    } catch(e) {
        channel.send("Error parsing shipey");
        return;
    }

    let displays = [
        {name: "Name", field: "name", unit: "", fixed: 0},
        {name: "Cost", field: "cost", unit: "", fixed: 0},
        {name: "HP", field: "hp", unit: "", fixed: 0},
        {name: "Mass", field: "mass", unit: "t", fixed: 1},
        {name: "DPS", field: "dps", unit: "", fixed: 1},
        {name: "Damage", field: "damage", unit: "", fixed: 1},
        {name: "Range", field: "range", unit: "m", fixed: 1},
        {name: "Speed", field: "speed", unit: "m/s", fixed: 1},
        {name: "Turn", field: "turnSpeed", unit: "°/s", fixed: 1},
        {name: "E-Gen", field: "genEnergy", unit: "e/s", fixed: 0},
        {name: "E-Store", field: "storeEnergy", unit: "e", fixed: 0},
        {name: "E-Use", field: "allEnergy", unit: "e/s", fixed: 0},
        {name: "Movement E", field: "moveEnergy", unit: "e/s", fixed: 0},
        {name: "Weapon E", field: "fireEnergy", unit: "e/s", fixed: 0},
        {name: "Other E", field: "otherEnergy", unit: "e/s", fixed: 0},
        {name: "Shield", field: "shield", unit: "sh", fixed: 0},
        {name: "Shield Gen", field: "genShield", unit: "sh/s", fixed: 0},
        {name: "Radius", field: "radius", unit: "m", fixed: 1},
        {name: "Jump Distance", field: "jumpDistance", unit: "m", fixed: 1}
    ];

    let weapDisplays = [
        {name: "Mount", field: "mount", unit: "", fixed: 0},
        {name: "DPS", field: "dps", unit: "", fixed: 1},
        {name: "Damage", field: "damage", unit: "", fixed: 1},
        {name: "E-Drain", field: "energyDamage", unit: "e", fixed: 1},
        {name: "Range", field: "range", unit: "m", fixed: 1},
        {name: "Speed", field: "weaponSpeed", unit: "m/s", fixed: 1},
        {name: "Reload", field: "repladTime", unit: "s", fixed: 1},
        {name: "Arc", field: "arc", unit: "°", fixed: 0},
        {name: "E-Use", field: "shotEnergy", unit: "e", fixed: 0},
        {name: "EPS", field: "fireEnergy", unit: "e/s", fixed: 1}
    ];

    let stats = getStats(spec);

    let shipEmbed = new Discord.RichEmbed().setTitle("Stats").setColor(color);
    for(let d of displays) {
        if(shipEmbed.fields.length >= 24) {
            shipEmbed.addField("More", "...", false);
            break;
        }

        let v = stats[d.field];
        if(typeof v === "number") v = v.toFixed(d.fixed);
        if(v && stats[d.field] !== 0) {
            shipEmbed.addField(d.name, v + d.unit, true);
        }
    }

    let msgs = [];
    for(let i in stats.weapons) {
        let msg = "";
        let w = stats.weapons[i];

        for(let d of weapDisplays) {
            let v = w[d.field];
            if(v && w[d.field] !== 0) {
                if(typeof v === "number") v = v.toFixed(d.fixed);
                msg += "**" + d.name + "**: " + v + d.unit + "\n";
            }
        }

        let added = msgs.filter(m => m.title === w.name && m.text === msg);
        if(added.length <= 0)
            msgs.push({title: w.name, text: msg, count: 1});
        else
            added[0].count += 1;
    }

    let weapEmbed = new Discord.RichEmbed().setTitle("Weapons").setColor(color);
    for(let msg of msgs) {
        if(weapEmbed.fields.length >= 24) {
            weapEmbed.addField("More", "...", false);
            break;
        }

        weapEmbed.addField(msg.title + " x" + msg.count, msg.text, true);
    }

    let img = drawShip(spec, stats, color);

    channel.send({file: img}).then(() => {
        channel.send({embed: shipEmbed});
        if(showWeapons && weapEmbed.fields.length > 0)
            channel.send({embed: weapEmbed});
    });
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
