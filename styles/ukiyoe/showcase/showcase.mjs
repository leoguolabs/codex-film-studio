const $ = (selector) => document.querySelector(selector);
const all = (selector) => Array.from(document.querySelectorAll(selector));
const feature = $("#feature");
const study = $("#study");
const cinema = $("#cinema");
const proof = $("#proof");
const inkNotes = [
  [
    "The key block leaves the dark cut lines on bare paper.",
    "主版先落下，纸上只留下深色的刻线。",
  ],
  [
    "Indigo gives the carp its scales and lays the first wash across the distant hills.",
    "靛蓝染上鱼鳞，也给远山铺上一层薄色。",
  ],
  [
    "Ochre warms the eye, the fin and the bamboo pole.",
    "赭黄印出暖色的鱼眼、胸鳍和竹竿。",
  ],
  [
    "Vermilion picks out the sun, the fins and the hoop at the mouth.",
    "朱红落在太阳、鱼鳍和鱼嘴的箍圈上。",
  ],
];
let impression = 4;
function localArt(file) {
  const url = new URL(file, import.meta.url);
  if (revision) url.searchParams.set("v", revision);
  return url.href;
}
function setImpression(index) {
  impression = index;
  proof.src = localArt("impression-" + index + ".webp");
  proof.alt =
    (lang === "zh" ? "布鲤套印，第 " : "Carp windsock, impression ") +
    index +
    (lang === "zh" ? " 道" : " of four");
  $("#proof-note").textContent = inkNotes[index - 1][lang === "zh" ? 1 : 0];
  all("[data-pass]").forEach((b) =>
    b.setAttribute("aria-pressed", String(Number(b.dataset.pass) === index)),
  );
}
all("[data-pass]").forEach((b) =>
  b.addEventListener("click", () => setImpression(Number(b.dataset.pass))),
);
cinema
  .querySelector("[data-close]")
  .addEventListener("click", () => cinema.close());
cinema.addEventListener("close", () => feature.pause());
cinema.addEventListener("click", (e) => {
  if (e.target !== cinema) return;
  const bounds = cinema.getBoundingClientRect();
  if (
    e.clientX < bounds.left ||
    e.clientX > bounds.right ||
    e.clientY < bounds.top ||
    e.clientY > bounds.bottom
  )
    cinema.close();
});
const params = new URLSearchParams(location.search);
let storedLanguage;
try {
  storedLanguage = localStorage.getItem("codex-film-language");
} catch {}
let lang = (params.get("lang") ?? storedLanguage) === "zh" ? "zh" : "en";
const words = all("[data-zh]").map((el) => [el, el.textContent]);
const cover = $(".wave img");
const englishCoverText = cover.alt;
const revision = new URL(import.meta.url).searchParams.get("v");
function media(name) {
  const url = new URL("media/" + name, location.href);
  if (revision) url.searchParams.set("v", revision);
  return url.href;
}
const studies = [
  {
    key: "impression",
    en: "Watch the black key line arrive first. Separate colour blocks fill the riverbank while the highlights keep the colour of the paper.",
    zh: "先看黑色主版落下。河岸的各层颜色随后套上去，亮处仍透出纸色。",
  },
  {
    key: "sewing",
    en: "The sister pulls the needle in daylight. By lamplight her brother takes over. Each face is drawn as one rigid piece while the shoulder, elbow, wrist and thread move independently.",
    zh: "白天由姐姐抽针，夜里换弟弟落针。脸和头发共用一套固定轮廓，肩、肘、腕和针线分别运动。",
  },
  {
    key: "walk",
    en: "Watch June’s rear heel lift as her weight passes over the planted sandal. Her basket swings from the handle in her hand.",
    zh: "注意 June 身后那只脚的脚跟。重心移到踩实的草鞋上时，后脚抬起，篮子绕着她握住的提手摆动。",
  },
];
const mediaPlayers = all("audio,video");
for (const player of mediaPlayers)
  player.addEventListener("play", () => {
    for (const other of mediaPlayers) if (other !== player) other.pause();
  });
let films = [],
  selected = 0,
  activeStudy = 0;
function syncFilmText() {
  const film = films[selected];
  if (!film) return;
  $("#film-title").textContent = film.title[lang];
  $("#logline").textContent = film.description[lang];
  feature.setAttribute("aria-label", film.title[lang]);
  $("#spec").textContent = clock(film.duration) + " · 1080p · 24 fps";
  const chapters = film.chapters.map((chapter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = clock(chapter.time) + " " + chapter[lang];
    button.addEventListener("click", async () => {
      if (!feature.readyState) {
        const ready = new Promise((resolve) =>
          feature.addEventListener("loadedmetadata", resolve, { once: true }),
        );
        feature.load();
        await ready;
      }
      feature.currentTime = chapter.time;
      feature.play().catch(() => {});
    });
    return button;
  });
  $("#chapters").replaceChildren(...chapters);
}
function clock(sec) {
  return (
    String(Math.floor(sec / 60)).padStart(2, "0") +
    ":" +
    String(sec % 60).padStart(2, "0")
  );
}
function chooseFilm(index) {
  if (!films[index]) return;
  selected = index;
  const f = films[index];
  feature.pause();
  feature.src = media(f.file);
  feature.poster = media(f.poster);
  feature.querySelector("track").src = media(f.captions[0].file);
  $("#mp4").href = media(f.file);
  syncFilmText();
  feature.load();
}
function syncStudyText() {
  $("#study-note").textContent = studies[activeStudy][lang];
  study.setAttribute(
    "aria-label",
    all("[data-study]")[activeStudy].querySelector("[data-zh]").textContent,
  );
}
function setLang(next, writeURL = false) {
  lang = next;
  cover.alt = lang === "zh" ? cover.dataset.altZh : englishCoverText;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title =
    lang === "zh"
      ? "浮世绘木版短片 · Codex Film Studio"
      : "Ukiyo-e Woodblock Films · Codex Film Studio";
  for (const [el, en] of words)
    el.textContent = lang === "zh" ? el.dataset.zh : en;
  all("[data-home]").forEach((a) => {
    const url = new URL(a.href);
    url.searchParams.set("lang", lang);
    a.href = url.href;
  });
  all("[data-lang]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang)),
  );
  if (writeURL) {
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    try {
      localStorage.setItem("codex-film-language", lang);
    } catch {}
  }
  for (const refresh of scoreLabels) refresh();
  setImpression(impression);
  syncFilmText();
  syncStudyText();
}
all("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.lang, true)),
);
all("[data-film]").forEach((link, index) => {
  link.addEventListener("click", (event) => {
    if (
      !films[index] ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    chooseFilm(index);
    cinema.showModal();
    feature.play().catch(() => {});
  });
});
all("[data-study]").forEach((b, i) =>
  b.addEventListener("click", () => {
    activeStudy = i;
    study.pause();
    study.src = media(studies[i].key + ".mp4");
    study.poster = media(studies[i].key + ".jpg");
    all("[data-study]").forEach((button, j) =>
      button.setAttribute("aria-pressed", String(i === j)),
    );
    syncStudyText();
    study.load();
    study.play().catch(() => {});
  }),
);
const scoreLabels = [];
for (const control of all("[data-score]")) {
  const audio = control.parentElement.querySelector("audio");
  const seek = document.createElement("input");
  seek.type = "range";
  seek.min = "0";
  seek.max = "1";
  seek.step = ".1";
  seek.value = "0";
  const time = document.createElement("output");
  time.textContent = "0:00";
  const transport = document.createElement("div");
  transport.className = "score-transport";
  audio.before(transport);
  transport.append(control, seek, time);
  const label = () => {
    const action =
      lang === "zh"
        ? audio.paused
          ? "播放"
          : "暂停"
        : audio.paused
          ? "Play "
          : "Pause ";
    control.setAttribute(
      "aria-label",
      action + audio.getAttribute("aria-label"),
    );
    control.setAttribute("aria-pressed", String(!audio.paused));
    seek.setAttribute(
      "aria-label",
      (lang === "zh" ? "配乐进度 " : "Seek in ") +
        audio.getAttribute("aria-label"),
    );
  };
  scoreLabels.push(label);
  for (const event of ["play", "pause", "ended"])
    audio.addEventListener(event, label);
  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration)) {
      seek.max = audio.duration;
      seek.disabled = false;
    }
  });
  audio.addEventListener("timeupdate", () => {
    seek.value = audio.currentTime;
    time.textContent = clock(Math.floor(audio.currentTime));
    seek.setAttribute("aria-valuetext", time.textContent);
  });
  seek.addEventListener("input", () => {
    audio.currentTime = Number(seek.value);
  });
  control.addEventListener("click", () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    audio.play().catch(() => {
      audio.hidden = false;
      transport.hidden = true;
    });
  });
  audio.hidden = true;
  seek.disabled = true;
  control.hidden = false;
}
$(".movement").addEventListener("toggle", (event) => {
  if (!event.currentTarget.open) study.pause();
});
setLang(lang);
try {
  const response = await fetch(media("films.json"));
  if (response.ok) films = (await response.json()).films;
} catch {
  // The two programme links play the films directly if their chapter data is unavailable.
}
