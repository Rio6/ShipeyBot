const Discord = require('discord.js');
const atob = require('atob');
const {http} = require('follow-redirects');
const colors = require('css-color-names');
const {drawShip} = require('./render.js');
const {getStats} = require('./stats.js');
const {token} = require('./token.json');

const helpMsg = `
\`\`\`markdown
Usage: !shipey +[show] -[noshow] [color] [shipey]
where <show> and <noshow> can be one of these:
- s: general stats
- a: ai rules
- w: weapon stats
<color> can be one of the CSS colors or a hex code like \`yellow\` or \`#ffdd00\`
<shipey> can be the shipey string you get from the share menu, a pastebin url, a gist url, or any raw url
Alternatively, include the shipey string in an attachment, shipey bot will use it if no url is provided
[Example](load shipey code from the url and show weapon stats, hiding general stats)
> !shipey +w -s #505050 https://pastebin.com/W1vySkC8
\`\`\`
`;

const discord = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.MessageContent,
    ],
    partials: [
        Discord.Partials.Channel,
        Discord.Partials.Message
    ]
});

discord.on('ready', () => {
    console.log(`${discord.user.tag}` + " ready");
});

discord.on('disconnect', () => {
    process.exit();
});

discord.on('debug', console.info);
discord.on('warn', console.warn);
discord.on('error', console.error);
discord.on('rateLimit', console.warn);

discord.on('messageCreate', msg => {
    if(process.env.DEV && msg.author.tag !== 'r26')
        return;

    let cmd = msg.content.split(/\s+/);
    if(cmd[0] === "!shipey") {

        let attach = msg.attachments.first();
        if(attach) {
            cmd.push(attach.url);
        }

        if(cmd.length < 2) {
            msg.channel.send(helpMsg)
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
            getHttp(cmd[1], (shipey) => sendShipey(msg, shipey, color, showing));
        } else {
            sendShipey(msg, cmd[1], color, showing);
        }
    }
});

discord.on('messageDelete', msg => {

    if(process.env.DEV && msg.author.tag !== 'r26')
        return;

    msg.channel.messages.fetch({ after: msg.id, limit: 20 }).then(shipeyMsgs => {
        shipeyMsgs
            .filter(shipeyMsg => shipeyMsg.author.id === discord.user.id)
            .filter(shipeyMsg => {
                if(shipeyMsg.embeds[0] && shipeyMsg.embeds[0].footer)
                    return shipeyMsg.embeds[0].footer.text === msg.id;
                if(shipeyMsg.attachments.first())
                    return shipeyMsg.attachments.first().name.startsWith(msg.id) === true;
                return false;
            })
            .forEach(shipeyMsg => shipeyMsg.delete());
    });
});

var hexToRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

var sendShipey = (msg, shipey, color, showing) => {
    try {
        var spec = JSON.parse(atob(shipey.slice(4)));
    } catch(e) {
        msg.channel.send("Error parsing shipey");
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

    let content = '';
    let shipEmbed = new Discord.EmbedBuilder().setTitle("Stats");
    for(let d of shipDisplays) {
        let v = stats[d.field];
        if(typeof v === "number") v = v.toFixed(d.fixed);
        if(v && stats[d.field] !== 0) {
            content += "**" + d.name + "**: " + v + d.unit + "\n";
        }
    }
    if(content)
        shipEmbed.setDescription(content);

    content = '';
    let aiEmbed = new Discord.EmbedBuilder().setTitle("AI Rules");
    for(let i = 0; i < Math.min(stats.ais.length, 50); i++) {
        let ais = stats.ais[i];
        let text = ais.shift();
        while(/(#|@\S+)/.test(text)) {
            text = text.replace(/(#|@\S+)/, "`" + ais.shift() + "`");
        }
        content += text + "\n";
    }
    if(content)
        aiEmbed.setDescription(content);

    let contents = [];
    for(let i in stats.weapons) {
        let content = '';
        let w = stats.weapons[i];

        for(let d of weapDisplays) {
            let v = w[d.field];
            if(v && w[d.field] !== 0) {
                if(typeof v === "number") v = v.toFixed(d.fixed);
                content += "**" + d.name + "**: " + v + d.unit + "\n";
            }
        }

        let added = contents.filter(m => m.title === w.name && m.text === content);
        if(added.length <= 0)
            contents.push({title: w.name, text: content, count: 1});
        else
            added[0].count += 1;
    }

    let weapEmbed = new Discord.EmbedBuilder().setTitle("Weapons");
    for(let content of contents) {
        if(weapEmbed.length >= 24) {
            weapEmbed.addFields({
                name: "More",
                value: "...",
                inline: false,
            });
            break;
        }

        weapEmbed.addFields({
            name: content.title + " x" + content.count,
            value: content.text,
            inline: true,
        });
    }

    let img = drawShip(spec, stats, color);
    let embeds = []
    if(showing.stats) embeds.push(shipEmbed);
    if(showing.ais) embeds.push(aiEmbed);
    if(showing.weapons) embeds.push(weapEmbed);

    for(const embed of embeds) {
        embed.setColor(color).setFooter({ text: msg.id });
    }

    msg.channel.send({files: [{
        attachment: img,
        name: `${msg.id}.png`,
    }]}).then(() => {
        msg.channel.send({embeds: embeds});
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
