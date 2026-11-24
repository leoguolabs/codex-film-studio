const film = document.querySelector("#film");
const drawer = document.querySelector("#drawer");
const pull = document.querySelector("#pull");
const clip = new Audio();
const recordings = [...document.querySelectorAll("audio"), film, clip];
const labels = [...document.querySelectorAll("[data-zh]")].map((node) => [
  node,
  node.innerHTML,
]);
const images = [...document.querySelectorAll("[data-zh-alt]")].map((node) => [
  node,
  node.alt,
]);
const params = new URL(location.href).searchParams;
let language = params.get("lang") === "zh" ? "zh" : "en";

function drawLabel() {
  const open = drawer.classList.contains("open");
  pull.setAttribute("aria-expanded", String(open));
  drawer.querySelector(".inside").setAttribute("aria-hidden", String(!open));
  drawer
    .querySelector(".pictures img")
    .setAttribute("aria-hidden", String(open));
  pull.firstElementChild.textContent =
    language === "zh"
      ? open
        ? "轻轻合上"
        : "拉开看看"
      : open
        ? "Close quietly"
        : "Pull to peek";
  drawer.querySelector(".drawer-note").textContent =
    language === "zh"
      ? open
        ? "巴兹尔找到了正合适的枕头。"
        : "谁睡在抽屉里？"
      : open
        ? "Basil found a pillow just his size."
        : "Who sleeps in the drawer?";
}

function translate() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title =
    language === "zh"
      ? "请轻轻按铃 · 工作台黏土定格 · Codex Film Studio"
      : "Ring Quietly · Workbench Clay · Codex Film Studio";
  for (const [node, original] of labels) {
    if (language === "zh") node.textContent = node.dataset.zh;
    else node.innerHTML = original;
  }
  for (const [node, original] of images)
    node.alt = language === "zh" ? node.dataset.zhAlt : original;
  for (const button of document.querySelectorAll("[data-lang]"))
    button.setAttribute(
      "aria-pressed",
      String(language === button.dataset.lang),
    );
  for (const link of document.querySelectorAll(".library, .home")) {
    const url = new URL("../../../", location.href);
    url.searchParams.set("lang", language);
    if (link.classList.contains("library")) url.hash = "library";
    link.href = url;
  }
  drawLabel();
}
document.querySelector(".languages").addEventListener("click", (event) => {
  const button = event.target.closest("[data-lang]");
  if (!button) return;
  language = button.dataset.lang;
  const url = new URL(location.href);
  url.searchParams.set("lang", language);
  history.replaceState(null, "", url);
  translate();
});
pull.addEventListener("click", () => {
  drawer.classList.toggle("open");
  drawLabel();
});
translate();

for (const player of recordings)
  player.addEventListener("play", () => {
    for (const other of recordings) if (other !== player) other.pause();
  });
document.querySelector(".watch").addEventListener("click", () => {
  film.play().catch(() => {});
});
const chapters = [...document.querySelectorAll("[data-time]")];
for (const button of chapters)
  button.addEventListener("click", () => {
    const seek = () => {
      film.currentTime = Number(button.dataset.time);
    };
    if (film.readyState) seek();
    else film.addEventListener("loadedmetadata", seek, { once: true });
    film.play().catch(() => {});
  });
film.addEventListener("timeupdate", () => {
  const active = chapters
    .filter((button) => Number(button.dataset.time) <= film.currentTime)
    .at(-1);
  for (const button of chapters)
    button.setAttribute("aria-current", String(button === active));
});
const samples = [...document.querySelectorAll("[data-clip]")];
function markSample(name) {
  for (const button of samples)
    button.setAttribute("aria-pressed", String(button.dataset.clip === name));
}
clip.addEventListener("play", () => markSample(clip.dataset.name));
for (const event of ["pause", "ended", "error"])
  clip.addEventListener(event, () => markSample(null));
for (const button of samples)
  button.addEventListener("click", () => {
    const name = button.dataset.clip;
    if (clip.dataset.name === name && !clip.paused) {
      clip.pause();
      return;
    }
    clip.dataset.name = name;
    clip.src = "media/" + name + ".m4a";
    clip.play().catch(() => markSample(null));
  });
