/**
 * 가비아 SSH 서버에서 실행 — /www_root/profiles 에 저장, walky.co.kr/profile URL 반환.
 *
 *   cd ~/gabia-profile-upload && npm install --production
 *   UPLOAD_API_KEY=... SAVE_DIR=/www_root/profiles PUBLIC_BASE_URL=https://walky.co.kr/profile PORT=3002 node index.js
 *
 * 웹서버에서 https://walky.co.kr/api/profile-upload → http://127.0.0.1:3002/upload 프록시 설정.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PORT = Number(process.env.PORT) || 3002;
const UPLOAD_KEY = process.env.UPLOAD_API_KEY?.trim();
const SAVE_DIR = process.env.SAVE_DIR?.trim() || '/www_root/profiles';
const PUBLIC_BASE = (
  process.env.PUBLIC_BASE_URL ?? 'https://walky.co.kr/profile'
).replace(/\/+$/, '');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

function normalizeUserId(userId) {
  if (typeof userId !== 'string') return null;
  const id = userId.trim();
  if (!/^w_[a-z0-9_]+$/i.test(id)) return null;
  return id;
}

function requireKey(req, res) {
  if (!UPLOAD_KEY) {
    res.status(503).json({ error: 'UPLOAD_API_KEY not set on server' });
    return false;
  }
  const key = req.get('x-walky-upload-key')?.trim();
  if (!key || key !== UPLOAD_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-walky-upload-key'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gabia-profile-upload', saveDir: SAVE_DIR });
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!requireKey(req, res)) return;

  const userId = normalizeUserId(req.body?.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  if (!req.file?.buffer?.length) {
    return res.status(400).json({ error: 'Missing photo' });
  }

  try {
    ensureDir(SAVE_DIR);
    const filePath = path.join(SAVE_DIR, `${userId}.jpg`);
    fs.writeFileSync(filePath, req.file.buffer);
    const profilePhotoUrl = `${PUBLIC_BASE}/${userId}.jpg`;
    console.log('saved', filePath, '→', profilePhotoUrl);
    return res.json({ ok: true, userId, profilePhotoUrl });
  } catch (e) {
    console.error('save failed', e);
    return res.status(500).json({
      error: 'Failed to save file',
      detail: e?.message ?? String(e),
    });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Gabia profile upload http://127.0.0.1:${PORT}/upload (save: ${SAVE_DIR})`);
});
