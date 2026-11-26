// Gera as imagens de MARCAÇÃO (provisórias) do site: manchas de tinta em tons de carvão com o rótulo
// "FOTO PROVISÓRIA". Elas só seguram o layout até chegarem as fotos originais aprovadas pelo estúdio.
// Para trocar por uma foto real, basta salvar a foto no mesmo caminho (mesma proporção) e marcar a peça
// como aprovada no conteúdo. Uso: node scripts/placeholders.mjs (precisa do Playwright instalado).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
// o Playwright pode estar instalado no projeto ou global
let chromium;
try { ({ chromium } = await import('playwright')); } catch { chromium = null; }
if (!chromium) chromium = createRequire(execSync('npm root -g').toString().trim() + '/x.js')('playwright').chromium;
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = new URL('../public/img/', import.meta.url).pathname;
const pecas = JSON.parse(readFileSync(new URL('../conteudo/pecas.json', import.meta.url))).pecas;
const espaco = JSON.parse(readFileSync(new URL('../conteudo/espaco.json', import.meta.url)));

const slots = [
  { arq: 'hero/hero-desktop.jpg', w: 2400, h: 1350, rotulo: 'Abertura · desktop 16:9', seed: 3, tom: 0 },
  { arq: 'hero/hero-mobile.jpg', w: 1080, h: 1440, rotulo: 'Abertura · celular 3:4', seed: 3, tom: 0 },
  { arq: 'artistas/tutao.jpg', w: 1000, h: 1250, rotulo: 'Retrato · Tutão', seed: 41, tom: 1 },
];
pecas.forEach((p, i) => {
  slots.push({ arq: p.imagem.arquivo, w: p.imagem.largura, h: p.imagem.altura, rotulo: `Peça ${p.id} · ${p.titulo}`, seed: 11 + i * 7, tom: i % 3 });
  if (p.antes) slots.push({ arq: p.antes.arquivo, w: p.antes.largura, h: p.antes.altura, rotulo: `Peça ${p.id} · antes`, seed: 90 + i, tom: 2, claro: true });
});
espaco.fotos.forEach((f, i) => slots.push({ arq: f.arquivo, w: 1600, h: 1067, rotulo: `Estúdio · ${f.titulo}`, seed: 60 + i * 5, tom: i % 3 }));

const tons = [['#0c0b0b', '#5a524c', '#b5aa9c'], ['#100c0b', '#6a3f33', '#c7a98a'], ['#0b0b0d', '#4b4c50', '#a19d96']];

function svg({ w, h, rotulo, seed, tom, claro }) {
  const [a, b, c] = tons[tom];
  const f = (0.9 / Math.max(w, h)) * 1000; // frequência relativa ao tamanho
  const s = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="tinta" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(f * 0.0021).toFixed(5)} ${(f * 0.0034).toFixed(5)}" numOctaves="5" seed="${seed}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -5 2.7" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>
    <filter id="fio"><feTurbulence type="turbulence" baseFrequency="${(f * 0.006).toFixed(4)}" numOctaves="2" seed="${seed + 3}"/><feDisplacementMap in="SourceGraphic" scale="${s * 0.03}"/></filter>
    <radialGradient id="luz" cx="${claro ? 50 : 58}%" cy="40%" r="75%"><stop offset="0" stop-color="${c}" stop-opacity="${claro ? 0.55 : 0.35}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${a}"/>
  <rect width="100%" height="100%" fill="${b}" filter="url(#tinta)" opacity="0.95"/>
  <rect width="100%" height="100%" fill="url(#luz)"/>
  <g filter="url(#fio)" fill="none" stroke="${c}" stroke-opacity="0.42" stroke-width="${s * 0.0035}">
    ${[0, 1, 2, 3, 4, 5].map((k) => `<ellipse cx="${w * (0.5 + 0.03 * Math.sin(seed + k))}" cy="${h * 0.46}" rx="${s * (0.1 + k * 0.055)}" ry="${s * (0.14 + k * 0.06)}" transform="rotate(${(seed * 13 + k * 9) % 360} ${w / 2} ${h * 0.46})"/>`).join('')}
  </g>
  <polygon points="0,${h * 0.9} ${w},${h * 0.78} ${w},${h} 0,${h}" fill="#090808" opacity="0.72"/>
  <g font-family="Azeret Mono Variable, monospace" fill="#efe9e0" letter-spacing="${s * 0.004}">
    <text x="${s * 0.06}" y="${h - s * 0.14}" font-size="${s * 0.034}" font-weight="600">FOTO PROVISÓRIA</text>
    <text x="${s * 0.06}" y="${h - s * 0.095}" font-size="${s * 0.022}" opacity="0.8">${rotulo.toUpperCase()}</text>
    <text x="${s * 0.06}" y="${h - s * 0.06}" font-size="${s * 0.02}" opacity="0.6">AGUARDANDO ORIGINAL DO ESTÚDIO</text>
  </g>
  <rect x="${s * 0.03}" y="${s * 0.03}" width="${w - s * 0.06}" height="${h - s * 0.06}" fill="none" stroke="#efe9e0" stroke-opacity="0.22" stroke-width="${s * 0.003}" stroke-dasharray="${s * 0.02} ${s * 0.014}"/>
</svg>`;
}

const fonte = new URL('../node_modules/@fontsource-variable/azeret-mono/files/azeret-mono-latin-wght-normal.woff2', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const sl of slots) {
  await page.setViewportSize({ width: sl.w, height: sl.h });
  await page.setContent(`<style>@font-face{font-family:'Azeret Mono Variable';src:url(file://${fonte})}html,body{margin:0;background:#000}</style>${svg(sl)}`);
  await page.evaluate(() => document.fonts.ready);
  const dest = OUT + sl.arq;
  mkdirSync(dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, type: 'jpeg', quality: 74 });
  console.log('ok', sl.arq);
}
await browser.close();
