// The two cut lines are traced in the original 1774 × 887 jacket coordinates.
// The full print remains available as the still cover.
const flake = new Path2D(`
  M899 181 896 175 890 169 891 163 883 155 879 153 866 151 860 155 856 155 851 161 847 161
  843 164 842 157 839 154 843 145 844 138 840 131 839 126 831 118 828 118 822 114 814 114
  810 116 803 124 798 119 791 116 778 117 769 123 754 138 749 148 748 165 750 170 755 175
  755 181 760 187 759 188 749 187 747 189 737 189 726 196 721 202 721 207 718 210 715 218
  716 228 722 241 726 244 732 248 751 249 761 243 764 251 774 259 788 261 797 260 803 258
  807 254 809 247 815 246 822 239 821 230 823 228 828 228 833 232 839 231 845 235 866 234
  873 230 877 225 883 222 889 215 889 203 896 197 899 191Z
  M695 166 Q713 166 730 177 Q708 175 695 171Z
  M856 131 Q857 118 870 102 Q868 118 859 131Z
  M887 141 Q894 128 916 125 Q903 136 887 141Z
  M909 199 Q928 199 937 208 Q922 205 909 204Z
  M905 218 Q920 219 927 234 Q914 227 905 221Z
  M678 261 Q689 244 711 241 Q695 251 678 261Z
  M713 290 Q716 275 730 262 Q726 277 713 290Z
  M740 299 Q736 282 747 269 Q745 286 740 299Z`);
const samara = new Path2D(`
  M1384 233 1374 232 1368 234 1345 255 1333 272 1326 286 1322 291 1299 348 1282 375
  1267 391 1254 400 1250 400 1247 398 1235 398 1222 404 1218 408 1213 419 1213 427
  1215 435 1218 435 1228 442 1244 442 1253 438 1259 432 1261 427 1277 414 1310 400
  1345 382 1365 368 1385 348 1394 334 1399 323 1404 306 1406 291 1406 277 1403 260 1395 242Z`);

const clamp = (value) => Math.max(0, Math.min(1, value));
const turn = Math.PI * 2;
function surface(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Keep the edge, paper tooth and even the tiny pencil accents from the print.
// The patch below each lifted piece borrows unmarked paper from the same sheet.
function liftPiece(image, ground, outline, box, paper) {
  const [x, y, width, height] = box;
  function stencil(lineWidth, feather) {
    const tile = surface(width, height);
    const ctx = tile.getContext("2d");
    ctx.translate(-x, -y);
    ctx.lineJoin = "round";
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = feather;
    ctx.shadowColor = "#000";
    ctx.fill(outline);
    ctx.stroke(outline);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.globalCompositeOperation = "source-in";
    return { tile, ctx };
  }
  const cut = stencil(2, 0);
  cut.ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const hole = stencil(8, 6);
  hole.ctx.drawImage(image, ...paper, width, height, 0, 0, width, height);
  ground.drawImage(hole.tile, x, y);
  return cut.tile;
}

// The first impact is on the top of the cob. A shorter second hop has less lift.
function kernelAt(progress) {
  const first = clamp(progress / 0.6);
  const bounce = clamp((progress - 0.6) / 0.4);
  const impact = Math.max(0, 1 - Math.abs(progress - 0.6) / 0.065);
  return {
    x: 807 + 197 * first + 106 * bounce,
    y:
      188 +
      217 * first -
      720 * first * (1 - first) +
      36 * bounce -
      196 * bounce * (1 - bounce),
    angle: -0.67 * Math.sin(Math.PI * first) + 0.36 * first + 0.31 * bounce,
    size: 1 - 0.22 * first - 0.07 * bounce,
    squash: 1 - 0.15 * impact,
  };
}
function seedAt(progress) {
  const phase = turn * 1.52 * progress;
  return {
    x:
      1238 +
      250 * progress +
      81 * Math.sin(turn * progress) * Math.sin(Math.PI * progress),
    y: 420 + 140 * progress + 24 * progress * progress - 12 * Math.sin(phase),
    phase,
    size: 1 - 0.24 * progress,
  };
}
function imprint(ctx, cut, pose, pivotX, pivotY) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.size, pose.size * pose.squash);
  ctx.rotate(pose.angle);
  ctx.drawImage(cut, -pivotX, -pivotY);
  ctx.restore();
}
// Project a banked wing sweeping around its heavy nut. As the wing turns
// toward the viewer it gets shorter; the round nut keeps its own silhouette.
function rotateWing(ctx, wing, nut, pose) {
  const restAngle = Math.atan2(-187, 140);
  const c = Math.cos(pose.phase),
    s = Math.sin(pose.phase);
  const axisX = Math.cos(restAngle) * c - 0.8 * s;
  const axisY = -0.42 + (Math.sin(restAngle) + 0.42) * c - 0.26 * s;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.size, pose.size);
  ctx.save();
  ctx.rotate(Math.atan2(axisY, axisX));
  ctx.scale(Math.hypot(axisX, axisY), 0.53 + 0.47 * c ** 2);
  ctx.rotate(-restAngle);
  ctx.drawImage(wing, 1199 - 1238, 217 - 420);
  ctx.restore();
  ctx.rotate(0.2 * s);
  ctx.scale(0.87 + 0.13 * c ** 2, 1);
  ctx.drawImage(nut, 1208 - 1238, 392 - 420);
  ctx.restore();
}
function drawTrail(ctx, at, progress, hue, dash) {
  const until = Math.max(0, progress - 0.035);
  const start = at(0);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let n = 1; n / 88 < until; n++) {
    const t = n / 88,
      point = at(t);
    ctx.lineTo(
      point.x + Math.sin(n * 2.4) * 0.58,
      point.y + Math.cos(n * 1.7) * 0.65,
    );
  }
  const end = at(until);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = hue;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}
function preparePrint(image, canvas) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  const ground = surface(canvas.width, canvas.height);
  const base = ground.getContext("2d");
  base.drawImage(image, 0, 0);
  const popCut = liftPiece(image, base, flake, [669, 95, 273, 216], [395, 97]);
  const seedCut = liftPiece(
    image,
    base,
    samara,
    [1199, 217, 222, 241],
    [443, 260],
  );
  const nut = surface(59, 57);
  const bulb = nut.getContext("2d");
  bulb.translate(-1208, -392);
  const hub = new Path2D(
    "M1213 427 Q1211 410 1228 401 Q1247 390 1258 407 Q1269 424 1253 438 Q1235 450 1217 435Z",
  );
  bulb.clip(hub);
  bulb.drawImage(seedCut, 1199, 217);
  const blade = seedCut.getContext("2d");
  blade.save();
  blade.translate(-1199, -217);
  blade.globalCompositeOperation = "destination-out";
  blade.fill(hub);
  blade.restore();
  return (progress) => {
    if (progress === 0) {
      ctx.drawImage(image, 0, 0);
      return;
    }
    ctx.drawImage(ground, 0, 0);
    drawTrail(ctx, kernelAt, progress, "rgba(103,77,49,.55)", [3, 9]);
    drawTrail(ctx, seedAt, progress, "rgba(157,82,45,.57)", [15, 7, 2, 7]);
    imprint(ctx, popCut, kernelAt(progress), 807 - 669, 188 - 95);
    rotateWing(ctx, seedCut, nut, seedAt(progress));
  };
}

async function mountCover() {
  const track = document.querySelector(".cover-reel");
  const stage = track.querySelector(".cover");
  const image = track.querySelector(".cover-art");
  const canvas = track.querySelector("canvas");
  if (!window.ResizeObserver || !canvas.getContext("2d", { alpha: false })) {
    document.documentElement.classList.remove("pencil-flight");
    return;
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let draw,
    start = 0,
    travel = 1,
    position = 0,
    frame = 0,
    previous = 0;
  function target() {
    return clamp((scrollY - start) / travel);
  }
  function paint(now) {
    frame = 0;
    if (!draw || reduced.matches) return;
    const desired = target(),
      distance = desired - position;
    const dt = previous ? Math.min(now - previous, 48) : 16;
    previous = now;
    if (
      Math.abs(distance) < 0.0006 ||
      scrollY > start + travel + stage.clientHeight / 2
    ) {
      position = desired;
    } else {
      // Native scroll remains free. Only the moving pencil marks ease into place.
      const step = Math.min(
        Math.abs(distance) * (1 - Math.exp(-dt / 50)),
        dt / 1450,
      );
      position += Math.sign(distance) * step;
    }
    draw(position);
    if (position !== desired) frame = requestAnimationFrame(paint);
    else previous = 0;
  }
  function schedule() {
    if (draw && !reduced.matches && !frame && target() !== position)
      frame = requestAnimationFrame(paint);
  }
  function measure() {
    const top = track.getBoundingClientRect().top + scrollY;
    start = Math.max(0, top - document.querySelector(".mast").offsetHeight);
    const pinnedDistance = track.offsetHeight - stage.offsetHeight;
    travel =
      pinnedDistance > 0
        ? top + pinnedDistance - start
        : stage.offsetHeight * 0.85;
    schedule();
  }
  function preference() {
    document.documentElement.classList.toggle("pencil-flight", !reduced.matches);
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = previous = 0;
      position = 0;
    }
    measure();
    if (draw) draw(position);
  }
  preference();
  try {
    await image.decode();
    draw = preparePrint(image, canvas);
  } catch {
    document.documentElement.classList.remove("pencil-flight");
    return;
  }
  position = reduced.matches ? 0 : target();
  draw(position);
  canvas.hidden = false;
  new ResizeObserver(measure).observe(track);
  reduced.addEventListener("change", preference);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("pageshow", measure);
  measure();
}
mountCover();
