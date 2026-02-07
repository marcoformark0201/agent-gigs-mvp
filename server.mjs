#!/usr/bin/env node

import http from 'node:http';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const BIND = process.env.BIND || '127.0.0.1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const BTC_ADDRESS = process.env.BTC_ADDRESS || '3Q5fanKT7q3ZxZUiEvGAu9ywwhXcVnvoDc';

const DATA_DIR = path.join(__dirname, 'data');
const REQUESTS_PATH = path.join(DATA_DIR, 'requests.jsonl');
const PUBLIC_DIR = path.join(__dirname, 'public');

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readBody(req, limitBytes = 256 * 1024) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function serveStatic(res, filePath, contentType) {
  const full = path.join(PUBLIC_DIR, filePath);
  const buf = await readFile(full);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(buf);
}

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    const html = (await readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8')).replaceAll(
      '{{BTC_ADDRESS}}',
      escapeHtml(BTC_ADDRESS)
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/style.css') {
    await serveStatic(res, 'style.css', 'text/css; charset=utf-8');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/request') {
    try {
      await ensureDataDir();
      const raw = await readBody(req);
      let payload;
      const ctype = String(req.headers['content-type'] || '');
      if (ctype.includes('application/json')) {
        payload = JSON.parse(raw || '{}');
      } else {
        // 兼容表单：name=...&message=...
        const params = new URLSearchParams(raw);
        payload = Object.fromEntries(params.entries());
      }

      const record = {
        ts: new Date().toISOString(),
        ip: req.socket.remoteAddress,
        ua: req.headers['user-agent'] || null,
        payload
      };

      await appendFile(REQUESTS_PATH, `${JSON.stringify(record)}\n`, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message || 'bad_request' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin') {
    if (!ADMIN_TOKEN) {
      send(res, 500, 'ADMIN_TOKEN 未设置');
      return;
    }
    if (url.searchParams.get('token') !== ADMIN_TOKEN) {
      send(res, 403, 'Forbidden');
      return;
    }

    await ensureDataDir();
    let lines = '';
    try {
      lines = await readFile(REQUESTS_PATH, 'utf8');
    } catch {
      lines = '';
    }

    const rows = lines
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-200)
      .reverse()
      .map((l) => {
        try {
          const r = JSON.parse(l);
          const p = r.payload || {};
          return `<tr><td>${escapeHtml(r.ts)}</td><td>${escapeHtml(r.ip || '')}</td><td><pre>${escapeHtml(JSON.stringify(p, null, 2))}</pre></td></tr>`;
        } catch {
          return '';
        }
      })
      .join('');

    const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Admin - Requests</title>
<style>body{font-family:ui-sans-serif,system-ui;padding:20px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ddd;padding:8px;vertical-align:top} pre{margin:0;white-space:pre-wrap}</style>
</head><body>
<h1>Requests</h1>
<p>BTC: ${escapeHtml(BTC_ADDRESS)}</p>
<table><thead><tr><th>Time</th><th>IP</th><th>Payload</th></tr></thead><tbody>${rows || ''}</tbody></table>
</body></html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  send(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    sendJson(res, 500, { ok: false, error: err.message || 'server_error' });
  });
});

server.listen(PORT, BIND, () => {
  // 仅本地日志，不主动推送
  console.log(`Agent Gigs MVP listening on ${BIND}:${PORT}`);
});
