// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
// 変更前: const PORT = 3000;
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "todos.json");

app.use(express.json()); // JSONを受け取る設定
app.use(express.static(path.join(__dirname, "public"))); // public配信

// 静的配信の下に置く
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.url);
  next();
});

// ルート定義（GET/POST/PATCH/DELETE）…の後

// 存在しないAPIの404をJSONで返す（任意）
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not found" });
});

// 共通エラーハンドラ
app.use((err, req, res, next) => {
  console.error("[ERR]", err);
  res.status(500).json({ error: "internal error" });
});

// データ読み書き（なければ空配列）
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

// 一覧
app.get("/api/todos", (req, res) => {
  res.json(load());
});

// favicon 404を黙らせる
app.get("/favicon.ico", (_, res) => res.sendStatus(204));

/// 追加 {title}
app.post("/api/todos", (req, res) => {
  const raw = req.body?.title;
  const title = (typeof raw === "string" ? raw : "").trim();

  if (!title) return res.status(400).json({ error: "title is required" });
  if (title.length > 100)
    return res.status(400).json({ error: "title too long (<=100)" });

  const todos = load();

  // 重複禁止（任意：完全一致チェック）
  if (todos.some((t) => t.title === title)) {
    return res.status(409).json({ error: "duplicate title" });
  }

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

// 完了切替/タイトル変更 {done?, title?}
app.patch("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todos = load();
  const t = todos.find((x) => x.id === id);
  if (!t) return res.status(404).json({ error: "not found" });

  // done の更新
  if ("done" in (req.body ?? {})) {
    const { done } = req.body;
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done must be boolean" });
    }
    t.done = done;
  }

  // title の更新（任意）
  if ("title" in (req.body ?? {})) {
    const raw = req.body.title;
    const title = (typeof raw === "string" ? raw : "").trim();
    if (!title) return res.status(400).json({ error: "title is required" });
    if (title.length > 100)
      return res.status(400).json({ error: "title too long (<=100)" });
    if (todos.some((x) => x.id !== id && x.title === title)) {
      return res.status(409).json({ error: "duplicate title" });
    }
    t.title = title;
  }

  save(todos);
  res.json(t);
});

// 削除
app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todos = load();
  const idx = todos.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const removed = todos.splice(idx, 1)[0];
  save(todos);
  res.json(removed);
});

app.listen(PORT, () => {
  console.log("[UP]", { port: PORT, dir: __dirname }); // どのフォルダのserver.jsか見える
  console.log(`http://localhost:${PORT}`);
});
