const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";

const TRAVERSALS = {
  preorden: ["Preorden", "Raíz → sí → no. Así se lee el árbol de arriba abajo."],
  inorden: ["Inorden", "Sí → raíz → no. Las preguntas quedan entre sus respuestas."],
  postorden: ["Postorden", "Sí → no → raíz. Los animales aparecen antes que su pregunta."],
  niveles: ["Por niveles", "Nivel a nivel con una cola (BFS): primero la raíz, luego sus hijos."],
};

const state = { data: null, path: "", trail: [], phase: "intro", activeTab: "preorden", fresh: new Set() };

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

  if (state.phase === "intro") {
    stage.append(
      h("h1", { class: "big" }, "Piensa en un animal. Yo lo adivino."),
      h("p", { class: "sub" }, `Soy un árbol de decisión con ${state.data.stats.animals} animales. Si fallo, aprendo uno nuevo y mañana seré más listo.`),
      h("button", { class: "btn primary", onclick: start, autofocus: "" }, "Empezar a jugar"),
    );
  } else if (state.phase === "ask") {
    stage.append(
      h("h1", { class: "big" }, node.text),
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
        h("button", { class: "btn no", onclick: () => { state.phase = "learn"; render(); } }, "No", h("kbd", {}, "N")),
      ),
    );
  } else if (state.phase === "win") {
    stage.append(
      h("h1", { class: "big" }, `¡Lo adiviné en ${state.trail.length} ${state.trail.length === 1 ? "pregunta" : "preguntas"}!`),
      h("p", { class: "sub" }, "El árbol no cambia cuando acierta, pero ya sabes cómo piensa: mira el camino naranja."),
      h("button", { class: "btn primary", onclick: start }, "Jugar otra vez"),
    );
  } else if (state.phase === "learn") {
    renderLearn(stage, node);
  } else if (state.phase === "learned") {
    stage.append(
      h("h1", { class: "big" }, "¡Aprendido!"),
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
      render(); renderTraversals();
    } catch (ex) { err.textContent = ex.message; }
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

function start() { state.path = ""; state.trail = []; state.fresh = new Set(); state.phase = "ask"; render(); }
function answer(step) {
  const node = nodeAt(state.path);
  state.trail.push({ q: node.text, a: step });
  state.path += step;
  state.phase = nodeAt(state.path).leaf ? "guess" : "ask";
  render();
}
function win() { state.phase = "win"; render(); }

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea") || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (state.phase === "ask" && (k === "s" || k === "n")) answer(k === "s" ? "y" : "n");
  else if (state.phase === "guess") { if (k === "s") win(); else if (k === "n") { state.phase = "learn"; render(); } }
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
    svg.append(mk("path", { class: "edge" + (on(e.path) ? " on" : ""), d: `M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}` }));
    svg.append(mk("text", { class: "edge-label", x: (x1 + x2) / 2 + (e.label === "Sí" ? -9 : 9), y: my - 4 }, e.label));
  }
  let hereEl;
  for (const n of nodes) {
    const cls = ["node"];
    if (on(n.path)) cls.push("on");
    if (state.phase !== "intro" && n.path === state.path) cls.push("here");
    if (state.fresh.has(`${n.path}|${n.node.text}`)) cls.push("fresh");
    const g = mk("g", { class: cls.join(" "), transform: `translate(${px(n)} ${py(n)})` });
    g.append(mk("title", {}, n.node.text));
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
  $("chips").replaceChildren(...state.data.traversals[state.activeTab].map((t) => h("li", {}, t)));
  $("stats").replaceChildren(...[["Animales", "animals"], ["Preguntas", "questions"], ["Altura", "height"]]
    .map(([n, k]) => h("li", {}, `${n} `, h("b", {}, String(state.data.stats[k])))));
}

$("reset-btn").addEventListener("click", async () => {
  if (!confirm("¿Borrar todo lo aprendido y volver al árbol inicial?")) return;
  state.data = await api("/api/reset", { method: "POST" });
  state.phase = "intro"; state.path = ""; state.trail = []; state.fresh = new Set();
  render(); renderTraversals();
});

(async function init() {
  state.data = await api("/api/tree");
  render(); renderTraversals();
})();
