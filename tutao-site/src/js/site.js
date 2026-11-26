// Estúdio Tutão Tattoo · comportamento do site (sem dependências).
// Menu, entradas discretas, sanfona, galeria com filtros e ampliação, formulário que monta a mensagem do WhatsApp
// e a medição de cliques (sem dados pessoais).
const html = document.documentElement;
html.classList.remove('sem-js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dadosEl = $('#dados');
const DADOS = dadosEl ? JSON.parse(dadosEl.textContent) : null;

// ---------- medição: só nomes de evento e origem; nunca nome, texto do projeto ou outro dado pessoal ----------
// Liga sozinha se o site tiver Vercel Web Analytics (window.va) ou um dataLayer (GTM/GA4). Sem nenhum, não faz nada.
function medir(evento, props = {}) {
  const limpo = {};
  for (const [k, v] of Object.entries(props)) if (['origem', 'peca', 'artista', 'pagina'].includes(k)) limpo[k] = String(v).slice(0, 40);
  try {
    if (typeof window.va === 'function') window.va('event', { name: evento, data: limpo });
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: evento, ...limpo });
  } catch { /* medição nunca quebra o site */ }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-evento]');
  if (a) medir(a.dataset.evento, { origem: a.dataset.origem || '', pagina: location.pathname });
});

// ---------- menu de tela cheia (celular) ----------
(() => {
  const botao = $('.nav__menu');
  const painel = $('#menu');
  const main = $('main');
  if (!botao || !painel) return;
  const aberto = () => html.classList.contains('menu-aberto');
  function abre(v) {
    html.classList.toggle('menu-aberto', v);
    botao.setAttribute('aria-expanded', String(v));
    botao.setAttribute('aria-label', v ? 'Fechar o menu' : 'Abrir o menu');
    painel.setAttribute('aria-hidden', String(!v));
    painel.inert = !v;
    if (main) main.inert = v;
    if (v) $('a', painel)?.focus();
  }
  botao.addEventListener('click', () => abre(!aberto()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && aberto()) { abre(false); botao.focus(); } });
  painel.addEventListener('click', (e) => { if (e.target.closest('a')) abre(false); });
  matchMedia('(min-width: 1081px)').addEventListener('change', (m) => { if (m.matches && aberto()) abre(false); });
})();

// ---------- entradas discretas ----------
(() => {
  const els = $$('.revela');
  if (reduz || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visivel')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visivel'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
})();

// ---------- WhatsApp fixo: some quando o rodapé (que já tem o botão) aparece ----------
(() => {
  const zap = $('.zap-fixo');
  const rod = $('.rodape');
  if (!zap || !rod || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => zap.classList.toggle('is-escondido', en.isIntersecting)).observe(rod);
})();

// ---------- sanfona de fotos (do Kromo): abre no hover, foco, clique e toque; setas navegam ----------
$$('.sanfona').forEach((s) => {
  const fotos = $$('.sanfona__foto', s);
  const abre = (i) => fotos.forEach((f, k) => { f.classList.toggle('is-aberta', k === i); f.setAttribute('aria-pressed', String(k === i)); });
  fotos.forEach((f, i) => {
    f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') abre(i); });
    f.addEventListener('click', () => abre(i));
    f.addEventListener('focus', () => abre(i));
    f.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      fotos[(i + d + fotos.length) % fotos.length].focus();
    });
  });
});

// ---------- portfólio: filtros gerados do acervo + ampliação ----------
(() => {
  const galeria = $('.galeria');
  if (!galeria || !DADOS) return;
  const itens = $$('.galeria__item', galeria);
  const chips = $$('.chip');
  const limpar = $$('.filtros__limpar');
  const contagem = $('#contagem');
  const vazio = $('.vazio');
  const campos = ['estilo', 'tipo', 'cicatrizacao', 'artista'];
  const filtro = Object.fromEntries(campos.map((c) => [c, null]));
  const porId = Object.fromEntries(DADOS.pecas.map((p) => [p.id, p]));
  const visiveis = () => itens.filter((li) => !li.hidden).map((li) => li.dataset.id);

  function aplica({ url = true } = {}) {
    let n = 0;
    itens.forEach((li) => {
      const ok = campos.every((c) => !filtro[c] || li.dataset[c] === filtro[c]);
      li.hidden = !ok;
      if (ok) n++;
    });
    chips.forEach((b) => b.setAttribute('aria-pressed', String(filtro[b.dataset.campo] === b.dataset.valor)));
    const ativo = campos.some((c) => filtro[c]);
    contagem.textContent = `${n} ${n === 1 ? 'peça' : 'peças'}${ativo ? ' com esses filtros' : ''}`;
    limpar[0].hidden = !ativo;
    vazio.hidden = n > 0;
    if (url) {
      const q = new URLSearchParams();
      campos.forEach((c) => filtro[c] && q.set(c, filtro[c]));
      history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
    }
  }
  chips.forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.campo;
    filtro[c] = filtro[c] === b.dataset.valor ? null : b.dataset.valor;
    aplica();
  }));
  limpar.forEach((b) => b.addEventListener('click', () => { campos.forEach((c) => (filtro[c] = null)); aplica(); }));

  // ampliação
  const caixa = $('.caixa');
  const foto = $('.caixa__foto img', caixa);
  const ad = $('.antes-depois', caixa);
  let atual = null;
  let lista = [];
  let origemFoco = null;

  function mostra(id) {
    const p = porId[id];
    if (!p) return;
    atual = id;
    lista = visiveis();
    if (!lista.includes(id)) lista = DADOS.pecas.map((x) => x.id);
    setImg(p.imagem);
    $('[data-c="id"]', caixa).textContent = `${p.id}${p.provisoria ? ' · foto provisória' : ''}`;
    $('#caixa-titulo').textContent = p.titulo;
    const linhas = [['Artista', p.artistaNome], ['Estilo', p.estilo], ['Tipo', p.tipo], ['Cicatrização', p.cicatrizacao], ['Região', p.regiao], ['Ano', p.ano],
      ['Prêmio', p.premio ? `${p.premio.evento} ${p.premio.ano} · ${p.premio.colocacao}` : null]].filter(([, v]) => v);
    $('.caixa__dados', caixa).innerHTML = '';
    linhas.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; $('.caixa__dados', caixa).append(dt, dd); });
    ad.hidden = !p.antes;
    $$('button', ad).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ver === 'depois')));
    const q = new URLSearchParams({ peca: p.id });
    if (p.artista) q.set('artista', p.artista);
    const pedir = $('[data-c="pedir"]', caixa);
    pedir.href = `/agendamento/?${q}`;
    pedir.onclick = () => medir('estilo_clique', { peca: p.id, artista: p.artista || '' });
    const og = $('.caixa__origem', caixa);
    og.hidden = !p.origem;
    og.textContent = p.origem ? `Origem: ${p.origem}` : '';
  }
  function setImg(im) { foto.src = `/img/${im.arquivo}`; foto.alt = im.alt; foto.width = im.largura; foto.height = im.altura; }
  function abre(id, quem) {
    origemFoco = quem || document.activeElement;
    mostra(id);
    if (!caixa.open) caixa.showModal();
    const q = new URLSearchParams(location.search); q.set('peca', id);
    history.replaceState(null, '', `?${q}`);
  }
  function fecha() { caixa.close(); }
  caixa.addEventListener('close', () => {
    const q = new URLSearchParams(location.search); q.delete('peca');
    history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
    origemFoco?.focus?.();
  });
  galeria.addEventListener('click', (e) => {
    const a = e.target.closest('[data-peca]');
    if (!a) return;
    e.preventDefault();
    abre(a.dataset.peca, a);
  });
  $('.caixa__fechar', caixa).addEventListener('click', fecha);
  caixa.addEventListener('click', (e) => { if (e.target === caixa) fecha(); });
  const ir = (d) => { const i = lista.indexOf(atual); mostra(lista[(i + d + lista.length) % lista.length]); abre(atual); };
  $$('[data-ir]', caixa).forEach((b) => b.addEventListener('click', () => ir(Number(b.dataset.ir))));
  caixa.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
  });
  $$('button', ad).forEach((b) => b.addEventListener('click', () => {
    const p = porId[atual];
    setImg(b.dataset.ver === 'antes' ? p.antes : p.imagem);
    $$('button', ad).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  // estado inicial pela URL (?estilo=…&peca=P03)
  const q = new URLSearchParams(location.search);
  campos.forEach((c) => { const v = q.get(c); if (v && chips.some((b) => b.dataset.campo === c && b.dataset.valor === v)) filtro[c] = v; });
  aplica({ url: false });
  if (q.get('peca') && porId[q.get('peca')]) abre(q.get('peca'), $(`[data-peca="${q.get('peca')}"]`));
})();

// ---------- agendamento: monta a mensagem legível e abre o WhatsApp ----------
// Preparado para integrar a agenda do estúdio no futuro: só mostrar horários quando vierem de uma integração real
// por artista (com bloqueios, duração e confirmação). Até lá, dias e períodos são preferências do cliente.
(() => {
  const form = $('#form-agendar');
  if (!form || !DADOS) return;
  const q = new URLSearchParams(location.search);
  const porId = Object.fromEntries(DADOS.pecas.map((p) => [p.id, p]));
  const selArtista = $('#f-artista');
  let ref = porId[q.get('peca')] || null;
  const art = q.get('artista') || ref?.artista;
  if (art && [...selArtista.options].some((o) => o.value === art)) selArtista.value = art;

  const boxRef = $('.ref-peca', form);
  function mostraRef() {
    boxRef.hidden = !ref;
    if (!ref) return;
    const im = $('img', boxRef);
    im.src = `/img/${ref.imagem.arquivo}`; im.alt = '';
    $('[data-ref]', boxRef).textContent = `${ref.id} · ${[ref.estilo, ref.tipo].filter(Boolean).join(' · ') || ref.titulo}${ref.artistaNome ? ` · ${ref.artistaNome}` : ''}`;
  }
  $('[data-tirar-ref]', form).addEventListener('click', () => { ref = null; mostraRef(); $('#f-ideia').focus(); });
  mostraRef();

  let comecou = false;
  form.addEventListener('input', () => { if (!comecou) { comecou = true; medir('formulario_inicio', { pagina: location.pathname }); } });

  const val = (n) => (form.elements[n]?.value || '').trim();
  const marcados = (n) => $$(`input[name="${n}"]:checked`, form).map((i) => i.value);
  const erro = $('.erro', form);

  function mensagem() {
    const artistaTxt = selArtista.value === 'ajuda' ? 'Quero ajuda para escolher um artista' : selArtista.options[selArtista.selectedIndex].text;
    const dias = marcados('dias');
    const per = marcados('periodos');
    const linhas = [
      `Olá, ${DADOS.estudio}! Quero solicitar um agendamento.`,
      '',
      `*Nome:* ${val('nome')}`,
      `*Ideia:* ${val('ideia')}`,
      `*Região do corpo:* ${val('regiao') || 'Ainda não sei'}`,
      `*Tamanho aproximado:* ${val('tamanho') || 'Ainda não sei'}`,
      `*É cobertura:* ${marcados('cobertura')[0] || 'Não informei'}`,
      `*Artista:* ${artistaTxt}`,
      `*Dias de preferência:* ${dias.length ? dias.join(', ') : 'A combinar'}`,
      `*Períodos:* ${per.length ? per.join(', ') : 'A combinar'}`,
    ];
    if (ref) linhas.push(`*Referência do site:* peça ${ref.id}${ref.estilo ? ` (${ref.estilo})` : ''}${ref.artistaNome ? `, de ${ref.artistaNome}` : ''}`);
    linhas.push('', 'Vou mandar as referências e fotos aqui na conversa.');
    return linhas.join('\n');
  }
  form.mensagem = mensagem; // para os testes

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const faltam = [];
    if (!val('nome')) faltam.push('seu nome');
    if (!val('ideia')) faltam.push('a ideia da tattoo');
    if (faltam.length) {
      erro.hidden = false;
      erro.textContent = `Preencha ${faltam.join(' e ')} para continuar.`;
      (val('nome') ? $('#f-ideia') : $('#f-nome')).focus();
      return;
    }
    erro.hidden = true;
    const url = `https://wa.me/${DADOS.whatsapp}?text=${encodeURIComponent(mensagem())}`;
    medir('formulario_whatsapp', { artista: selArtista.value, peca: ref?.id || '' });
    const pronto = $('.pronto', form);
    $('[data-zap-link]', pronto).href = url;
    pronto.hidden = false;
    pronto.focus();
    window.open(url, '_blank', 'noopener');
  });
})();
