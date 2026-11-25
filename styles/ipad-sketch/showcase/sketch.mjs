const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const video = $("#player");
const slider = $("#scrub");
const paper = $("#study-frame");
const studyPlay = $("#study-play");
const clock = (seconds) =>
  Math.floor(seconds / 60) +
  ":" +
  String(Math.floor(seconds % 60)).padStart(2, "0");
const query = new URL(location.href);
const validFilm = (value) => (value === "maple" ? "maple" : "kernel");
let language = (
  query.searchParams.get("lang") || navigator.language
).startsWith("zh")
  ? "zh"
  : "en";
let selected = validFilm(query.searchParams.get("film"));
let study = selected;
let score = selected;
let films;
let studyAnimation = 0;
let seekListener;
const notes = {
  kernel: {
    synopsis: [
      "Inside a hard yellow shell, a little water waits. When the shell gives way, what pushes the kernel off the pan?",
      "黄澄澄的硬壳里藏着一点水。壳一裂开，究竟是什么把玉米从锅里推了起来？",
    ],
    chapters: [
      [33, "Look inside the kernel", "剖开一粒玉米"],
      [103.2, "The shell gives way", "外壳裂开的瞬间"],
      [131.5, "A tiny foot for takeoff", "起跳时那只小小的“脚”"],
    ],
    study: [
      "Watch the pencil pick out the rows on the cob, one grain at a time. The green of the husk comes last and slips across the graphite edge.",
      "铅笔沿着穗轴，一粒接一粒排出玉米。苞叶的绿最后才铺上来，轻轻越过石墨线。",
    ],
    studyAlt: [
      "A cob builds up in rows, followed by two green husks.",
      "玉米穗逐行画出籽粒，随后铺上两片绿色苞叶。",
    ],
    score: [
      "Muted upright piano, pizzicato bass and bass clarinet make a little room for the shell to burst.",
      "弱音立式钢琴、拨奏低音提琴和低音单簧管给外壳的爆裂留出了一点安静。",
    ],
    cue: [104.7, "Hear the pop in the film", "回到片中听爆裂声"],
  },
  maple: {
    synopsis: [
      "One wing, one heavy end. Follow a maple seed off its twig, through a wind tunnel and all the way to a muddy boot.",
      "一片薄翼，一端沉甸甸。跟着一枚枫籽离开树枝，穿过风洞，最后停在一只沾泥的靴子旁。",
    ],
    chapters: [
      [19.5, "A wing lets go", "一枚翅果离枝"],
      [95.9, "Air curls over the wing", "气流绕过翅缘"],
      [166.7, "Beside a muddy boot", "落到靴子旁边"],
    ],
    study: [
      "Follow the graphite out along the twig. A second wing joins the first, the leaf turns russet, and a wedge of paper stays bright inside each seed.",
      "顺着石墨线看树枝长出来。第二片翅果出现在第一片旁边。枫叶染上铁锈红，每片果翼里还留着一道纸白。",
    ],
    studyAlt: [
      "A twig, two winged seeds and a rust-red maple leaf appear under the stylus.",
      "笔尖下逐渐出现一段枫枝、两枚翅果和一片锈红色枫叶。",
    ],
    score: [
      "Viola, fingerpicked guitar and felt piano follow the turning seed. The last phrase leaves the landing to a brush of paper.",
      "中提琴、指弹吉他和毡音钢琴跟着枫籽打转。最后一个乐句收住，落地时只剩纸面上的一声轻擦。",
    ],
    cue: [167.71, "Hear the landing in the film", "回到片中听落地声"],
  },
};
const local = (words) => words[language === "zh" ? 1 : 0];
const filmTitle = (movie) => (language === "zh" ? movie.title_zh : movie.title);
const translations = all("[data-zh]").map((el) => [
  el,
  el.textContent,
  el.dataset.zh,
]);
const altText = all("[data-zh-alt]").map((el) => [
  el,
  el.alt,
  el.dataset.zhAlt,
]);
const labels = all("[data-zh-label]").map((el) => [
  el,
  el.getAttribute("aria-label"),
  el.dataset.zhLabel,
]);
function mark(selector, key, value) {
  for (const button of all(selector))
    button.setAttribute("aria-pressed", String(button.dataset[key] === value));
}
function bookmark() {
  const url = new URL(location.href);
  url.searchParams.set("lang", language);
  if (selected === "kernel") url.searchParams.delete("film");
  else url.searchParams.set("film", selected);
  history.replaceState(null, "", url);
}
function translate() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title =
    local([
      "A Pop & a Pirouette · Tablet Sketch Explainer",
      "一跃，一旋 · 平板速写讲解",
    ]) + " · Codex Film Studio";
  for (const [el, en, zh] of translations) el.textContent = local([en, zh]);
  for (const [el, en, zh] of altText) el.alt = local([en, zh]);
  for (const [el, en, zh] of labels)
    el.setAttribute("aria-label", local([en, zh]));
  for (const link of all(".library, .home")) {
    const target = new URL(link.href);
    target.searchParams.set("lang", language);
    link.href = target.href;
  }
  mark("[data-lang]", "lang", language);
  if (films) {
    programme();
    studyLabels();
    scoreLabels();
  }
}
function jump(at, start = true) {
  if (seekListener) video.removeEventListener("loadedmetadata", seekListener);
  seekListener = () => {
    video.currentTime = at;
  };
  if (video.readyState >= 1) seekListener();
  else video.addEventListener("loadedmetadata", seekListener, { once: true });
  if (start) video.play().catch(() => {});
}
function timeButton(at, label) {
  const button = document.createElement("button");
  button.type = "button";
  const time = document.createElement("time");
  time.textContent = clock(at);
  const words = document.createElement("span");
  words.textContent = label;
  button.append(time, words);
  button.onclick = () => jump(at);
  return button;
}
function programme() {
  const movie = films[selected];
  $("#film-title").textContent = filmTitle(movie);
  video.setAttribute("aria-label", filmTitle(movie));
  $("#synopsis").textContent = local(notes[selected].synopsis);
  $("#chapters").replaceChildren(
    ...notes[selected].chapters.map(([at, en, zh]) =>
      timeButton(at, local([en, zh])),
    ),
  );
  $("#transcript").replaceChildren(
    ...movie.transcript.map((cue) => timeButton(cue.at, cue.text)),
  );
  $("#master").href = movie.hd;
  mark("button[data-film]", "film", selected);
}
function chooseFilm(id, sync = true) {
  const movie = films[id];
  if (video.dataset.activeFilm !== id) {
    if (seekListener) video.removeEventListener("loadedmetadata", seekListener);
    video.pause();
    video.poster = "media/" + movie.poster;
    video.querySelector("track").src = "media/" + movie.captions;
    video.querySelector("source").src = movie.file;
    video.dataset.activeFilm = id;
    video.load();
  }
  selected = id;
  programme();
  if (sync) {
    chooseStudy(id);
    chooseScore(id);
  }
}
function showFrame() {
  const shot = films[study].study;
  const n = Number(slider.value);
  const total = shot.columns * shot.rows - 1;
  paper.style.backgroundPosition =
    ((n % shot.columns) * 100) / (shot.columns - 1) +
    "% " +
    (Math.floor(n / shot.columns) * 100) / (shot.rows - 1) +
    "%";
  const position = clock(shot.start + ((shot.end - shot.start) * n) / total);
  $("#study-time").textContent = position;
  slider.setAttribute(
    "aria-valuetext",
    position + " · " + local(["film time", "片中时间"]),
  );
}
// A hand-selected frame becomes the starting point for the next scroll.
// Leaving the sheet restores its ordinary beginning on the next approach.
const quietMotion = matchMedia("(prefers-reduced-motion: reduce)");
const studySheet = paper.closest("figure");
let studyScrollFrame = 0;
let scrollOffset = 0;
let lastPaperPosition = null;
function paperPosition() {
  const sheet = studySheet.getBoundingClientRect();
  if (sheet.bottom <= 0 || sheet.top >= innerHeight) return null;
  const art = paper.getBoundingClientRect();
  return (
    (innerHeight * 0.85 - art.top) / (innerHeight * 0.57 + art.height * 0.55)
  );
}
function holdStudyFrame() {
  lastPaperPosition = paperPosition();
  scrollOffset = lastPaperPosition === null ? 0 : Number(slider.value) / Number(slider.max) - lastPaperPosition;
}
function followStudyScroll() {
  studyScrollFrame = 0;
  if (!films || quietMotion.matches) return;
  const current = paperPosition();
  if (current === null) {
    lastPaperPosition = null;
    scrollOffset = 0;
    return;
  }
  if (current === lastPaperPosition) return;
  if (studyAnimation) {
    if (lastPaperPosition !== null) scrollOffset = Number(slider.value) / Number(slider.max) - lastPaperPosition;
    stopStudy();
  }
  lastPaperPosition = current;
  const bounded = Math.max(0, Math.min(1, current + scrollOffset));
  scrollOffset = bounded - current;
  const next = Math.round(bounded * Number(slider.max));
  if (next !== Number(slider.value)) {
    slider.value = next;
    showFrame();
  }
}
function scheduleStudyScroll() {
  if (!quietMotion.matches && !studyScrollFrame)
    studyScrollFrame = requestAnimationFrame(followStudyScroll);
}

function setStudyPlay(playing) {
  studyPlay.firstElementChild.textContent = playing ? "Ⅱ" : "▶";
  const words = playing
    ? ["Pause the drawing", "暂停画稿"]
    : ["Play the drawing", "播放画稿"];
  studyPlay.setAttribute("aria-label", local(words));
}
function stopStudy() {
  cancelAnimationFrame(studyAnimation);
  studyAnimation = 0;
  setStudyPlay(false);
}
function studyLabels() {
  $("#study-note").textContent = local(notes[study].study);
  paper.setAttribute("aria-label", local(notes[study].studyAlt));
  setStudyPlay(Boolean(studyAnimation));
  showFrame();
}
function chooseStudy(id) {
  stopStudy();
  study = id;
  const shot = films[id].study;
  paper.style.backgroundImage = 'url("media/' + shot.file + '")';
  paper.style.backgroundSize =
    shot.columns * 100 + "% " + shot.rows * 100 + "%";
  slider.max = shot.columns * shot.rows - 1;
  slider.value = 0;
  mark("[data-study]", "study", id);
  studyLabels();
  holdStudyFrame();
}
function playStudy() {
  if (!films) return;
  if (studyAnimation) {
    stopStudy();
    holdStudyFrame();
    return;
  }
  if (slider.value === slider.max) slider.value = 0;
  const shot = films[study].study;
  const range = Number(slider.max);
  const seconds = shot.end - shot.start;
  const origin =
    performance.now() - (Number(slider.value) / range) * seconds * 1000;
  const advance = (now) => {
    slider.value = Math.min(
      range,
      Math.floor(((now - origin) * range) / (seconds * 1000)),
    );
    showFrame();
    if (Number(slider.value) < range)
      studyAnimation = requestAnimationFrame(advance);
    else {
      stopStudy();
      holdStudyFrame();
    }
  };
  setStudyPlay(true);
  studyAnimation = requestAnimationFrame(advance);
}
function scoreLabels() {
  $("#score-title").textContent = films[score].score_title;
  $("#score-note").textContent = local(notes[score].score);
  const [at, en, zh] = notes[score].cue;
  $("#sound-cue").textContent = "↗ " + clock(at) + "  " + local([en, zh]);
  $("#music").setAttribute(
    "aria-label",
    films[score].score_title + " · " + local(["music alone", "单听配乐"]),
  );
  $("#foley").setAttribute(
    "aria-label",
    filmTitle(films[score]) +
      " · " +
      local(["pencil and foley", "单听笔触与拟音"]),
  );
}
function chooseScore(id) {
  const movie = films[id];
  for (const [selector, file] of [
    ["#music", movie.music],
    ["#foley", "media/" + movie.foley],
  ]) {
    const player = $(selector);
    if (player.getAttribute("src") !== file) {
      player.pause();
      player.src = file;
      player.load();
    }
  }
  score = id;
  mark("[data-score]", "score", id);
  scoreLabels();
}
translate();
for (const button of all("[data-lang]"))
  button.onclick = () => {
    language = button.dataset.lang;
    translate();
    bookmark();
  };
document.addEventListener(
  "play",
  (event) => {
    if (event.target instanceof HTMLMediaElement) {
      for (const player of all("video, audio"))
        if (player !== event.target && !player.paused) player.pause();
    }
  },
  true,
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopStudy();
});
async function start() {
  const response = await fetch(new URL("media/films.json", document.baseURI));
  if (!response.ok)
    throw new Error("Film programme unavailable (" + response.status + ")");
  const manifest = await response.json();
  films = Object.fromEntries(manifest.films.map((film) => [film.id, film]));
  if (selected === "kernel") video.dataset.activeFilm = "kernel";
  chooseFilm(selected);
  for (const button of all("button[data-film]"))
    button.onclick = () => {
      chooseFilm(button.dataset.film);
      bookmark();
    };
  for (const button of all("[data-study]"))
    button.onclick = () => chooseStudy(button.dataset.study);
  for (const button of all("[data-score]"))
    button.onclick = () => chooseScore(button.dataset.score);
  slider.oninput = () => {
    stopStudy();
    showFrame();
    holdStudyFrame();
  };
  window.addEventListener("scroll", scheduleStudyScroll, { passive: true });
  window.addEventListener("resize", scheduleStudyScroll);
  quietMotion.addEventListener("change", scheduleStudyScroll);
  studyPlay.onclick = playStudy;
  $("#sound-cue").onclick = (event) => {
    event.preventDefault();
    chooseFilm(score, false);
    bookmark();
    location.hash = "screening";
    jump(notes[score].cue[0]);
    video.focus({ preventScroll: true });
  };
}
start().catch((error) => {
  console.error(error);
  $("#synopsis").append(
    " ",
    local([
      "The HD edition is available below.",
      "可通过下方链接获取高清原片。",
    ]),
  );
});
