const one = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const query = new URL(location.href);
let lang = query.searchParams.get("lang") === "zh" ? "zh" : "en";
let filmId = query.searchParams.get("film") === "tape" ? "tape" : "pizza";
let soundId = filmId;
let take = "original";
let films = [];
const player = one("#film"),
  audio = one("#audio");
const text = (en, zh) => (lang === "zh" ? zh : en);
const revision = new URL(import.meta.url).searchParams.get("v");
function media(file) {
  const url = new URL(file, new URL("media/", document.baseURI));
  if (revision && url.origin === location.origin) url.searchParams.set("v", revision);
  return url.href;
}
const byId = (id) => films.find((film) => film.id === id);
const synopsis = {
  pizza: [
    "The shop offers two eight-inch pizzas or one twelve-inch pizza. Draw the radii before placing your order.",
    "店里有两种选择：两个八英寸披萨，或者一个十二英寸披萨。先画出半径，再点单。",
  ],
  tape: [
    "Peel a five-centimetre roll halfway down to its cardboard core. The outer turns and inner turns tell different stories.",
    "一卷胶带，外半径五厘米。剥到离纸芯一半的位置，猜猜还剩多长？外圈与内圈各有一笔账。",
  ],
};
const musicNotes = {
  pizza: [
    "The brief called for nylon-string guitar and two answering notes on felt piano. The first cue gives way as the pizza sheet turns.",
    "这首纯器乐从尼龙弦吉他与毡音钢琴的两音应答写起。算完两份披萨，音乐在翻页处让开。",
  ],
  tape: [
    "A low viola, Rhodes piano and a little bass clarinet were the brief for this slow instrumental in three. The paper turns before the last phrase returns.",
    "配乐题记里写着低音区的中提琴、Rhodes 电钢琴和低音单簧管。缓慢的三拍子跟着胶带走，在翻页后接回尾句。",
  ],
};
const localizedNodes = all("[data-zh], [data-alt-zh], [data-label-zh]").map(
  (node) => ({
    node,
    en: node.dataset.zh !== undefined ? node.textContent : null,
    alt: node.getAttribute("alt"),
    label: node.getAttribute("aria-label"),
  }),
);
function localizeStatic() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title =
    text("Paper Math · Marker on Paper", "纸上有数 · 马克笔白纸速写") +
    " · Codex Film Studio";
  document.querySelector("meta[name=description]").content = text(
    "Two everyday puzzles worked out in felt-tip ink. Watch the pizza and tape films, unwind a roll, and hear both original scores.",
    "两道日常问题，画在白纸上。看披萨和胶带短片，动手拉开一卷胶带，再听两首原创配乐。",
  );
  for (const { node, en, alt, label } of localizedNodes) {
    if (en !== null) node.textContent = text(en, node.dataset.zh);
    if (node.dataset.altZh) node.alt = text(alt, node.dataset.altZh);
    if (node.dataset.labelZh)
      node.setAttribute("aria-label", text(label, node.dataset.labelZh));
  }
  for (const home of all("[data-home]"))
    home.href = "../../../?lang=" + lang + "#library";
  const toggle = one("#language");
  toggle.textContent = text("中文", "EN");
  toggle.lang = text("zh-CN", "en");
  toggle.setAttribute("aria-label", text("切换为中文", "Switch to English"));
}
function setQuery() {
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  if (filmId === "tape") url.searchParams.set("film", "tape");
  else url.searchParams.delete("film");
  history.replaceState(null, "", url);
}
const stamp = (t) =>
  Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
function filmWords() {
  const film = byId(filmId);
  if (!film) return;
  one("#film-title").textContent = film.title[lang];
  player.setAttribute("aria-label", film.title[lang]);
  one("#synopsis").textContent = text(...synopsis[filmId]);
  one("#transcript").textContent = film.transcript.join("\n");
  one("#original-film").href = film.original;
  one("#caption-file").href = media(film.captions[0].file);
  all("[data-film]").forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.film === filmId)),
  );
  one("#chapters").replaceChildren(
    ...film.chapters.map((chapter) => {
      const li = document.createElement("li"),
        button = document.createElement("button"),
        time = document.createElement("time");
      time.textContent = stamp(chapter.time);
      button.type = "button";
      button.append(time, document.createTextNode(chapter[lang]));
      button.addEventListener("click", async () => {
        const seek = () => {
          player.currentTime = chapter.time;
        };
        if (player.readyState) seek();
        else player.addEventListener("loadedmetadata", seek, { once: true });
        try {
          await player.play();
        } catch {
          if (player.error) reportFilmError();
        }
      });
      li.append(button);
      return li;
    }),
  );
}
function reportFilmError() {
  const status = one("#film-status");
  status.hidden = false;
  status.textContent = text(
    "The web film could not play. Open the 1080p original below the chapters.",
    "网页视频暂时无法播放，可以从章节下方打开 1080p 原片。",
  );
}
function changeFilm(id) {
  const next = byId(id);
  if (!next) return;
  filmId = id;
  player.pause();
  player.poster = media(next.poster);
  const source = media(next.file);
  if (player.src !== source) {
    const oldTrack = player.querySelector("track");
    const captionsOn = oldTrack?.track.mode === "showing";
    oldTrack?.remove();
    player.src = source;
    const track = document.createElement("track");
    track.kind = "captions";
    track.srclang = "en";
    track.label = "English";
    track.default = captionsOn;
    track.src = media(next.captions[0].file);
    player.append(track);
    player.load();
  }
  one("#film-status").hidden = true;
  filmWords();
  setQuery();
}
const asSeconds = (n) => Number(n).toFixed(2).replace(/\.00$/, "");
function soundWords() {
  const film = byId(soundId);
  if (!film) return;
  const song = film.music;
  const first = song.cues[0],
    last = song.cues.at(-1);
  one("#song-title").textContent = song.title;
  one("#sound-note").textContent = text(...musicNotes[soundId]);
  one("#sound-film").value = soundId;
  all("[data-take]").forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.take === take)),
  );
  const names = {
    original: text(
      "The complete Google Gemini instrumental.",
      "Google Gemini 生成的完整纯器乐。",
    ),
    score: text(
      "The two music cues as cut for the film, raised in level for solo listening.",
      "按成片时序剪好的两段音乐，单听时调高了电平。",
    ),
    paper: text(
      "The felt-tip rub and turning page, isolated and raised for listening.",
      "单独听笔尖摩擦和翻页，试听时调高了电平。",
    ),
    mix: text(
      "Narration, music and paper at their actual film levels.",
      "旁白、音乐和翻页，保留真实的成片音量。",
    ),
  };
  one("#track-line").textContent = names[take];
  const label = one('[data-take="' + take + '"]').textContent;
  audio.setAttribute("aria-label", song.title + " · " + label);
  one("#music-cut").textContent = text(
    "Google Gemini generated the " +
      Math.round(song.duration) +
      "-second instrumental. The first cue ends at " +
      asSeconds(first.film_out) +
      " s. After the fold, the music returns at " +
      asSeconds(last.film_in) +
      " s using the phrase at " +
      asSeconds(last.source_in) +
      " s in the original. Music sits " +
      Math.abs(song.mix_level) +
      " dB below speech. The pen sits 32 dB below speech.",
    "Google Gemini 生成了约 " +
      Math.round(song.duration) +
      " 秒的纯器乐。第一段在成片 " +
      asSeconds(first.film_out) +
      " 秒处收住。翻页后，在 " +
      asSeconds(last.film_in) +
      " 秒接回原曲 " +
      asSeconds(last.source_in) +
      " 秒处的乐句。有旁白时，配乐低 " +
      Math.abs(song.mix_level) +
      " dB，笔声低 32 dB。",
  );
  one("#music-brief").textContent = song.brief;
}
function changeSound(id, mode) {
  const film = byId(id);
  if (!film) return;
  soundId = id;
  take = mode;
  const src = media(film.music[mode]);
  if (audio.src !== src) {
    audio.pause();
    audio.src = src;
    audio.load();
  }
  soundWords();
}
player.addEventListener("play", () => audio.pause());
audio.addEventListener("play", () => player.pause());
player.addEventListener("error", reportFilmError);
audio.addEventListener("error", () => {
  one("#track-line").textContent = text(
    "This track could not load. Select another track or retry playback.",
    "音轨暂时无法载入。可切换音轨，或重试播放。",
  );
});
all("[data-film]").forEach((button) =>
  button.addEventListener("click", () => {
    if (button.dataset.film !== filmId) {
      changeFilm(button.dataset.film);
      changeSound(filmId, "original");
    }
  }),
);
all("[data-take]").forEach((button) =>
  button.addEventListener("click", () =>
    changeSound(soundId, button.dataset.take),
  ),
);
one("#sound-film").addEventListener("change", (event) =>
  changeSound(event.target.value, take),
);
one("#language").addEventListener("click", () => {
  lang = lang === "en" ? "zh" : "en";
  localizeStatic();
  filmWords();
  soundWords();
  drawRoll();
  setQuery();
  one("#copy-status").textContent = "";
});
one("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(one("#prompt").textContent.trim().replace(/\s+/g, " "));
    one("#copy-status").textContent = text("Copied.", "已复制。");
  } catch {
    const range = document.createRange();
    range.selectNodeContents(one("#prompt"));
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    one("#copy-status").textContent = text(
      "Brief selected. Copy with your keyboard.",
      "题目已选中，可用键盘复制。",
    );
  }
});

// A plan view and a length gauge share the same outside radius.
const canvas = one("#roll"),
  pen = canvas.getContext("2d"),
  slider = one("#radius");
const ink = {
  black: "#272924",
  blue: "#2851b5",
  red: "#bc3729",
  ghost: "#bcb9aa",
};
function line(points, colour, width) {
  pen.beginPath();
  pen.moveTo(...points[0]);
  for (const p of points.slice(1)) pen.lineTo(...p);
  pen.strokeStyle = colour;
  pen.lineWidth = width;
  pen.lineCap = "round";
  pen.lineJoin = "round";
  pen.stroke();
}
function circlePoints(x, y, r, seed) {
  return Array.from({ length: 101 }, (_, i) => {
    const t = (i * Math.PI * 2) / 100 - 0.9;
    const wobble =
      r + Math.sin(t * 3 + seed) * 0.85 + Math.cos(t * 7 + seed) * 0.42;
    return [x + Math.cos(t) * wobble, y + Math.sin(t) * wobble];
  });
}
function remark(s, x, y, size, colour, align = "left") {
  pen.font = "400 " + size + "px Kalam, PaperHand, serif";
  pen.textAlign = align;
  pen.fillStyle = colour;
  pen.fillText(s, x, y);
}
function drawRoll() {
  const r = Number(slider.value) / 10,
    fraction = (r * r - 1) / 24;
  const amount =
    r === 3
      ? "⅓"
      : r === 5
        ? "100%"
        : r === 1
          ? "0%"
          : Math.round(fraction * 100) + "%";
  const label = Number(r.toFixed(1)) + " cm";
  one("#radius-value").value = label;
  one("#roll-result strong").textContent = amount;
  slider.setAttribute("aria-valuetext", label + " · " + amount);
  canvas.setAttribute(
    "aria-label",
    text(
      "Outside radius " + label + ", " + amount + " of the tape left.",
      "外半径 " + label + "，胶带长度剩余 " + amount + "。",
    ),
  );
  const cx = 224,
    cy = 243,
    unit = 32,
    outer = r * unit,
    full = 5 * unit;
  pen.clearRect(0, 0, 920, 526);
  pen.save();
  pen.setLineDash([7, 9]);
  line(circlePoints(cx, cy, full, 2), ink.ghost, 2);
  pen.restore();
  if (r > 1) {
    pen.save();
    pen.beginPath();
    pen.arc(cx, cy, outer, 0, Math.PI * 2);
    pen.arc(cx, cy, unit, 0, Math.PI * 2, true);
    pen.clip("evenodd");
    pen.fillStyle = "#eee4cf";
    pen.fillRect(cx - full, cy - full, full * 2, full * 2);
    for (let offset = 3; offset < outer - unit; offset += 7)
      line(circlePoints(cx, cy, unit + offset, 0.8 + offset), "#cbbca2", 1.35);
    pen.restore();
  }
  line(circlePoints(cx, cy, outer, 2), ink.black, 5);
  line(circlePoints(cx, cy, unit, 0.9), ink.black, 4.5);
  line(circlePoints(cx, cy, unit - 5, 2.6), ink.ghost, 2);
  line(
    [
      [cx, cy],
      [cx + outer, cy - 1],
    ],
    ink.blue,
    3.7,
  );
  line(
    [
      [cx + outer - 9, cy - 6],
      [cx + outer, cy - 1],
      [cx + outer - 9, cy + 4],
    ],
    ink.blue,
    3,
  );
  remark(label, cx + outer * 0.62, cy - 13, 29, ink.blue, "center");
  remark(
    text("full roll", "满卷") + " · 5 cm",
    cx,
    459,
    32,
    ink.blue,
    "center",
  );
  const a = 464,
    b = 855,
    barY = 262,
    width = b - a;
  remark(text("Length left", "剩余长度"), a, 167, 39, ink.black);
  pen.save();
  pen.fillStyle = "#f3ece0";
  pen.fillRect(a, barY, width, 42);
  pen.fillStyle = "#e69a83";
  pen.fillRect(a, barY, width * fraction, 42);
  pen.beginPath();
  pen.rect(a, barY, width * fraction, 42);
  pen.clip();
  for (let x = a - 44; x < b + 44; x += 12)
    line(
      [
        [x, barY + 42],
        [x + 28, barY],
      ],
      ink.red,
      2.4,
    );
  pen.restore();
  line(
    [
      [a, barY],
      [b, barY + 1],
      [b, barY + 42],
      [a, barY + 42],
      [a, barY],
    ],
    ink.black,
    3,
  );
  for (const q of [0, 0.5, 1])
    line(
      [
        [a + q * width, barY + 43],
        [a + q * width, barY + 53],
      ],
      ink.black,
      2,
    );
  remark("0", a, barY + 80, 23, ink.black, "center");
  remark("½", a + width / 2, barY + 80, 23, ink.black, "center");
  remark("1", b, barY + 80, 23, ink.black, "center");
  remark(amount, a, barY - 26, 52, ink.red);
}
slider.addEventListener("input", drawRoll);
localizeStatic();
drawRoll();
document.fonts?.ready.then(drawRoll);

const print = one(".print"),
  cover = one(".cover");
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let queued = false;
  const update = () => {
    queued = false;
    const box = cover.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -box.top / (box.height * 0.9)));
    print.style.setProperty("--turn", (4 + progress * 28).toFixed(2) + "%");
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  update();
}
try {
  const result = await fetch(media("films.json"));
  if (!result.ok) throw new Error("Missing film program");
  films = (await result.json()).films;
  changeFilm(filmId);
  changeSound(soundId, take);
} catch {
  const status = one("#film-status");
  status.hidden = false;
  status.textContent = text(
    "The program could not load. The first film and original download are available above.",
    "片单暂时无法载入，可先播放第一部影片或下载原片。",
  );
}
