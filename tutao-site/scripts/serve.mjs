// Servidor estático simples para conferir dist/ (como a Vercel: /pasta/ → /pasta/index.html, 404.html no resto).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const PORTA = Number(process.env.PORTA || 4173);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.includes('..')) { res.writeHead(400); return res.end(); }
  let f = join(DIST, p);
  try { if ((await stat(f)).isDirectory()) { if (!p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); return res.end(); } f = join(f, 'index.html'); } }
  catch { res.writeHead(404, { 'Content-Type': TIPOS['.html'] }); return res.end(await readFile(join(DIST, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(f)] || 'application/octet-stream' });
  res.end(await readFile(f));
}).listen(PORTA, () => console.log(`http://localhost:${PORTA}`));
