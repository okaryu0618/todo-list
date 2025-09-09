// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // ← Render対応
const HOST = "0.0.0.0"; // ← これで確実に外部公開

const DATA_FILE = path.join(__dirname, "todos.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// faviconの404を黙らせる（任意）
app.get("/favicon.ico", (_, res) => res.sendStatus(204));

// リクエストログ（開発中だけ）
// app.use((req, res, next) => { console.log("[REQ]", req.method, req.url); next(); });

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}
function save(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.get("/api/todos", (req, res) => {
  res.json(load());
});

app.post("/api/todos", (req, res) => {
  const raw = req.body?.title;
  const title = (typeof raw === "string" ? raw : "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  if (title.length > 100)
    return res.status(400).json({ error: "title too long (<=100)" });
  const todos = load();
  if (todos.some((t) => t.title === title))
    return res.status(409).json({ error: "duplicate title" });
  const todo = {
    id: Date.now(),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  save(todos);
  res.status(201).json(todo);
});

app.patch("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todos = load();
  const t = todos.find((x) => x.id === id);
  if (!t) return res.status(404).json({ error: "not found" });
  if ("done" in (req.body ?? {})) {
    const { done } = req.body;
    if (typeof done !== "boolean")
      return res.status(400).json({ error: "done must be boolean" });
    t.done = done;
  }
  if ("title" in (req.body ?? {})) {
    const raw = req.body.title;
    const title = (typeof raw === "string" ? raw : "").trim();
    if (!title) return res.status(400).json({ error: "title is required" });
    if (title.length > 100)
      return res.status(400).json({ error: "title too long (<=100)" });
    if (todos.some((x) => x.id !== id && x.title === title))
      return res.status(409).json({ error: "duplicate title" });
    t.title = title;
  }
  save(todos);
  res.json(t);
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todos = load();
  const idx = todos.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const removed = todos.splice(idx, 1)[0];
  save(todos);
  res.json(removed);
});

// 存在しないAPIの404（任意）
app.use("/api", (req, res) => res.status(404).json({ error: "not found" }));

// 共通エラーハンドラ（任意）
app.use((err, req, res, next) => {
  console.error("[ERR]", err);
  res.status(500).json({ error: "internal error" });
});

app.listen(PORT, HOST, () => {
  console.log(`[UP] http://${HOST}:${PORT} dir=${__dirname}`);
});
