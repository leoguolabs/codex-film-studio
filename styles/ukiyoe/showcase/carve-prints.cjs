// Rebuild the showcase plates with Node and @napi-rs/canvas, from this directory.
// NODE_PATH may point to an existing installation. No film frames or fonts are required.
const { createCanvas, Path2D } = require("@napi-rs/canvas");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const W = 1680,
  H = 680;
const pigment = {
  paper: "#eee0b9",
  ink: "#263534",
  blue: "#23475c",
  mist: "#b3beb0",
  sky: "#709ca2",
  light: "#c5cbb4",
  shade: "#406578",
  water: "#5b888e",
  dark: "#273f4c",
  rust: "#b64b35",
  gold: "#cfab66",
  moss: "#6f805d",
};
let ctx, pass, seed;
function random() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function paint(name) {
  const blocks = {
    blue: 2,
    mist: 2,
    sky: 2,
    light: 2,
    shade: 2,
    water: 2,
    dark: 2,
    gold: 3,
    moss: 3,
    rust: 4,
  };
  return !name
    ? null
    : (blocks[name] || 1) <= pass
      ? pigment[name]
      : pigment.paper;
}
function shape(path, fill, stroke, width = 1.6) {
  const p = typeof path === "string" ? new Path2D(path) : path;
  if (fill) {
    ctx.fillStyle = paint(fill);
    ctx.fill(p);
  }
  if (stroke) {
    ctx.strokeStyle = paint(stroke);
    ctx.lineWidth = width;
    ctx.stroke(p);
  }
}
function ellipse(x, y, rx, ry, fill, stroke, width = 1.5) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  shape(p, fill, stroke, width);
}
function clip(path, draw) {
  ctx.save();
  ctx.clip(new Path2D(path));
  draw();
  ctx.restore();
}
function cloud(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * 0.73);
  const outline =
    "M-155 15 Q-124 9 -85 9 Q-80 -5 -54 -2 Q-50 -22 -24 -18 C-4 -42 29 -33 38 -18 Q60 -23 73 -10 Q97 -13 106 1 Q134 0 147 5 L101 9 L157 12 Q118 19 40 18 L-4 23 L-142 22 L-46 16Z";
  shape(outline, "paper", "shade", 1.6);
  shape(
    "M-61 7 Q-55 -2 -34 0 Q-31 -12 -16 -11 M-15 -19 Q1 -30 16 -24 M54 0 Q71 -4 78 3 M-78 13 Q-28 11 16 14 M23 8 Q51 6 73 8",
    null,
    "shade",
    1,
  );
  ctx.restore();
}
function hill(points, base, detail) {
  const p = new Path2D();
  p.moveTo(-10, H);
  for (const [x, y] of points) p.lineTo(x, y);
  p.lineTo(W + 10, H);
  p.closePath();
  shape(p, base, "blue", 1.4);
  ctx.save();
  ctx.clip(p);
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i],
      [bx, by] = points[i + 1];
    for (let j = 0; j < (bx - ax) / 7; j++) {
      const t = random(),
        x = ax + (bx - ax) * t,
        y = ay + (by - ay) * t + random() * 6;
      const len = 10 + random() * 40;
      shape(
        "M" + x + " " + y + "q-9 11 -" + len + " " + len * 0.7,
        null,
        detail,
        0.75 + random() * 0.8,
      );
    }
  }
  ctx.restore();
}
function house(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  shape("M-24 -20 L17 -23 L27 -10 L26 0 L-23 2Z", "paper", "ink", 1.35);
  shape(
    "M-32 -16 Q-17 -22 -8 -35 L11 -35 L33 -19 L22 -17 L6 -29 L-5 -18Z",
    "shade",
    "ink",
    1.35,
  );
  for (let i = 0; i < 6; i++)
    shape("M" + (-22 + i * 4) + " -19l12 -13", null, "paper", 0.85);
  shape("M-13 1v-11h7v11 M11 0v-9h6v9", null, "ink", 2);
  ctx.restore();
}
function landscape(orchard) {
  const g = ctx.createLinearGradient(0, 0, 0, 440);
  for (const [t, c] of [
    [0, "shade"],
    [0.21, "sky"],
    [0.6, "light"],
    [1, "paper"],
  ])
    g.addColorStop(t, paint(c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ellipse(1215, 168, 113, 112, "rust");
  clip("M1102 168a113 112 0 1 0 226 0a113 112 0 1 0 -226 0Z", () => {
    for (let i = 0; i < 75; i++) {
      let x = 1100 + random() * 230,
        y = 52 + random() * 230;
      ctx.globalAlpha = 0.18;
      shape(
        "M" + x + " " + y + "l" + (4 + random() * 32) + " -1",
        null,
        "paper",
        0.8,
      );
    }
    ctx.globalAlpha = 1;
  });
  cloud(290, 153, 1.27);
  cloud(770, 131, 0.81);
  cloud(1341, 94, 0.9);
  cloud(1553, 224, 1.34);
  cloud(598, 235, 0.48);
  hill(
    [
      [-15, 393],
      [100, 358],
      [188, 363],
      [254, 327],
      [353, 345],
      [477, 296],
      [553, 319],
      [647, 305],
      [724, 318],
      [794, 288],
      [829, 278],
      [867, 290],
      [992, 214],
      [1024, 198],
      [1057, 192],
      [1070, 187],
      [1110, 202],
      [1196, 261],
      [1280, 308],
      [1377, 284],
      [1479, 263],
      [1574, 296],
      [1690, 260],
    ],
    "mist",
    "shade",
  );
  shape(
    "M904 272 L992 214 1024 198 1057 192 1070 187 1110 202 1180 251 1129 231 1146 251 1100 220 1109 240 1077 210 1031 240 1048 211 1010 229 1017 214 971 239 978 224Z",
    "paper",
    "shade",
    0.85,
  );
  hill(
    [
      [-15, 425],
      [83, 379],
      [146, 392],
      [219, 369],
      [268, 374],
      [336, 345],
      [415, 360],
      [460, 355],
      [552, 382],
      [646, 356],
      [742, 386],
      [842, 354],
      [929, 339],
      [998, 355],
      [1093, 318],
      [1184, 345],
      [1285, 325],
      [1393, 355],
      [1490, 332],
      [1566, 351],
      [1690, 320],
    ],
    "sky",
    "blue",
  );
  hill(
    [
      [-15, 436],
      [81, 395],
      [192, 417],
      [316, 389],
      [422, 416],
      [509, 402],
      [592, 421],
      [688, 400],
      [764, 417],
      [871, 385],
      [947, 399],
      [1026, 391],
      [1130, 361],
      [1212, 390],
      [1275, 381],
      [1361, 408],
      [1463, 379],
      [1554, 392],
      [1690, 365],
    ],
    "moss",
    "blue",
  );
  shape(
    "M-10 448 Q241 420 465 439 T905 423 Q1232 405 1685 418 V690 H-10Z",
    "water",
    "blue",
    2,
  );
  for (let j = 0; j < 750; j++) {
    let x = random() * W,
      y = 430 + random() * 245,
      len = (8 + random() * 70) * (y / 550);
    shape(
      "M" + x + " " + y + "q" + len * 0.4 + " -2 " + len + " -1",
      null,
      random() < 0.54 ? "light" : "shade",
      0.65 + random() * 1.3,
    );
  }
  shape(
    "M-10 454 Q318 410 568 430 T998 412 Q1282 388 1688 402 L1688 425 Q1340 418 1097 434 Q959 451 808 442 Q668 429 385 447 Q128 448 -9 475Z",
    "gold",
    "blue",
    2,
  );
  for (let i = 0; i < 47; i++) {
    let x = i * 39 + random() * 24,
      y = 435 - (28 * x) / W + Math.sin(x / 105) * 4;
    house(x, y, 0.37 + random() * 0.32);
  }
  // Arched timber bridge with separately cut rails and uprights.
  const yBridge = (x) => 505 - 51 * Math.sin((Math.PI * (x - 720)) / 580);
  for (let x = 738; x < 1300; x += 48) {
    let y = yBridge(x);
    shape("M" + x + " " + y + " l2 48 h5 l-1 -48Z", "blue", "ink", 1);
    shape("M" + (x + 4) + " " + (y + 30) + "l40 -24", null, "blue", 2);
  }
  shape(
    "M717 507 Q1008 397 1304 506 L1303 514 Q1008 405 718 515Z",
    "gold",
    "ink",
    2.4,
  );
  shape("M718 494 Q1008 384 1304 493", null, "ink", 3);
  for (let x = 722; x < 1304; x += 19) {
    const t = (x - 717) / 587,
      y = 506 - 218 * t * (1 - t);
    shape("M" + x + " " + (y - 15) + "v18", null, "ink", 1.6);
  }
  if (!orchard) foregroundWater();
}
function foregroundWater() {
  for (let row = 0; row < 4; row++) {
    let base = 584 + row * 27;
    let p = "M-55 690 L-55 " + base;
    for (let x = -55; x < W + 60; x += 123) {
      const y = base + 17 * Math.sin(x / 219 + row * 0.5);
      p +=
        " Q" +
        (x + 34) +
        " " +
        (y + 23) +
        " " +
        (x + 65) +
        " " +
        (y + 2) +
        " Q" +
        (x + 94) +
        " " +
        (y - 18) +
        " " +
        (x + 123) +
        " " +
        (y - 9);
    }
    shape(p + " L1740 700Z", row % 2 ? "blue" : "shade", "light", 2.8);
    for (let j = 0; j < 65; j++) {
      let x = random() * W,
        y = base + 12 + 20 * Math.sin(x / 219 + row * 0.5);
      shape("M" + x + " " + y + "q12 4 28 -2", null, "light", 1.2);
    }
  }
}
function carp() {
  ctx.save();
  ctx.translate(666, 277);
  ctx.rotate(-0.105);
  ctx.scale(1.12, 1.12);
  // A cotton streamer opens at the hoop and puckers into a split tail.
  const body =
    "M0 -55 C80 -105 158 -101 239 -70 C345 -30 397 -4 493 -14 Q525 -16 555 -32 Q541 -8 505 11 Q545 24 582 10 Q551 49 495 49 C409 53 336 55 259 64 C162 80 76 81 1 52 Q-16 1 0 -55Z";
  shape(
    "M109 -80 Q160 -142 231 -115 Q220 -103 251 -99 Q263 -91 273 -66 L224 -51Z",
    "rust",
    "ink",
    2.5,
  );
  for (let i = 0; i < 10; i++)
    shape(
      "M" + (144 + i * 10) + " " + (-98 - Math.sin(i / 3) * 17) + "q4 18 26 36",
      null,
      "paper",
      1.4,
    );
  shape(
    "M190 64 Q245 124 317 94 Q304 89 298 78 Q284 64 265 50Z",
    "rust",
    "ink",
    2,
  );
  for (let i = 0; i < 7; i++)
    shape("M" + (211 + i * 8) + " 63q16 24 43 32", null, "paper", 1.3);
  shape(body, "blue", "ink", 4);
  clip(body, () => {
    shape(
      "M0 37 Q138 67 260 38 T498 23 L590 17 L590 94 H0Z",
      "light",
      "ink",
      1.4,
    );
    for (let i = 0; i < 16; i++) {
      const x = 120 + i * 24;
      for (let j = -4; j < 5; j++) {
        const y = j * 25 + (i % 2) * 12.5;
        const r = Math.max(6, 17 - (x - 120) * 0.019);
        shape(
          "M" + x + " " + (y - r) + "q" + r * 1.7 + " " + r + " 0 " + 2 * r,
          null,
          "paper",
          2.7,
        );
        shape(
          "M" +
            (x + 2) +
            " " +
            (y - r * 0.62) +
            "q" +
            r +
            " " +
            r * 0.6 +
            " 0 " +
            r * 1.24,
          null,
          "sky",
          1.1,
        );
      }
    }
    shape(
      "M-13 -86 Q68 -109 117 -72 Q146 -39 132 -7 Q122 36 76 57 L-11 56Z",
      "paper",
      "ink",
      3,
    );
    shape("M-8 -56 Q45 -84 94 -71 L73 -56 Q29 -58 -6 -34Z", "rust", "ink", 1.4);
    shape("M1 40 Q65 42 101 4 Q91 32 65 51 Q29 57 -5 50Z", "rust", "ink", 1.6);
    shape(
      "M96 -59 Q129 -12 95 29 M104 -53 Q132 -12 104 22 M17 4 Q28 24 55 21 M23 8 L38 13 M47 32 Q68 29 80 17",
      null,
      "blue",
      2,
    );
    for (let i = 0; i < 11; i++)
      shape(
        "M" +
          (424 + i * 7) +
          " " +
          (-3 + i * 0.7) +
          "Q497 " +
          (-3 + i * 1.7) +
          " " +
          (572 - i * 2) +
          " " +
          (-26 + i * 7),
        null,
        "paper",
        1.2,
      );
  });
  ellipse(55, -27, 25, 24, "gold", "ink", 2.8);
  ellipse(55, -27, 17.5, 17, "ink", "paper", 2.4);
  ellipse(50, -33, 5.3, 6, "paper");
  ellipse(1, -1, 12.5, 54, "rust", "ink", 2.8);
  ellipse(-1, -1, 5.6, 46, "dark", "paper", 1.4);
  shape(
    "M109 15 Q132 4 152 14 Q179 23 198 21 Q174 49 142 47 Q126 43 109 15Z",
    "gold",
    "ink",
    2.6,
  );
  for (let i = 0; i < 6; i++)
    shape(
      "M115 17 Q142 " + (23 + i * 4) + " " + (186 - i * 5) + " " + (25 + i * 3),
      null,
      "ink",
      1,
    );
  ctx.restore();
  shape(
    "M657 216 Q639 254 607 288 Q635 306 665 336 M607 288 Q571 240 549 195",
    null,
    "ink",
    2,
  );
  shape("M524 587 L545 191 Q548 185 551 193 L536 590Z", "gold", "ink", 2.2);
  ellipse(548, 191, 6, 6, "rust", "ink", 1);
}
function sprig(x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  for (let i = 0; i < 49; i++) {
    let a = -2.92 + i * 0.057 + (random() - 0.5) * 0.1,
      len = 35 + random() * 42;
    let ex = Math.cos(a) * len,
      ey = Math.sin(a) * len;
    shape(
      "M0 0Q" + ex * 0.62 + " " + ey * 0.72 + " " + ex + " " + ey,
      null,
      i % 4 ? "dark" : "moss",
      1.1 + random() * 1.3,
    );
  }
  ctx.restore();
}
function pines() {
  ctx.save();
  ctx.translate(1690, 17);
  shape(
    "M0 0 Q-84 13 -154 45 Q-202 69 -263 56 L-300 40 Q-267 74 -221 74 Q-174 80 -124 60 Q-77 46 -55 45 Q-24 43 0 50Z",
    "dark",
    "ink",
    2,
  );
  shape(
    "M-75 40 Q-144 84 -160 117 Q-177 143 -235 150 Q-175 157 -151 130 Q-107 89 -34 58Z",
    "dark",
    "ink",
    2,
  );
  shape(
    "M-8 18Q-88 32 -140 55T-250 64 M-37 29Q-118 48 -173 65 M-78 62Q-140 98 -155 124",
    null,
    "gold",
    1.4,
  );
  for (let i = 0; i < 24; i++) {
    const x = -42 - random() * 290,
      branch = x < -176 ? 64 : 44;
    let y = branch + random() * 22;
    sprig(x, y, random() * 0.7 - 0.35, 0.61 + random() * 0.66);
  }
  for (let i = 0; i < 8; i++)
    sprig(
      -152 - i * 13,
      130 + i * 2,
      random() * 0.5 - 0.25,
      0.58 + random() * 0.5,
    );
  ctx.restore();
}
function leaf(x, y, a, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  shape("M0 0 Q17 -25 46 -8 Q28 8 0 0Z", "moss", "ink", 1.7);
  shape("M0 0Q18 -7 39 -8 M13 -4l5 -9 M21 -6l6 6", null, "ink", 1);
  ctx.restore();
}
function pear(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shape(
    "M0 -3 Q-13 -3 -18 14 C-21 33 -50 42 -52 66 C-61 105 -16 123 23 113 C62 108 70 78 55 56 C44 36 27 28 23 12 Q19 -5 4 -2Z",
    "gold",
    "ink",
    3.1,
  );
  shape("M3 -2 Q7 -25 21 -34", null, "ink", 4.2);
  clip(
    "M0 -3 Q-13 -3 -18 14 C-21 33 -50 42 -52 66 C-61 105 -16 123 23 113 C62 108 70 78 55 56 C44 36 27 28 23 12 Q19 -5 4 -2Z",
    () => {
      for (let i = 0; i < 260; i++) {
        let px = random() * 130 - 65,
          py = random() * 130;
        if (px < 0 && random() < 0.7) continue;
        ellipse(px, py, random() * 1.2 + 0.5, 0.8, "shade");
      }
    },
  );
  shape("M-29 51Q-45 70 -38 83 M-34 54l-5 10", null, "paper", 3.4);
  ctx.restore();
}
function orchardBough() {
  shape(
    "M1690 -20 Q1523 40 1450 58 Q1304 99 1200 93 Q1104 84 1018 114 Q922 145 752 134 Q683 123 614 143 Q703 143 755 153 Q931 172 1034 137 Q1120 113 1196 123 Q1327 145 1453 95 Q1597 45 1695 44Z",
    "dark",
    "ink",
    3,
  );
  shape(
    "M1690 1 Q1521 57 1442 77 T1200 107 Q1128 100 1051 119 M1463 78Q1369 118 1294 117 M1005 136Q914 155 806 148",
    null,
    "gold",
    2,
  );
  const twigs = [
    [790, 145, 752, 190, 0.79],
    [930, 148, 907, 207, 0.65],
    [1106, 110, 1054, 190, 1.0],
    [1161, 112, 1200, 184, 0.75],
    [1364, 110, 1340, 211, 1.17],
    [1478, 76, 1512, 160, 0.78],
  ];
  for (const [x, y, tx, ty, s] of twigs) {
    shape(
      "M" +
        x +
        " " +
        y +
        "Q" +
        (tx + 15) +
        " " +
        (y + 12) +
        " " +
        tx +
        " " +
        ty,
      null,
      "ink",
      3.4,
    );
    pear(tx - 15 * s, ty + 28 * s, s);
    leaf(tx + 2, ty - 10, -0.29, 1.5 * s);
    leaf(tx + 7, ty - 29, 2.64, 1.18 * s);
  }
  for (let i = 0; i < 51; i++) {
    let x = 690 + random() * 965;
    let y = 146 - (x - 690) * 0.07 + Math.sin(x / 159) * 13;
    let sign = i % 2 ? 1 : -1;
    shape(
      "M" + x + " " + y + "q-13 " + sign * 28 + " -32 " + sign * 34,
      null,
      "ink",
      1.8,
    );
    leaf(x - 30, y + sign * 34, sign > 0 ? 2.7 : 3.65, 0.56 + random() * 0.92);
  }
  foregroundWater();
}
function distress() {
  const data = ctx.getImageData(0, 0, W, H),
    a = data.data;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4,
        r = random(),
        n =
          (r - 0.5) * 12 +
          Math.sin(x * 0.017 + Math.sin(y * 0.009)) * 1.6 +
          Math.sin(y * 0.83) * 1.35;
      const speck = r > 0.988 ? 0.18 : 0.009;
      for (let c = 0; c < 3; c++)
        a[i + c] = a[i + c] * (1 - speck) + [236, 220, 181][c] * speck + n;
    }
  ctx.putImageData(data, 0, 0);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 9200; i++) {
    const x = random() * W,
      y = random() * H,
      len = 2 + random() ** 4 * 44;
    shape(
      "M" + x + " " + y + "q" + len * 0.6 + " -1 " + len + " -.5",
      null,
      i % 6 ? "paper" : "ink",
      0.3 + random() * 0.6,
    );
  }
  ctx.globalAlpha = 1;
}
function print(orchard, stage, file, format) {
  const canvas = createCanvas(W, H);
  ctx = canvas.getContext("2d");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  pass = stage;
  seed = 17743;
  landscape(orchard);
  if (orchard) orchardBough();
  else {
    ctx.save();
    if (format === "portrait") {
      ctx.translate(343, 90);
      ctx.scale(0.76, 0.76);
    }
    carp();
    ctx.restore();
    pines();
  }
  distress();
  if (format === "portrait") {
    const portrait = createCanvas(740, H);
    portrait.getContext("2d").drawImage(canvas, 630, 0, 740, H, 0, 0, 740, H);
    writeFileSync(join(__dirname, file), portrait.toBuffer("image/webp", 85));
  } else if (format === "detail") {
    const small = createCanvas(968, 430);
    small.getContext("2d").drawImage(canvas, 579, 84, 720, 320, 0, 0, 968, 430);
    writeFileSync(join(__dirname, file), small.toBuffer("image/webp", 83));
  } else
    writeFileSync(join(__dirname, file), canvas.toBuffer("image/webp", 85));
}
print(false, 4, "river-print.webp", "wide");
print(true, 4, "orchard-print.webp", "wide");
for (let stage = 1; stage <= 4; stage++)
  print(false, stage, "impression-" + stage + ".webp", "detail");

print(false, 4, "river-portrait.webp", "portrait");
print(true, 4, "orchard-portrait.webp", "portrait");
