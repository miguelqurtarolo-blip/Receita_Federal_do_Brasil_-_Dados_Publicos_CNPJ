// Testes de ponta a ponta (Playwright) sobre o dist/ servido em http://localhost:4173 (npm run serve).
// Cobre: páginas, filtros, ampliação por mouse e teclado, antes/depois, botão "Quero um projeto nesse estilo",
// formulário → mensagem do WhatsApp com acentos, rotas, WhatsApp fixo, rolagem lateral e acessibilidade (axe).
// Uso: npm run teste   (com o servidor rodando)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { chromium = createRequire(execSync('npm root -g').toString().trim() + '/x.js')('playwright').chromium; }
const BASE = process.env.BASE || 'http://localhost:4173';
const AXE = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const ZAP = '5519987111620';
let ok = 0; const falhas = [];
const t = (nome, cond, extra = '') => { if (cond) ok++; else falhas.push(`${nome} ${extra}`); };

const b = await chromium.launch();
const ROTAS = ['/', '/portfolio/', '/artistas/', '/estudio/', '/contato/', '/agendamento/', '/privacidade/'];

for (const [disp, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['celular', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['celular-baixo', { viewport: { width: 390, height: 660 }, isMobile: true, hasTouch: true }], ['tablet', { viewport: { width: 820, height: 1180 } }]]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  p.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/nao-existe/') && erros.push(`${r.status()} ${r.url()}`));
  for (const r of ROTAS) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' });
    const lat = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    t(`${disp} ${r} sem rolagem lateral`, lat <= 0, `(${lat}px)`);
    const h1 = await p.locator('h1').count();
    t(`${disp} ${r} um h1`, h1 === 1, `(${h1})`);
    if (disp === 'desktop' || disp === 'celular') {
      await p.waitForTimeout(1200);
      await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}(${x.nodes.length})`));
      t(`${disp} ${r} axe sem erro sério`, v.length === 0, v.join(', '));
    }
    const zaps = await p.$$eval('a[href*="wa.me"]', (as) => as.map((a) => a.href));
    t(`${disp} ${r} WhatsApp com o número oficial`, zaps.every((h) => h.startsWith('https://wa.me/5519987111620')), zaps.join(' '));
  }
  t(`${disp} sem erro de console ou 404`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}

// ---------- galeria e filtros (desktop) ----------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + '/portfolio/', { waitUntil: 'networkidle' });
  const total = await p.locator('.galeria__item:not([hidden])').count();
  await p.click('.chip[data-campo="tipo"][data-valor="cobertura"]');
  const cob = await p.locator('.galeria__item:not([hidden])').count();
  t('filtro cobertura reduz', cob > 0 && cob < total, `${cob}/${total}`);
  t('filtro vai para a URL', p.url().includes('tipo=cobertura'));
  await p.click('.chip[data-campo="cicatrizacao"][data-valor="cicatrizada"]');
  const cobCic = await p.locator('.galeria__item:not([hidden])').count();
  const esperado = await p.$$eval('.galeria__item', (li) => li.filter((x) => x.dataset.tipo === 'cobertura' && x.dataset.cicatrizacao === 'cicatrizada').length);
  t('filtros combinados (E)', cobCic === esperado, `${cobCic} vs ${esperado}`);
  await p.click('.filtros__status .filtros__limpar');
  t('limpar filtros', (await p.locator('.galeria__item:not([hidden])').count()) === total);
  // recarregar com filtro na URL
  await p.goto(BASE + '/portfolio/?estilo=preto-e-cinza', { waitUntil: 'networkidle' });
  t('filtro pela URL', (await p.getAttribute('.chip[data-valor="preto-e-cinza"]', 'aria-pressed')) === 'true');
  // ampliação com mouse
  await p.goto(BASE + '/portfolio/', { waitUntil: 'networkidle' });
  await p.click('[data-peca="P05"]');
  t('ampliação abre', await p.locator('dialog.caixa[open]').isVisible());
  t('ampliação mostra artista', (await p.textContent('.caixa__dados')).includes('Tutão'));
  // antes/depois só aparece quando a peça tem as duas fotos do mesmo trabalho (hoje nenhuma tem)
  const temAntes = await p.evaluate(() => JSON.parse(document.getElementById('dados').textContent).pecas.find((x) => x.id === 'P05').antes);
  t('antes/depois segue o conteúdo', (await p.locator('.antes-depois').isVisible()) === !!temAntes);
  const pedir = await p.getAttribute('[data-c="pedir"]', 'href');
  t('botão do estilo leva peça e artista', pedir.includes('peca=P05') && pedir.includes('artista=tutao'), pedir);
  await p.keyboard.press('ArrowRight');
  t('seta → vai para a próxima', !(await p.textContent('[data-c="id"]')).startsWith('P05'));
  await p.keyboard.press('Escape');
  t('Esc fecha', !(await p.locator('dialog.caixa[open]').count()));
  t('foco volta para a peça', await p.evaluate(() => document.activeElement?.dataset?.peca === 'P05'));
  // teclado do começo: Tab até uma peça e Enter
  await p.goto(BASE + '/portfolio/', { waitUntil: 'networkidle' });
  await p.focus('[data-peca="P06"]');
  await p.keyboard.press('Enter');
  t('Enter abre a ampliação', await p.locator('dialog.caixa[open]').isVisible());
  t('peça sem artista não mostra artista', !(await p.textContent('.caixa__dados')).includes('Artista'));
  // link direto ?peca=
  await p.goto(BASE + '/portfolio/?peca=P03', { waitUntil: 'networkidle' });
  t('link direto abre a peça', (await p.textContent('#caixa-titulo')).length > 0 && (await p.textContent('[data-c="id"]')).startsWith('P03'));
  await p.close();
}

// ---------- agendamento → WhatsApp ----------
for (const disp of [{ viewport: { width: 1440, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
  const ctx = await b.newContext(disp);
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ body: 'wa' }));
  const p = await ctx.newPage();
  await p.goto(BASE + '/agendamento/?peca=P04&artista=tutao', { waitUntil: 'networkidle' });
  t('referência da peça aparece', (await p.textContent('[data-ref]')).includes('P04'));
  t('artista preenchido', (await p.inputValue('#f-artista')) === 'tutao');
  await p.click('#form-agendar button[type=submit]');
  t('valida campos obrigatórios', await p.locator('.erro').isVisible());
  t('foco vai ao primeiro campo vazio', await p.evaluate(() => document.activeElement.id === 'f-nome'));
  await p.fill('#f-nome', 'João Conceição');
  await p.fill('#f-ideia', 'Leão em preto e cinza, com coração & rosas <b>teste</b>');
  await p.selectOption('#f-regiao', 'Antebraço');
  await p.selectOption('#f-tamanho', 'Ainda não sei');
  await p.click('label.opcao:has(input[name=cobertura][value="Sim"])');
  await p.click('label.opcao:has(input[name=dias][value="Sábado"])');
  await p.click('label.opcao:has(input[name=periodos][value="Manhã"])');
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#form-agendar button[type=submit]')]);
  const url = pop.url();
  await pop.close().catch(() => {});
  const texto = new URL(url).searchParams.get('text') || '';
  t('abre o número oficial', url.includes(ZAP), url.slice(0, 80));
  for (const trecho of ['João Conceição', 'Leão em preto e cinza, com coração & rosas <b>teste</b>', 'Antebraço', 'Ainda não sei', '*É cobertura:* Sim', '*Artista:* Tutão', 'Sábado', 'Manhã', 'peça P04 (Preto e cinza), de Tutão', 'Vou mandar as referências']) {
    t(`mensagem tem "${trecho}"`, texto.includes(trecho), texto.replace(/\n/g, ' / '));
  }
  t('tela de “falta só enviar”', await p.locator('.pronto').isVisible());
  t('link de reserva tem a mesma mensagem', (await p.getAttribute('[data-zap-link]', 'href')).includes(encodeURIComponent('João Conceição')));
  // "quero ajuda para escolher"
  await p.goto(BASE + '/agendamento/?artista=ajuda', { waitUntil: 'networkidle' });
  t('opção de ajuda com artista', (await p.inputValue('#f-artista')) === 'ajuda');
  await ctx.close();
}

// ---------- rotas, WhatsApp fixo, menu, 404 ----------
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE + '/contato/', { waitUntil: 'networkidle' });
  const rota = await p.getAttribute('[data-evento="rota_clique"][data-origem="contato"]', 'href');
  t('Como chegar aponta o endereço', rota.includes('google.com/maps/dir') && decodeURIComponent(rota).includes('Rua do Rosário, 123'), rota);
  t('WhatsApp fixo no celular', await p.locator('.zap-fixo').isVisible());
  await p.click('.nav__menu');
  t('menu abre', await p.evaluate(() => document.documentElement.classList.contains('menu-aberto')));
  await p.keyboard.press('Escape');
  t('menu fecha com Esc', !(await p.evaluate(() => document.documentElement.classList.contains('menu-aberto'))));
  await p.goto(BASE + '/agendamento/', { waitUntil: 'networkidle' });
  t('sem WhatsApp fixo no formulário', !(await p.locator('.zap-fixo').count()));
  const r = await p.goto(BASE + '/nao-existe/');
  t('404 com página própria', r.status() === 404 && (await p.textContent('h1')).includes('não existe'));
  await ctx.close();
}

// ---------- medição: eventos sem dados pessoais ----------
{
  const p = await b.newPage();
  await p.context().route('https://wa.me/**', (r) => r.fulfill({ body: 'wa' }));
  await p.addInitScript(() => { window.dataLayer = []; });
  await p.goto(BASE + '/agendamento/', { waitUntil: 'networkidle' });
  await p.fill('#f-nome', 'Maria Sigilosa');
  await p.fill('#f-ideia', 'texto secreto do projeto');
  const ctxPop = p.context().waitForEvent('page');
  await p.click('#form-agendar button[type=submit]');
  (await ctxPop).close();
  const dl = JSON.stringify(await p.evaluate(() => window.dataLayer));
  t('mede início do formulário', dl.includes('formulario_inicio'));
  t('mede envio ao WhatsApp', dl.includes('formulario_whatsapp'));
  t('nenhum dado pessoal na medição', !/Maria|secreto/.test(dl), dl);
  await p.close();
}

// ---------- movimento reduzido ----------
{
  const ctx = await b.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  t('movimento reduzido mostra tudo', await p.evaluate(() => [...document.querySelectorAll('.revela')].every((e) => getComputedStyle(e).opacity === '1')));
  await ctx.close();
}

await b.close();
console.log(`\n${ok} ok, ${falhas.length} falha(s)`);
falhas.forEach((f) => console.log(' ✗ ' + f));
process.exit(falhas.length ? 1 : 0);
