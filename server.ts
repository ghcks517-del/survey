import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

const DATE_LIMITS: Record<string, number> = {
  "(1차수) 5월 18일(월) 14시 ~ 16시": 22,
  "(2차수) 6월 4일(목) 14시 ~ 16시": 20,
  "(3차수) 6월 5일(금) 14시 ~ 16시": 14,
};

app.use(express.json());

// 데이터베이스 초기화
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ entries: [] }, null, 2));
}

const getEntries = () => {
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data).entries;
};

const saveEntries = (entries: any[]) => {
  fs.writeFileSync(DB_PATH, JSON.stringify({ entries }, null, 2));
};

// API: 신청 데이터 제출
app.post("/api/apply", (req, res) => {
  const { department, name, date } = req.body;
  if (!department || !name || !date) {
    return res.status(400).json({ error: "모든 항목을 입력해주세요." });
  }

  const entries = getEntries();
  
  if (DATE_LIMITS[date] !== undefined) {
    const currentCount = entries.filter((e: any) => e.date === date).length;
    if (currentCount >= DATE_LIMITS[date]) {
      return res.status(400).json({ error: "해당 차수는 마감이 완료되었습니다." });
    }
  }

  const newEntry = {
    id: Date.now().toString(),
    department,
    name,
    date,
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  saveEntries(entries);
  res.json({ success: true, entry: newEntry });
});

// API: 전체 데이터 조회 (관리자용)
app.get("/api/entries", (req, res) => {
  res.json(getEntries());
});

// API: 데이터 수정
app.put("/api/entries/:id", (req, res) => {
  const { id } = req.params;
  const { department, name, date } = req.body;
  let entries = getEntries();
  const index = entries.findIndex((e: any) => e.id === id);
  if (index === -1) return res.status(404).json({ error: "데이터를 찾을 수 없습니다." });

  const currentEntry = entries[index];
  if (currentEntry.date !== date && DATE_LIMITS[date] !== undefined) {
    const currentCount = entries.filter((e: any) => e.date === date).length;
    if (currentCount >= DATE_LIMITS[date]) {
      return res.status(400).json({ error: "해당 차수는 마감이 완료되었습니다." });
    }
  }

  entries[index] = { ...currentEntry, department, name, date };
  saveEntries(entries);
  res.json({ success: true });
});

// API: 데이터 삭제
app.delete("/api/entries/:id", (req, res) => {
  const { id } = req.params;
  let entries = getEntries();
  entries = entries.filter((e: any) => e.id !== id);
  saveEntries(entries);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
