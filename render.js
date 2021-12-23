const Canvas = require('canvas');
const parts = require('./parts.json');
const {size, mappings} = require('./atlas.json'), atlasSize = size;

const NxN = 24;
const SIZE = 20;
const MARGIN = 80;

var atlas = null;

Canvas.loadImage("atlas.png").then((image) => atlas = image);

var drawImage = (ctx, file, x, y, w = SIZE, h = SIZE, dir = 0, flip = false, color, colorMode) => {
    if(!atlas) {
        //console.log("Not ready");
        return;
    }

    let img = getImage(file, flip, color, colorMode);

    if(img != null) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(-dir * Math.PI / 2);
        ctx.translate(-x - w / 2, -y - h / 2);

        ctx.drawImage(img, x, y, w, h);

        ctx.restore();
    }
}

var drawPart = (ctx, name, x, y, dir, color) => {
    if(!parts[name]) {
        //console.log("Unknown part", name);
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

    if(parts[name].northWest && dir % 2 !== 0)
        file = file.replace("N", "W")

    let mode = null;
    if(isDecal(name))
        mode = "color";
    else if(hasColor(name))
        mode = "replace";

    drawImage(ctx, file, xt, yt, wt, ht, dir, flip, color, mode);

    if(name === "JumpEngine")
        drawImage(ctx, "parts/engineJumpPip.png", xt, yt, wt, ht, -dir * Math.PI / 2, flip);
}

var drawShip = module.exports.drawShip = (spec, stats, color = [255, 255, 255, 255]) => {
    let canvas = Canvas.createCanvas(NxN * SIZE + MARGIN, NxN * SIZE + MARGIN);
    let ctx = canvas.getContext('2d');

    // Scale canvas when ship's too big
    let maxSize = minSize = NxN * SIZE / 2;
    for(let p of spec.parts) {
        for(let i = 0; i <= 1; i++) {
            let s = Math.abs(p.pos[i]) + parts[p.type].size[i];
            if(s > maxSize) {
                maxSize = s;
            }
        }
    }

    let scale = maxSize / minSize;
    let translation = [(canvas.width * scale - MARGIN) / 2 - minSize, (canvas.height * scale - MARGIN) / 2 - minSize];
    let rect = [0, 0, canvas.width, canvas.height];
    if(scale > 1) {
        rect = [-translation[0], -translation[1], scale * canvas.width, scale * canvas.height];
        ctx.scale(1/scale, 1/scale);
        ctx.translate(...translation);
    }

    ctx.clearRect(...rect);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#73C1E2";
    ctx.fillRect(...rect);

    ctx.translate(MARGIN / 2, MARGIN / 2);
    ctx.globalCompositeOperation = "multiply";
    for(let i = 0; i < NxN; i++) {
        for(let j = 0; j < NxN; j++) {
            let size = SIZE * .8;
            let offset = SIZE * .1;
            drawImage(ctx, "parts/sel1x1.png", i * SIZE + offset, j * SIZE + offset, size, size);
        }
    }

    ctx.globalCompositeOperation = "source-over";

    if(stats.shield > 0) {

        let r = stats.radius;
        if(scale > 1) { // big ship
            for(let part of spec.parts) {
                let d = Math.sqrt((part.pos[0] - stats.center[0])**2 + (part.pos[1] - stats.center[1])**2);
                if(d > r) r = d;
            }
        }

        r += 40;

        let x = NxN / 2 * SIZE + stats.center[0] - r;
        let y = NxN / 2 * SIZE - stats.center[1] - r;
        drawImage(ctx, "img/point02.png", x, y, r * 2, r * 2, 0, false, color, "color");
    }

    for(let part of spec.parts) {
        drawPart(ctx, part.type, part.pos[0], part.pos[1], part.dir, color);
    }

    //require("child_process").spawn("firefox", [canvas.toDataURL()]);
    return canvas.toBuffer("image/png");
}

var getImage = (file, flip = false, color, colorMode) => {

    if(!mappings[file]) {
        //console.log("not in mappings", file);
        return null;
    }

    let uv = mappings[file].uv;
    let x = uv[0] * atlasSize;
    let y = (1 - uv[1]) * atlasSize;
    let x1 = uv[2] * atlasSize;
    let y1 = (1 - uv[3]) * atlasSize;
    let w = x1 - x;
    let h = y1 - y;

    let cCanvas = Canvas.createCanvas(w, h);
    let cCtx = cCanvas.getContext('2d');

    if(flip)
        cCtx.setTransform(-1, 0, 0, 1, w, 0);

    cCtx.drawImage(atlas, x, y, w, h, 0, 0, w, h);

    if(color && colorMode) {
        let imageData = cCtx.getImageData(0, 0, w, h);
        let data = imageData.data;
        for(let i = 0; i < data.length; i += 4) {
            // I have no idea what these called so I made the name up
            if(colorMode === "color") {
                data[i] = data[i] * color[0] / 255;
                data[i+1] = data[i+1] * color[1] / 255;
                data[i+2] = data[i+2] * color[2] / 255;
                //data[i+3] = 255;
            } else if(colorMode === "replace") {
                if(data[i+1] === data[i+2] && data[i] > data[i+1]) {
                    let p = data[i] / (data[i] + data[i+1] + data[i+2]);
                    let c = (1-p) * data[i+1];
                    data[i] = p * color[0] + c;
                    data[i+1] = p * color[1] + c;
                    data[i+2] = p * color[2] + c;
                }
            }
        }
        cCtx.putImageData(imageData, 0, 0);
    }
    return cCanvas;
};

var isDecal = (name) => {
    return name.includes("Decal") || name.includes("Letter") || name.includes("Stripe");
};

var hasColor = (name) => {
    return !!mappings["parts/red-" + parts[name].image];
};

/*
setTimeout(() => {
    let spec = JSON.parse(process.argv[2]);
    drawShip(spec, {shield:0}, [80, 80, 80, 255]);
}, 500);
*/

//require('repl').start();
