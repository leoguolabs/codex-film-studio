const $ = (selector) => document.querySelector(selector);
const address = new URL(location.href);
const lang =
  address.searchParams.get("lang") ||
  (navigator.language.startsWith("zh") ? "zh" : "en");
const zh = lang === "zh";
const local = (en, cn) => (zh ? cn : en);
document.documentElement.lang = zh ? "zh-CN" : "en";
if (zh) {
  document.title = "从暗处刻出光 · 木刻版画 · Codex Film Studio";
  for (const node of document.querySelectorAll("[data-zh]"))
    node.textContent = node.dataset.zh;
  for (const node of document.querySelectorAll("[data-label-zh]"))
    node.setAttribute("aria-label", node.dataset.labelZh);
  for (const node of document.querySelectorAll("[data-alt-zh]"))
    node.alt = node.dataset.altZh;
}
for (const a of document.querySelectorAll("[data-library]"))
  a.href = "../../../?lang=" + lang + "#library";
const languageLink = $("#language");
const alternate = new URL(address);
alternate.searchParams.set("lang", zh ? "en" : "zh");
languageLink.href = alternate.href;
languageLink.textContent = zh ? "English" : "中文";
languageLink.lang = zh ? "en" : "zh-CN";
languageLink.addEventListener("click", () => {
  alternate.hash = location.hash;
  languageLink.href = alternate.href;
});

// Pin these exhibition plates to their reviewed Git artwork revision.
const plates =
  "https://raw.githubusercontent.com/leoguolabs/codex-film-studio/1c0b10808aee30633dd2c8aecfb4b3fa817d8f23/styles/woodcut/showcase/";
const impressions = [
  {
    file: "headland.webp",
    name: local("The headland", "海岬"),
    center: 0.49,
    alt: local(
      "A carved lighthouse sends a beam over a boat.",
      "海岬上的木刻灯塔把光投向一条小船。",
    ),
  },
  {
    file: plates + "lantern.webp",
    name: local("The last match", "最后一根火柴"),
    center: 0.5,
    alt: local(
      "Copper rays radiate through the black cuts around the flame.",
      "灯焰四周，铜色光芒沿着黑色刻槽铺开。",
    ),
  },
  {
    file: plates + "sheep.webp",
    name: local("A bell in the fog", "雾中铃声"),
    center: 0.58,
    alt: local(
      "The ewe’s bell glows with oxblood lines.",
      "母羊颈下的铃铛泛出暗红色刀纹。",
    ),
  },
];
const journey = $(".journey");
const canvas = $("#sheet");
const g = canvas.getContext("2d");
const foil = $(".first-print");
const still = matchMedia(
  "(prefers-reduced-motion: reduce), (max-height:540px) and (max-width:740px)",
);
const images = impressions.map(() => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.addEventListener("load", schedule);
  return image;
});
function loadPlate(index) {
  const image = images[index];
  if (!image.hasAttribute("src")) image.src = impressions[index].file;
  return image.complete && image.naturalWidth > 0;
}
let selection = 0,
  requested = false;
function progress() {
  if (still.matches) return selection;
  const rect = journey.getBoundingClientRect();
  const travel = journey.offsetHeight - $(".pinned").offsetHeight;
  return travel > 0 ? Math.max(0, Math.min(1, -rect.top / travel)) : 0;
}
function sourceWindow(image, width, height, center) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const sw = width / scale,
    sh = height / scale;
  return [
    (image.naturalWidth - sw) * center,
    (image.naturalHeight - sh) * 0.5,
    sw,
    sh,
  ];
}
function plate(index, w, h) {
  const img = images[index];
  g.drawImage(
    img,
    ...sourceWindow(img, w, h, impressions[index].center),
    0,
    0,
    w,
    h,
  );
}
function curl(from, into, phase, w, h) {
  plate(into, w, h);
  const reach = w * 0.19 * Math.sin(Math.PI * phase) ** 0.75;
  const skew = w * 0.16;
  const edge = (1 - phase) * (w + skew + reach) - skew / 2;
  // Each horizontal slice has the same cylindrical cross-section at a different x.
  // The reverse maps back into the same print and picks up the light of the uninked stock.
  g.save();
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(edge - skew / 2, 0);
  g.lineTo(edge + skew / 2, h);
  g.lineTo(0, h);
  g.closePath();
  g.clip();
  plate(from, w, h);
  g.restore();
  const gradient = g.createLinearGradient(edge - reach, 0, edge, 0);
  gradient.addColorStop(0, "#403c3366");
  gradient.addColorStop(0.22, "#a69c85");
  gradient.addColorStop(0.68, "#f4eedb");
  gradient.addColorStop(1, "#c3b9a0");
  g.save();
  g.transform(1, 0, skew / h, 1, -skew / 2, 0);
  const shade = g.createLinearGradient(edge, 0, edge + reach * 0.42, 0);
  shade.addColorStop(0, "rgba(10,9,7,.46)");
  shade.addColorStop(1, "rgba(10,9,7,0)");
  g.fillStyle = shade;
  g.fillRect(edge, 0, reach * 0.42, h);
  g.fillStyle = gradient;
  g.fillRect(edge - reach, 0, reach, h);
  const img = images[from],
    [sx, sy, sw, sh] = sourceWindow(img, w, h, impressions[from].center);
  g.globalAlpha = 0.17;
  const strips = 32;
  for (let i = 0; i < strips; i++) {
    const a = i / strips,
      b = (i + 1) / strips;
    const x = edge - reach + reach * Math.sin((Math.PI * a) / 2);
    const next = edge - reach + reach * Math.sin((Math.PI * b) / 2);
    const world = (edge - reach * (1 + a)) / w;
    const sample = Math.max(0, Math.min(img.naturalWidth - 2, sx + world * sw));
    g.drawImage(
      img,
      sample,
      sy,
      Math.max(
        1,
        Math.min((reach * sw) / w / strips, img.naturalWidth - sample),
      ),
      sh,
      x,
      0,
      next - x + 1,
      h,
    );
  }
  g.restore();
}
function draw() {
  requested = false;
  const p = progress(),
    pos = p * 2,
    index = Math.min(2, Math.round(pos));
  $("#folio").textContent = ["I / III", "II / III", "III / III"][index];
  $("#plate-name").textContent = impressions[index].name;
  $("#previous").disabled = index === 0;
  $("#next").disabled = index === 2;
  foil.alt = impressions[index].alt;
  journey.style.setProperty("--pull", String(0.02 + 0.98 * p));
  const from = Math.min(1, Math.floor(pos));
  const phase = Math.max(0, Math.min(1, (pos - from - 0.12) / 0.76));
  const turning = !still.matches && phase > 0 && phase < 1;
  const currentReady = loadPlate(index);
  if (p > 0 && p < 1) {
    loadPlate(from);
    loadPlate(from + 1);
  }
  if (!g || !currentReady) return;
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (!w || !h) return;
  const density = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * density) ||
    canvas.height !== Math.round(h * density)
  ) {
    canvas.width = Math.round(w * density);
    canvas.height = Math.round(h * density);
  }
  g.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
  g.clearRect(0, 0, w, h);
  if (turning && loadPlate(from) && loadPlate(from + 1)) {
    curl(from, from + 1, phase, w, h);
  } else {
    plate(index, w, h);
  }
}
function schedule() {
  if (!requested) {
    requested = true;
    requestAnimationFrame(draw);
  }
}
function turn(direction) {
  const p =
    Math.max(0, Math.min(2, Math.round(progress() * 2) + direction)) / 2;
  if (still.matches) {
    selection = p;
    schedule();
    return;
  }
  const top = scrollY + journey.getBoundingClientRect().top;
  scrollTo({
    top: top + (journey.offsetHeight - $(".pinned").offsetHeight) * p,
    behavior: "smooth",
  });
}
$("#previous").onclick = () => turn(-1);
$("#next").onclick = () => turn(1);

new ResizeObserver(schedule).observe(canvas);
still.addEventListener("change", schedule);
addEventListener("scroll", schedule, { passive: true });
schedule();

const release =
  "https://github.com/leoguolabs/codex-film-studio/releases/download/woodcut-print-room-v1/";
const notes = {
  wick: {
    title: "A Wick Against the Sea",
    seconds: 48,
    synopsis: local(
      "A keeper has one match left. A boat is still out beyond the headland.",
      "守塔人只剩一根火柴。海岬外，还有一条船没能归港。",
    ),
    scenes: [
      [0, "The reversed block", "反刻的木版"],
      [19, "Trimming the wick", "剪去灯芯"],
      [36.125, "The lamp catches", "灯焰燃起"],
      [40.3, "The turn for home", "小船转向归途"],
    ],
    sound: local(
      "Bowed cello holds the sea steady. Listen separately for the scrape of the shears and the strike of a match.",
      "弓弦托住了海面的起伏。单听拟音，可以听到剪刀擦过灯芯，以及火柴划响的一瞬。",
    ),
    art: plates + "shears.webp",
    alt: local("A hand trims a wick with shears.", "一只手用剪刀修剪灯芯。"),
  },
  pass: {
    title: "The Bell at Grey Pass",
    seconds: 60,
    synopsis: local(
      "Fog reaches the wall. Nell pulls a red lace from her boot to give her ewe a voice again.",
      "雾漫到了石墙边。内尔从靴子上抽出一根红鞋带，让母羊的铃重新响起来。",
    ),
    scenes: [
      [0, "Cutting the bell", "刻出羊铃"],
      [23.75, "A red bootlace", "解下红鞋带"],
      [41.375, "The first ring", "第一声铃"],
      [49.25, "Counting the lambs", "数着羊羔归来"],
    ],
    sound: local(
      "Under a quiet bed of strings, leather tightens against iron. The first bell strike carries across the hillside.",
      "弦乐压低了声音，皮绳在铁环上收紧。第一声羊铃从山坡上传开。",
    ),
    art: plates + "knot.webp",
    alt: local(
      "Carved fingers thread a red bootlace through the bell.",
      "木刻的手指把红鞋带穿进铃舌。",
    ),
  },
};
const clock = (s) =>
  Math.floor(s / 60)
    .toString()
    .padStart(2, "0") +
  ":" +
  Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
const film = $("#film"),
  audio = $("#audio");
const manifest = fetch(new URL("media/films.json", import.meta.url)).then(
  (r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  },
);
let current = "wick",
  track = "music";
function renderLines() {
  const key = current;
  $("#lines").replaceChildren();
  manifest
    .then((data) => {
      if (current !== key) return;
      const entries = data.films.find((f) => f.id === key).narration;
      $("#lines").replaceChildren(
        ...entries.map((line) =>
          Object.assign(document.createElement("p"), {
            textContent: line.text,
          }),
        ),
      );
    })
    .catch(() => {
      $("#lines").textContent = local(
        "Subtitles are available in the film.",
        "影片内附英文字幕。",
      );
    });
}
function pickFilm(key) {
  current = key;
  const info = notes[key],
    url = release + key + ".mp4";
  if (film.getAttribute("src") !== url) {
    film.pause();
    film.poster = key === "wick" ? "headland.webp" : plates + "sheep.webp";
    const captions = document.createElement("track");
    Object.assign(captions, {
      kind: "subtitles",
      srclang: "en",
      label: "English",
      src: "media/" + key + ".vtt",
    });
    film.replaceChildren(captions);
    film.src = url;
    film.load();
  }
  $("#direct").href = url;
  film.setAttribute("aria-label", info.title);
  $("#film-title").textContent = info.title;
  $("#runtime").textContent =
    clock(info.seconds) + local(" · English", " · 英文");
  $("#synopsis").textContent = info.synopsis;
  for (const btn of document.querySelectorAll("[data-film]"))
    btn.setAttribute("aria-pressed", String(btn.dataset.film === key));
  $("#scenes").replaceChildren(
    ...info.scenes.map(([s, en, cn]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const time = document.createElement("time");
      time.textContent = clock(s);
      btn.append(time, local(en, cn));
      btn.onclick = () => {
        film.currentTime = s;
        film.play().catch(() => {});
      };
      return btn;
    }),
  );
  renderLines();
}
function pickAudio() {
  const key = $("#sound-film").value,
    info = notes[key];
  const src = release + key + "-" + track + ".m4a";
  if (audio.getAttribute("src") !== src) {
    audio.pause();
    audio.src = src;
    audio.load();
  }
  audio.setAttribute(
    "aria-label",
    info.title + " · " + (track === "music" ? "Score" : "Foley"),
  );
  $("#sound-note").textContent = info.sound;
  $("#sound-art").src = info.art;
  $("#sound-art").alt = info.alt;
  for (const btn of document.querySelectorAll("[data-track]"))
    btn.setAttribute("aria-pressed", String(btn.dataset.track === track));
}
for (const btn of document.querySelectorAll("[data-film]"))
  btn.onclick = () => {
    pickFilm(btn.dataset.film);
    $("#sound-film").value = current;
    pickAudio();
  };
for (const btn of document.querySelectorAll("[data-track]"))
  btn.onclick = () => {
    track = btn.dataset.track;
    pickAudio();
  };
$("#sound-film").onchange = pickAudio;
film.addEventListener("play", () => audio.pause());
audio.addEventListener("play", () => film.pause());
pickFilm(current);
pickAudio();
