// Gera og.jpg (1200×630, compartilhamento) e apple-touch-icon.png a partir do favicon e das fontes do site.
// Trocar quando chegar o logotipo oficial. Uso: node scripts/marca.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { chromium = createRequire(execSync('npm root -g').toString().trim() + '/x.js')('playwright').chromium; }
const R = new URL('..', import.meta.url).pathname;
const f = (n) => `file://${R}node_modules/@fontsource-variable/${n}`;
const css = `@font-face{font-family:T;src:url(${f('big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2')})}
@font-face{font-family:M;src:url(${f('azeret-mono/files/azeret-mono-latin-wght-normal.woff2')})}
html,body{margin:0}body{width:1200px;height:630px;background:#151313;color:#efe9e0;position:relative;overflow:hidden;font-family:M}
.g{position:absolute;inset:0;background:url(file://${R}public/img/grao.png) 0 0/200px;filter:invert(1);mix-blend-mode:screen;opacity:.16}
.n{position:absolute;right:-30px;bottom:-60px;font:900 360px/0.8 T;text-transform:uppercase;color:transparent;-webkit-text-stroke:2px rgba(239,233,224,.18)}
.c{position:absolute;left:70px;top:70px;right:70px}
.r{font-size:20px;letter-spacing:.18em;text-transform:uppercase;color:#a49b92}
h1{margin:26px 0 0;font:800 128px/0.88 T;text-transform:uppercase}h1 span{color:#ff4a3d;display:block}
.b{position:absolute;left:70px;bottom:64px;font-size:20px;letter-spacing:.12em;text-transform:uppercase}
.b:before{content:'';display:inline-block;width:26px;height:6px;background:#ff4a3d;transform:skewX(-34deg);margin-right:14px;vertical-align:middle}`;
const b = await chromium.launch(); const p = await b.newPage();
await p.setViewportSize({ width: 1200, height: 630 });
await p.setContent(`<style>${css}</style><div class="g"></div><div class="n">Tutão</div><div class="c"><div class="r">Estúdio Tutão Tattoo · Piracicaba–SP</div><h1>Tatuagem autoral<span>em Piracicaba</span></h1></div><div class="b">Rua do Rosário, 123 · Alto</div>`);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: `${R}public/img/og.jpg`, type: 'jpeg', quality: 85 });
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(`<style>html,body{margin:0;background:#151313}</style>${readFileSync(`${R}public/favicon.svg`, 'utf8').replace('<svg ', '<svg width="180" height="180" ')}`);
await p.screenshot({ path: `${R}public/apple-touch-icon.png` });
await b.close(); console.log('ok');
