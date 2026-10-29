const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";

const TRAVERSALS = {
  preorden: ["Preorden", "Raíz → sí → no. Así se lee el árbol de arriba abajo."],
  inorden: ["Inorden", "Sí → raíz → no. Las preguntas quedan entre sus respuestas."],
  postorden: ["Postorden", "Sí → no → raíz. Los animales aparecen antes que su pregunta."],
  niveles: ["Por niveles", "Nivel a nivel con una cola (BFS): primero la raíz, luego sus hijos."],
};

const state = { data: null, path: "", trail: [], phase: "intro", activeTab: "preorden", fresh: new Set(), busy: false };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- efectos: búho, sonido, confeti ---------- */
function owl(mood, say = "") {
  const el = $("owl");
  el.setAttribute("class", `owl ${mood}`);
  const b = $("bubble");
  b.textContent = say;
  b.style.animation = "none"; b.offsetHeight; b.style.animation = "";
}

let audio = null;
const sound = { on: store.get("sound") === "1" };
function tone(freq, start, dur = 0.14, type = "sine", vol = 0.08) {
  if (!sound.on) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
}
const sfx = {
  yes: () => { tone(660, 0); tone(880, 0.08); },
  no: () => { tone(330, 0); tone(247, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, "triangle")),
  learn: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.09, 0.2, "triangle")),
  sad: () => [330, 294, 247].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.04)),
};

function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("confetti"), ctx = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const colors = ["#84cc5f", "#2f7d3a", "#e8b04a", "#d4572a", "#f6e6c4"];
  const ps = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .55,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * 6 + 4,
    rot: Math.random() * 6, vr: (Math.random() - .5) * .4, col: colors[(Math.random() * colors.length) | 0], leaf: Math.random() > .5,
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
      if (p.leaf) { ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r / 2, 0, 0, 7); ctx.fill(); } else ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6);
      ctx.restore();
    }
    if (++frames < 170) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

function ripple(e) {
  const b = e.target.closest(".btn"); if (!b) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
  const s = h("span", { class: "ripple", style: `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px` });
  b.append(s); setTimeout(() => s.remove(), 650);
}
document.addEventListener("pointerdown", ripple);

function words(text) {
  return text.split(" ").flatMap((w, i, a) => [h("span", { class: "w", style: `--i:${i}` }, w), i < a.length - 1 ? " " : ""]);
}

function countUp(el, to) {
  const from = Number(el.dataset.v || 0); el.dataset.v = to;
  if (from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min((t - t0) / 600, 1);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

function leavesBackground() {
  const bg = $("bg");
  for (let i = 0; i < 14; i++) {
    const l = document.createElement("i");
    l.style.cssText = `--x:${Math.random() * 100}%;--s:${14 + Math.random() * 22}px;--t:${18 + Math.random() * 20}s;--dl:${-Math.random() * 30}s;--dx:${(Math.random() - .5) * 200}px`;
    bg.append(l);
  }
}

async function api(url, options) {
  const res = await fetch(url, options && { ...options, headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error inesperado");
  return json;
}

function nodeAt(path) {
  let node = state.data.tree;
  for (const step of path) node = step === "y" ? node.yes : node.no;
  return node;
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

/* ---------- juego ---------- */
function render() {
  const stage = $("stage");
  stage.replaceChildren();
  stage.style.animation = "none"; stage.offsetHeight; stage.style.animation = "";
  const node = nodeAt(state.path);
  const label = $("step-label");
  label.textContent = state.phase === "ask" ? `Pregunta ${state.trail.length + 1}` : "Taller de Árboles · Árbol de decisión";
  const prog = $("progress");
  prog.hidden = !["ask", "guess"].includes(state.phase);
  prog.firstElementChild.style.width = `${Math.min(100, (state.trail.length / Math.max(state.data.stats.height - 1, 1)) * 100)}%`;

  if (state.phase === "intro") {
    stage.append(
      h("h1", { class: "big" }, ...words("Piensa en un animal. Yo lo adivino.")),
      h("p", { class: "sub" }, `Soy un árbol de decisión con ${state.data.stats.animals} animales. Si fallo, aprendo uno nuevo y mañana seré más listo.`),
      h("button", { class: "btn primary", onclick: start, autofocus: "" }, "Empezar a jugar"),
    );
  } else if (state.phase === "ask") {
    stage.append(
      h("h1", { class: "big" }, ...words(node.text)),
      h("div", { class: "answers" },
        h("button", { class: "btn yes", onclick: () => answer("y") }, "Sí", h("kbd", {}, "S")),
        h("button", { class: "btn no", onclick: () => answer("n") }, "No", h("kbd", {}, "N")),
      ),
    );
  } else if (state.phase === "guess") {
    stage.append(
      h("p", { class: "sub" }, "Creo que ya lo sé…"),
      h("h1", { class: "big" }, "¿Es un ", h("span", { class: "guess" }, node.text), "?"),
      h("div", { class: "answers" },
        h("button", { class: "btn yes", onclick: win }, "Sí, acertaste", h("kbd", {}, "S")),
        h("button", { class: "btn no", onclick: lose }, "No", h("kbd", {}, "N")),
      ),
    );
  } else if (state.phase === "win") {
    stage.append(
      h("h1", { class: "big" }, ...words(`¡Lo adiviné en ${state.trail.length} ${state.trail.length === 1 ? "pregunta" : "preguntas"}!`)),
      h("p", { class: "sub" }, "El árbol no cambia cuando acierta, pero ya sabes cómo piensa: mira el camino naranja."),
      h("button", { class: "btn primary", onclick: start }, "Jugar otra vez"),
    );
  } else if (state.phase === "learn") {
    renderLearn(stage, node);
  } else if (state.phase === "learned") {
    stage.append(
      h("h1", { class: "big" }, ...words("¡Aprendido!")),
      h("p", { class: "sub" }, `Ahora el árbol tiene ${state.data.stats.animals} animales y ${state.data.stats.height} niveles de altura. Los nodos nuevos están resaltados.`),
      h("button", { class: "btn primary", onclick: start }, "Jugar otra vez"),
    );
  }
  renderTrail();
  renderTree();
}

function renderLearn(stage, leaf) {
  const err = h("p", { class: "err", role: "alert" });
  const animal = h("input", { type: "text", name: "animal", required: "", maxlength: "40", placeholder: "Ej. Lobo", autocomplete: "off" });
  const question = h("input", { type: "text", name: "question", required: "", maxlength: "90", placeholder: "Ej. ¿Aúlla a la luna?", autocomplete: "off" });
  const yes = h("input", { type: "radio", name: "ans", value: "y", checked: "" });
  const no = h("input", { type: "radio", name: "ans", value: "n" });
  const form = h("form", { class: "learn", novalidate: "" },
    h("label", {}, "¿En qué animal pensabas?", animal),
    h("label", {}, `Una pregunta que distinga a tu animal de «${leaf.text}»`, question),
    h("fieldset", { class: "seg" },
      h("label", {}, yes, h("span", {}, "Para el mío es «Sí»")),
      h("label", {}, no, h("span", {}, "Para el mío es «No»")),
    ),
    err,
    h("button", { class: "btn primary", type: "submit" }, "Enseñarle al árbol"),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const before = new Set(collect(state.data.tree));
      state.data = await api("/api/learn", {
        method: "POST",
        body: JSON.stringify({ path: state.path, animal: animal.value, question: question.value, answer_for_new: yes.checked }),
      });
      state.fresh = new Set(collect(state.data.tree).filter((k) => !before.has(k)));
      state.phase = "learned";
      owl("happy", "¡Ahora soy más listo!"); sfx.learn(); confetti();
      render(); renderTraversals();
    } catch (ex) {
      err.textContent = ex.message; form.classList.remove("shake"); form.offsetHeight; form.classList.add("shake");
    }
  });
  stage.append(h("p", { class: "sub" }, "Me ganaste. Enséñame:"), form);
  setTimeout(() => animal.focus(), 0);
}

function collect(node, path = "") {
  const keys = [`${path}|${node.text}`];
  if (!node.leaf) keys.push(...collect(node.yes, path + "y"), ...collect(node.no, path + "n"));
  return keys;
}

function renderTrail() {
  $("trail").replaceChildren(...state.trail.map(({ q, a }) =>
    h("li", { class: a === "n" ? "n" : "", title: q }, `${q.replace(/[¿?]/g, "")} · ${a === "y" ? "Sí" : "No"}`)));
}

function start() {
  state.path = ""; state.trail = []; state.fresh = new Set(); state.phase = "ask"; state.busy = false;
  owl("idle", "¡Piensa bien, que soy bueno!"); sfx.yes(); render();
}
async function answer(step) {
  if (state.busy) return;
  state.busy = true;
  const node = nodeAt(state.path);
  state.trail.push({ q: node.text, a: step });
  state.path += step;
  step === "y" ? sfx.yes() : sfx.no();
  const stage = $("stage");
  stage.replaceChildren(h("div", { class: "dots", "aria-label": "Pensando" }, h("i"), h("i"), h("i")));
  owl("thinking", "Mmm…");
  renderTrail(); renderTree();
  await sleep(650);
  state.busy = false;
  if (nodeAt(state.path).leaf) { state.phase = "guess"; owl("idle", "¡Creo que ya lo tengo!"); }
  else { state.phase = "ask"; owl("idle", ["Veamos…", "Interesante…", "Casi casi…", "¡Sigamos!"][state.trail.length % 4]); }
  render();
}
function win() { state.phase = "win"; owl("happy", "¡Soy un genio!"); sfx.win(); confetti(); render(); }
function lose() { state.phase = "learn"; owl("sad", "Me ganaste… enséñame."); sfx.sad(); render(); }

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea") || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (state.busy) return;
  if (state.phase === "ask" && (k === "s" || k === "n")) answer(k === "s" ? "y" : "n");
  else if (state.phase === "guess") { if (k === "s") win(); else if (k === "n") lose(); }
});

/* ---------- diagrama ---------- */
function layout(root) {
  const nodes = [], edges = [];
  let leafIndex = 0;
  (function place(node, depth, path) {
    let x;
    if (node.leaf) x = leafIndex++;
    const kids = node.leaf ? [] : [place(node.yes, depth + 1, path + "y"), place(node.no, depth + 1, path + "n")];
    if (!node.leaf) x = (kids[0].x + kids[1].x) / 2;
    const n = { node, depth, path, x };
    nodes.push(n);
    kids.forEach((k, i) => edges.push({ from: n, to: k, label: i === 0 ? "Sí" : "No", path: k.path }));
    return n;
  })(root, 0, "");
  return { nodes, edges, leaves: leafIndex };
}

function renderTree() {
  const { nodes, edges, leaves } = layout(state.data.tree);
  const GX = 104, GY = 82, PAD = 52;
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const W = Math.max(leaves - 1, 1) * GX + PAD * 2, H = maxDepth * GY + PAD * 2 - 8;
  const px = (n) => PAD + n.x * GX, py = (n) => PAD - 8 + n.depth * GY;
  const svg = $("tree-svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  svg.replaceChildren();
  const on = (p) => state.phase !== "intro" && state.path.startsWith(p);
  const mk = (tag, attrs, text) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };

  for (const e of edges) {
    const x1 = px(e.from), y1 = py(e.from), x2 = px(e.to), y2 = py(e.to), my = (y1 + y2) / 2;
    const isNew = state.phase !== "intro" && e.path === state.path && state.trail.length > 0;
    svg.append(mk("path", { pathLength: 1, class: "edge" + (on(e.path) ? " on" : "") + (isNew ? " draw" : ""), d: `M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}` }));
    svg.append(mk("text", { class: "edge-label", x: (x1 + x2) / 2 + (e.label === "Sí" ? -9 : 9), y: my - 4 }, e.label));
  }
  let hereEl;
  for (const n of nodes) {
    const cls = ["node"];
    if (on(n.path)) cls.push("on");
    if (state.phase !== "intro" && n.path === state.path) cls.push("here");
    if (state.fresh.has(`${n.path}|${n.node.text}`)) cls.push("fresh");
    const g = mk("g", { class: cls.join(" "), transform: `translate(${px(n)} ${py(n)})` });
    if (!n.node.leaf || n.node.text.length > 10) g.append(mk("title", {}, n.node.text));
    const inner = mk("g", { class: "inner" });
    g.append(inner);
    if (n.node.leaf) {
      const label = n.node.text.length > 11 ? n.node.text.slice(0, 10) + "…" : n.node.text;
      const w = Math.max(56, label.length * 7.4 + 20);
      inner.append(mk("rect", { x: -w / 2, y: -15, width: w, height: 30, rx: 15 }), mk("text", { class: "a" }, label));
    } else {
      inner.append(mk("circle", { r: 15 }), mk("text", { class: "q" }, "?"));
    }
    svg.append(g);
    if (cls.includes("here")) hereEl = { x: px(n), y: py(n) };
  }
  const box = $("tree-scroll");
  if (hereEl) box.scrollTo({ left: hereEl.x - box.clientWidth / 2, top: hereEl.y - box.clientHeight / 2, behavior: "auto" });
}

/* ---------- recorridos ---------- */
function renderTraversals() {
  const tabs = $("tabs");
  tabs.replaceChildren(...Object.entries(TRAVERSALS).map(([key, [name]]) =>
    h("button", { role: "tab", type: "button", "aria-selected": String(key === state.activeTab), onclick: () => { state.activeTab = key; renderTraversals(); } }, name)));
  $("trav-hint").textContent = TRAVERSALS[state.activeTab][1];
  $("chips").replaceChildren(...state.data.traversals[state.activeTab].map((t, i) => h("li", { style: `--i:${i}` }, t)));
  $("stats").replaceChildren(...[["Animales", "animals"], ["Preguntas", "questions"], ["Altura", "height"]]
    .map(([n, k]) => { const b = h("b", { "data-v": String(state.dataPrev?.[k] ?? 0) }, "0"); setTimeout(() => countUp(b, state.data.stats[k]), 50); return h("li", {}, `${n} `, b); }));
  state.dataPrev = state.data.stats;
}

$("reset-btn").addEventListener("click", async () => {
  if (!confirm("¿Borrar todo lo aprendido y volver al árbol inicial?")) return;
  state.data = await api("/api/reset", { method: "POST" });
  state.phase = "intro"; state.path = ""; state.trail = []; state.fresh = new Set(); state.dataPrev = null;
  owl("idle", "Memoria borrada. ¡Otra vez!");
  render(); renderTraversals();
});

$("theme-btn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark"; store.set("theme", root.dataset.theme);
});
function syncSound() { $("sound-btn").setAttribute("aria-pressed", String(sound.on)); }
$("sound-btn").addEventListener("click", () => { sound.on = !sound.on; store.set("sound", sound.on ? "1" : "0"); syncSound(); sfx.yes(); });

(async function init() {
  leavesBackground(); syncSound();
  state.data = await api("/api/tree");
  owl("idle", "¡Hola! Soy Búho Binario.");
  render(); renderTraversals();
})();
