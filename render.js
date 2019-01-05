const {createCanvas, loadImage} = require('canvas');
const parts = require('./parts.json');
const {size, mappings} = require('./atlas.json'), atlasSize = size;

var NxN = 24;
var SIZE = 20;

var atlas = null;

var canvas = createCanvas(NxN * SIZE, NxN * SIZE);
var ctx = canvas.getContext('2d');

loadImage("atlas.png").then((image) => atlas = image);

var drawImage = (file, x, y, w = SIZE, h = SIZE, r = 0, flip = false) => {
    if(!atlas) {
        console.log("Not ready");
        return;
    }

    if(!mappings[file]) {
        console.log("not in mappings", file);
        return;
    }

    let uv = mappings[file].uv;
    let x0 = uv[0] * atlasSize;
    let y0 = (1 - uv[1]) * atlasSize;
    let x1 = uv[2] * atlasSize;
    let y1 = (1 - uv[3]) * atlasSize;
    let ws = x1 - x0;
    let hs = y1 - y0;

    if(flip)
        ctx.setTransform(-1, 0, 0, 1, x + w, y);
    else
        ctx.setTransform(1, 0, 0, 1, x, y);

    ctx.translate(w / 2, h / 2);
    ctx.rotate(flip ? -r : r);
    ctx.translate(-w / 2, -h / 2);

    ctx.drawImage(atlas, x0, y0, ws, hs, 0, 0, w, h);
    ctx.resetTransform();
}

var drawPart = (name, x, y, dir, color) => {
    if(!parts[name]) {
        console.log("Unknown part", name);
        return;
    }

    var file = "parts/" + parts[name].image;
    var size = parts[name].size;

    let wt = size[0] * SIZE;
    let ht = size[1] * SIZE;
    if(name.includes("Turret") || name.includes("Gun")) {
        wt *= 2.3;
        ht *= 2.3;
    }
    let xt = NxN / 2 * SIZE + x - wt / 2;
    let yt = NxN / 2 * SIZE - y - ht / 2;
    let flip = x < 0 && !name.includes("Letter") && !name.includes("Mod");

    drawImage(file, xt, yt, wt, ht, -dir * Math.PI / 2, flip);

    if(dir % 2 === 1) {
        xt += wt / 2 - ht / 2; yt += ht / 2 - wt / 2;
        t = wt; ht = wt; wt = t;
    }

    let changeColor = null;
    /*
    if(isDecal(name)) {
        changeColor = (data, i) => {
            if(data[i] + data[i+1] + data[i+2] === 255 * 3) {
                data[i] = data[i] / 255 * color[0];
                data[i+1] = data[i+1] / 255 * color[1];
                data[i+2] = data[i+2] / 255 * color[2];
            }
        };
    } else if(hasColor(name)) {
    */
    if(isDecal(name) || hasColor(name)) {
        changeColor = (data, i) => {
            if(data[i+1] === data[i+2] && data[i] > data[i+1]) {
                let p = data[i] / (data[i] + data[i+1] + data[i+2]);
                data[i] = p * color[0] + (1-p) * data[i];
                data[i+1] = p * color[1] + (1-p) * data[i+1];
                data[i+2] = p * color[2] + (1-p) * data[i+2];
            }
        }
    }

    let imageData = ctx.getImageData(xt, yt, wt, ht);
    let data = imageData.data;
    if(changeColor) {
        for(let i = 0; i < data.length; i += 4) {
            changeColor(data, i);
        }
    }
    ctx.putImageData(imageData, xt, yt);
}

var drawShip = module.exports.drawShip = (spec, stats, color = [255, 255, 255]) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "source-over";
    for(let i = 0; i < NxN; i++) {
        for(let j = 0; j < NxN; j++) {
            drawImage("parts/sel1x1.png", i * SIZE, j * SIZE, SIZE * .8, SIZE * .8);
        }
    }

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#73C1E2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "source-over";

    if(stats.shield > 0) {
        let r = stats.radius + 40;
        let x = NxN / 2 * SIZE + stats.center[0] - r;
        let y = NxN / 2 * SIZE - stats.center[1] - r;
        drawImage("img/point02.png", x, y, r * 2, r * 2);

        let imageData = ctx.getImageData(x, y, r * 2, r * 2);
        let data = imageData.data;
        for(let i = 0; i < data.length; i += 4) {
            if(255 * 3 - (data[i] + data[i+1] + data[i+2]) < 200) {
                data[i] = (data[i] + color[0]) / 2;
                data[i+1] = (data[i+1] + color[1]) / 2;
                data[i+2] = (data[i+2] + color[2]) / 2;
                data[i+3] = 255;
            }
        }
        ctx.putImageData(imageData, x, y);
    }

    for(let part of spec.parts) {
        drawPart(part.type, part.pos[0], part.pos[1], part.dir, color);
    }

    //require("child_process").spawn("firefox", [canvas.toDataURL()]);
    return canvas.toBuffer("image/png");
}

var isDecal = (name) => {
    return name.includes("Decal") || name.includes("Letter") || name.includes("Stripe");
};

var hasColor = (name) => {
    return !!mappings["parts/red-" + parts[name].image];
};

/*
setTimeout(() => {
    let spec = JSON.parse(process.argv[2]);
    drawShip(spec);
}, 500);
*/

//require('repl').start();
