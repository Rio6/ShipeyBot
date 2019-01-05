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
        dps: 0,
        weapons: []
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

        if(data.damage) {
            stats.weapons.push({
                type: p.type,
                pos: p.pos,
                damage: data.damage,
                energyDamage: data.energyDamage,
                range: data.range,
                reloadTime: data.reloadTime,
                bulletSpeed: data.bulletSpeed,
                shotEnergy: data.shotEnergy,
                weaponRange: data.weaponRange,
                weaponRangeFlat: data.weaponRangeFlat,
                weaponDamage: data.weaponDamage,
                weaponSpeed: data.weaponSpeed,
                weaponReload: data.weaponReload,
                weaponEnergy: data.weaponEnergy
            });
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
        }
    }

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
    }

    stats.speed = (stats.thrust / stats.mass * 9 * 16);
    stats.jumpDistance = (Math.min(1, 41 * stats.jumpCount / stats.mass) * 500);
    stats.turnSpeed = stats.turnSpeed / stats.mass * 16 * 180 / Math.PI;
    stats.genEnergy *= 16;
    stats.genShield *= 16;

    return stats;
}
