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
            msg.channel.send("```markdown\nUsage: !shipey +[show] -[noshow] [color] shipey\nwhere <show> and <noshow> can be one of these:\n- s: general stats\n- a: ai rules\n- w: weapon stats\n`color` can be one of the CSS colors or a hex code like `yellow` or `#ffdd00`\n`shipey` can be the shipey string you get from the share menu, a pastebin url, a gist url, or any raw url\n[Example](load shipey code from the url and show weapon stats, hiding general stats)\n> !shipey +w -s #505050 https://pastebin.com/W1vySkC8\n```\n")
           return;
        }

        let showing = {stats: true, weapons: false, ais: false};

        while(/^[+-]/.test(cmd[1])) {
            let show = cmd[1].startsWith("+");
            for(let n of cmd[1].slice(1)) {
                switch(n) {
                    case "s":
                        showing.stats = show;
                        break;
                    case "a":
                        showing.ais = show;
                        break;
                    case "w":
                        showing.weapons = show;
                        break;
                }
            }
            cmd.splice(1, 1);
        }

        if(cmd.length > 2) {
            var color = hexToRgb(colors[cmd[1]]) || hexToRgb(cmd[1]);
            if(!color)
                color = [255, 255, 255];
            cmd.splice(1, 1);
        }
        if(cmd[1].startsWith("http")) {
            getHttp(cmd[1], (shipey) => sendShipey(msg.channel, shipey, color, showing));
        } else {
            sendShipey(msg.channel, cmd[1], color, showing);
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

var sendShipey = (channel, shipey, color, showing) => {
    try {
        var spec = JSON.parse(atob(shipey.slice(4)));
    } catch(e) {
        channel.send("Error parsing shipey");
        return;
    }

    let shipDisplays = [
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
        {name: "Speed", field: "bulletSpeed", unit: "m/s", fixed: 1},
        {name: "Reload", field: "reloadTime", unit: "s", fixed: 1},
        {name: "Arc", field: "arc", unit: "°", fixed: 0},
        {name: "E-Use", field: "shotEnergy", unit: "e", fixed: 0},
        {name: "EPS", field: "fireEnergy", unit: "e/s", fixed: 1}
    ];

    let stats = getStats(spec);

    let msg = "";
    let shipEmbed = new Discord.RichEmbed().setTitle("Stats").setColor(color);
    for(let d of shipDisplays) {
        let v = stats[d.field];
        if(typeof v === "number") v = v.toFixed(d.fixed);
        if(v && stats[d.field] !== 0) {
            msg += "**" + d.name + "**: " + v + d.unit + "\n";
        }
    }
    if(msg)
        shipEmbed.setDescription(msg);

    msg = "";
    let aiEmbed = new Discord.RichEmbed().setTitle("AI Rules").setColor(color);
    for(let i = 0; i < Math.min(stats.ais.length, 50); i++) {
        let ais = stats.ais[i];
        let text = ais.shift();
        while(/(#|@\S+)/.test(text)) {
            text = text.replace(/(#|@\S+)/, "`" + ais.shift() + "`");
        }
        msg += text + "\n";
    }
    if(msg)
        aiEmbed.setDescription(msg);

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
    let embeds = []
    if(showing.stats) embeds.push(shipEmbed);
    if(showing.ais) embeds.push(aiEmbed);
    if(showing.weapons) embeds.push(weapEmbed);

    let sendNext = () => {
        if(embeds.length > 0) {
            channel.send({embed: embeds.shift()}).then(sendNext);
        }
    };

    channel.send({file: img}).then(sendNext);
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
