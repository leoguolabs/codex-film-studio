// Print the two programme illustrations on folded bamboo fans.
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

const W = 900,
  H = 550;
const ribs = 28,
  outer = 465,
  inner = 209;
const origin = [450, 495];
const angles = Array.from(
  { length: ribs + 1 },
  (_, i) => ((-156 + (i * 132) / ribs) * Math.PI) / 180,
);
function point(angle, r) {
  return [origin[0] + Math.cos(angle) * r, origin[1] + Math.sin(angle) * r];
}
function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
}
async function fan(name, offset) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const ends = angles.map((a, i) => point(a, outer - (i % 2) * 6));
  const feet = angles.map((a, i) => point(a, inner - (i % 2) * 3));
  const paper = [...ends, ...feet.slice().reverse()];
  // The leaf is glued over ribs that remain visible between it and the rivet.
  angles.forEach((a, i) => {
    const foot = point(a, inner + 4),
      tip = point(a, 14),
      thickness = i === 0 || i === ribs ? 3.4 : 1.8;
    ctx.strokeStyle = "#805c32";
    ctx.lineWidth = thickness * 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(...tip);
    ctx.lineTo(...foot);
    ctx.stroke();
    ctx.strokeStyle = "#d3b77e";
    ctx.lineWidth = thickness * 0.85;
    ctx.stroke();
  });
  ctx.save();
  polygon(ctx, paper);
  ctx.clip();
  const img = await loadImage(join(__dirname, name + "-print.webp"));
  ctx.drawImage(img, offset, 32, 1140, 500, 9, 24, 876, 367);
  for (let i = 0; i < ribs; i++) {
    const patch = [ends[i], ends[i + 1], feet[i + 1], feet[i]];
    const mid = point((angles[i] + angles[i + 1]) / 2, (outer + inner) / 2);
    const g = ctx.createLinearGradient(
      mid[0] - 12,
      mid[1],
      mid[0] + 12,
      mid[1],
    );
    g.addColorStop(0, i % 2 ? "#392c2c32" : "#fff7ce43");
    g.addColorStop(1, i % 2 ? "#fff7ce09" : "#4033220d");
    polygon(ctx, patch);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(...feet[i]);
    ctx.lineTo(...ends[i]);
    ctx.strokeStyle = "#513e352e";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  polygon(ctx, paper);
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = "#6e674f";
  ctx.stroke();
  for (const i of [0, ribs]) {
    ctx.beginPath();
    ctx.moveTo(...point(angles[i], 4));
    ctx.lineTo(...ends[i]);
    ctx.strokeStyle = "#765532";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#c2a16b";
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(...origin, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = "#4b3530";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(origin[0] - 1, origin[1] - 1, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = "#cca767";
  ctx.fill();
  writeFileSync(
    join(__dirname, name + "-fan.webp"),
    canvas.toBuffer("image/webp", 88),
  );
}
Promise.all([fan("river", 350), fan("orchard", 456)]).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
