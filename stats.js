const parts = require('./parts.json');

var getStats = module.exports.getStats = (spec) => {
    let stats = {
        hp: 5,
        cost: 0,
        mass: 0,
        thrust: 0,
        turnSpeed: 1,
        genEnergy: 2.5,
        storeEnergy: 0,
        shield: 0,
        genShield: 0,
        jumpCount: 0,
        center: [0, 0],
        radius: 0,
        //dps: 0,
        //damage: 0,
        //range: 0,
        moveEnergy: 0,
        //fireEnergy: 0,
        otherEnergy: 0,
        allEnergy: 0,
        weapons: [],
        //ais: []
    };

    let ix = 0
    let iy = 0
    for(let p of spec.parts) {
        let data = parts[p.type];
        if(!data) continue;

        for(let j in stats) {
            if(data[j]) {
                stats[j] += data[j];
            }
        }

        if(p.type.startsWith("Engine"))
            stats.moveEnergy += data.useEnergy;
        else if(data.damage && !data.explodes) { // Is a weapon
            stats.weapons.push({
                type: p.type,
                name: parts[p.type].name,
                pos: p.pos,
                damage: data.damage,
                dps: 0,
                energyDamage: data.energyDamage,
                range: data.range,
                reloadTime: data.reloadTime,
                bulletSpeed: data.bulletSpeed,
                shotEnergy: data.shotEnergy,
                fireEnergy: 0,
                weaponRange: data.weaponRange,
                weaponRangeFlat: data.weaponRangeFlat,
                weaponDamage: data.weaponDamage,
                weaponSpeed: data.weaponSpeed,
                weaponReload: data.weaponReload,
                weaponEnergy: data.weaponEnergy
            });
        } else if(data.useEnergy) {
            stats.otherEnergy += data.useEnergy;
        }

        ix += data.mass * p.pos[0];
        iy += data.mass * p.pos[1];
    }

    if(stats.mass > 0) {
        stats.center = [ix / stats.mass, iy / stats.mass];
    }

    for(let part of spec.parts) {
        let r = Math.sqrt((part.pos[0] - stats.center[0])**2 + (part.pos[1] - stats.center[1])**2);
        if(r > stats.radius)
            stats.radius = r;
    }
    if(stats.radius > 500)
        stats.radius = 500;

    for(let p of spec.parts) {
        let data = parts[p.type];
        if(!data) continue;

        let ws = [];
        if(p.type.endsWith("Mod"))
            ws = stats.weapons.filter(w => Math.sqrt((p.pos[0] - w.pos[0])**2 + (p.pos[1] - w.pos[1])**2) < 45);
        else if(p.type.startsWith("Mount"))
            ws = stats.weapons.filter(w => Math.sqrt((p.pos[0] - w.pos[0])**2 + (p.pos[1] - w.pos[1])**2) < 20);

        let effect = (1/0.85) * (0.85 ** ws.length);
        for(let w of ws) {
            w.weaponRange *= 1 + (data.weaponRange || 0) / 100 * effect;
            w.weaponRangeFlat += (data.weaponRangeFlat || 0) * effect;
            w.weaponDamage *= 1 + (data.weaponDamage || 0) / 100 * effect;
            w.weaponSpeed += (data.weaponSpeed || 0) / 100 * effect;
            w.weaponReload *= 1 + (data.weaponReload || 0) / 100 * effect;
            w.weaponEnergy *= 1 + (data.weaponEnergy || 0) / 100 * effect;

            if(p.type.startsWith("Mount")) {
                w.mount = parts[p.type].name;
                w.arc = parts[p.type].arc;
            }
        }
    }

    stats.dps = 0;
    stats.damage = 0;
    stats.range = 0;
    stats.fireEnergy = 0;

    for(let w of stats.weapons) {

        w.range *= w.weaponRange;
        w.range += w.weaponRangeFlat;
        w.damage *= w.weaponDamage;
        w.energyDamage *= w.weaponDamage;
        w.bulletSpeed *= w.weaponSpeed;
        w.reloadTime *= w.weaponReload;
        w.shotEnergy *= w.weaponEnergy;

        w.reloadTime = Math.ceil(w.reloadTime) / 16;

        w.fireEnergy = w.shotEnergy / w.reloadTime
        w.dps = w.damage / w.reloadTime

        stats.dps += w.dps;
        stats.damage += w.damage;
        stats.range = Math.max(w.range, stats.range);
        stats.fireEnergy += w.fireEnergy;
    }

    stats.speed = (stats.thrust / stats.mass * 9 * 16);
    stats.jumpDistance = (Math.min(1, 41 * stats.jumpCount / stats.mass) * 500);
    stats.turnSpeed = stats.turnSpeed / stats.mass * 16 * 180 / Math.PI;
    stats.genEnergy *= 16;
    stats.genShield *= 16;
    stats.name = spec.name;
    stats.moveEnergy *= 16;
    stats.otherEnergy *= 16;
    stats.allEnergy = stats.fireEnergy + stats.moveEnergy;// + stats.otherEnergy;

    let buildRules = [
        "Field # at start",
        "Field # at priority #",
        "Try to field # every # seconds",
        "Field # for # of enemy @unitTypes at priority #",
        "Field # for # of ship in slot # at priority #",
        "Field # for # of @needTypes at priority #",
        "Field # when money over # at priority #",
    ];
    stats.ais = [];
    for(let ais of spec.aiRules) {
        if(!buildRules.includes(ais[0])) {
            stats.ais.push(ais);
        }
    }
    for(let ais of spec.aiRules) {
        if(buildRules.includes(ais[0])) {
            stats.ais.push(ais);
        }
    }

    return stats;
}

//console.log(getStats(JSON.parse(process.argv[2])));
