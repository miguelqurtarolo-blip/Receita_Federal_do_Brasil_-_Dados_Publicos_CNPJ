// Gera o site estático em dist/ a partir dos arquivos de conteudo/.
//   node build.mjs --modo=previa   → prévia privada: mostra marcações provisórias e pendências, sempre noindex
//   node build.mjs --modo=publico  → versão pública: só itens aprovados/confirmados; para com erro se faltar algo
// Sem framework: HTML pronto em cada página (o conteúdo aparece sem JavaScript), um CSS e um JS.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const RAIZ = dirname(new URL(import.meta.url).pathname);
// modo: --modo=… na linha de comando, ou a variável SITE_MODO (na Vercel), senão prévia
const MODO = (process.argv.find((a) => a.startsWith('--modo=')) || `--modo=${process.env.SITE_MODO || 'previa'}`).split('=')[1];
const PREVIA = MODO !== 'publico';
const DIST = join(RAIZ, 'dist');
const ler = (f) => JSON.parse(readFileSync(join(RAIZ, 'conteudo', f), 'utf8'));

const E = ler('estudio.json');
const ART_TODOS = ler('artistas.json').artistas;
const PECAS_TODAS = ler('pecas.json').pecas;
const PREMIOS = ler('premios.json').premios;
const FAQ = ler('faq.json').perguntas;
const ESP = ler('espaco.json');
const MARCOS = (E.marcos || []).filter((m) => PREVIA ? true : (m.confirmado && !m.soPrevia));

// o que aparece em cada modo
const PECAS = PECAS_TODAS.filter((p) => PREVIA || (p.aprovada && !p.provisoria));
const FOTOS_ESPACO = ESP.fotos.filter((f) => PREVIA || (f.aprovada && !f.provisoria));
const HERO_OK = PREVIA || (ESP.hero.aprovada && !ESP.hero.provisoria);
const FAQ_VIS = FAQ.filter((q) => PREVIA || q.aprovado);
const HORARIOS = E.horarios.confirmado || PREVIA ? E.horarios : null;
const SERVICOS = E.servicos.confirmado || PREVIA ? E.servicos : null;
const retratoOk = (a) => !!a.retrato && (PREVIA || !a.retrato.provisorio);
// na prévia entram também os artistas ainda a confirmar (com selo); no público, só os confirmados
const ART = ART_TODOS.filter((a) => a.confirmado || PREVIA);

// endereço base: domínio final no público; na prévia, a URL da Vercel (ou a do ambiente)
const BASE = PREVIA ? (process.env.PREVIA_URL || 'https://tutao-tattoo-previa.vercel.app') : E.dominio;
const pendenciasBloqueio = [];
if (!PREVIA) {
  if (!E.dominio) pendenciasBloqueio.push('estudio.json: "dominio" vazio');
  if (!E.cnpj || !E.razaoSocial) pendenciasBloqueio.push('estudio.json: "cnpj"/"razaoSocial" vazios (a privacidade precisa do responsável)');
  if (!HERO_OK) pendenciasBloqueio.push('espaco.json: foto de abertura (hero) não aprovada');
  if (PECAS.length < 6) pendenciasBloqueio.push(`pecas.json: só ${PECAS.length} peça(s) aprovada(s); o mínimo combinado é 6`);
  if (pendenciasBloqueio.length) {
    console.error('\nBuild público bloqueado. Resolva antes:\n- ' + pendenciasBloqueio.join('\n- ') + '\n');
    process.exit(1);
  }
}

// ---------- CSS e JS com hash no nome (cache longo e seguro) ----------
function hashFile(src, ext) { const c = readFileSync(src); const h = createHash('sha256').update(c).digest('hex').slice(0, 10); return { nome: `site.${h}.${ext}`, c }; }
const CSS = hashFile(join(RAIZ, 'src/css/site.css'), 'css');
const JS = hashFile(join(RAIZ, 'src/js/site.js'), 'js');
const ASSET = { css: CSS.nome, js: JS.nome };

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const artistaPorId = Object.fromEntries(ART.map((a) => [a.id, a]));
const nomeArtista = (id) => artistaPorId[id]?.nome || null;
const enderecoLinha = `${E.endereco.rua}, ${E.endereco.bairro}, ${E.endereco.cidade}–${E.endereco.uf}, CEP ${E.endereco.cep}`;
const rotaUrl = E.mapa.confirmado && E.mapa.url ? E.mapa.url
  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${E.endereco.rua}, ${E.endereco.bairro}, ${E.endereco.cidade} - ${E.endereco.uf}, ${E.endereco.cep}`)}`;
const zapUrl = (texto) => `https://wa.me/${E.whatsapp.numero}?text=${encodeURIComponent(texto)}`;
const ZAP_CURTO = zapUrl(E.whatsapp.mensagemCurta);
const pend = (titulo, texto) => PREVIA ? `<div class="pendencia"><strong>Pendência do estúdio · ${esc(titulo)}</strong><span>${texto}</span></div>` : '';
const seloProv = (prov) => PREVIA && prov ? '<span class="selo-prov">Provisória</span>' : '';

const ICONE = {
  zap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21.9 7c-.1-1.6-.4-3-1.6-4.2S17.6 1.2 16 1.1C14.4 1 9.6 1 8 1.1 6.4 1.2 5 1.5 3.8 2.7S2.2 5.4 2.1 7C2 8.6 2 15.4 2.1 17c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-8.4.2-10Zm-2.1 12.2a3.3 3.3 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4a3.3 3.3 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7A3.3 3.3 0 0 1 6.6 3.9C7.9 3.4 10.9 3.5 12.3 3.5s4.4-.1 5.7.4a3.3 3.3 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.8Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
  linktree: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.7 5.9 3-3.1 1.8 1.8-3.1 3h4.4v2.6h-4.5l3.2 3.1-1.8 1.8-4.3-4.3-4.3 4.3-1.8-1.8 3.2-3.1H5V7.6h4.4l-3.1-3 1.8-1.8 3 3.1V1.5h2.6v4.4Zm-2.6 8.6h2.6v8h-2.6v-8Z"/></svg>',
};

// ---------- moldura comum ----------
const PAGINAS = [
  { url: '/', nome: 'Início' },
  { url: '/portfolio/', nome: 'Portfólio' },
  { url: '/artistas/', nome: 'Artistas' },
  { url: '/estudio/', nome: 'Estúdio' },
  { url: '/contato/', nome: 'Contato' },
];

function jsonLd() {
  const d = {
    '@context': 'https://schema.org', '@type': 'TattooParlor', name: E.nome, url: BASE + '/',
    telephone: '+55 ' + E.telefone.exibicao.replace(/[()]/g, ''),
    address: { '@type': 'PostalAddress', streetAddress: E.endereco.rua, addressLocality: E.endereco.cidade, addressRegion: E.endereco.uf, postalCode: E.endereco.cep, addressCountry: 'BR' },
    founder: { '@type': 'Person', name: E.fundador.nome, alternateName: E.fundador.apelido },
    sameAs: E.redes.map((r) => r.url),
    image: BASE + '/img/og.jpg',
  };
  if (E.horarios.confirmado) d.openingHours = E.horarios.schemaOrg; // preencher no formato "Mo-Fr 10:00-18:30"
  if (E.mapa.confirmado && E.mapa.url) d.hasMap = E.mapa.url;
  return `<script type="application/ld+json">${JSON.stringify(d)}</script>`;
}

function pagina({ url, titulo, descricao, corpo, dados, semZap }) {
  const canonical = BASE + url;
  const nav = PAGINAS.map((p) => `<a href="${p.url}"${p.url === url ? ' aria-current="page"' : ''}>${p.nome}</a>`).join('');
  const menuLinks = [...PAGINAS, { url: '/agendamento/', nome: 'Agendar' }].map((p, i) => `<a class="menu__link titulo" style="--i:${i}" href="${p.url}"${p.url === url ? ' aria-current="page"' : ''}><span>${p.nome}</span></a>`).join('');
  const redes = E.redes.map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.rotulo)}</a></li>`).join('');
  return `<!doctype html>
<html lang="pt-BR" class="sem-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
${PREVIA ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#151313">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(E.nome)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${BASE}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/big-shoulders.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/${ASSET.css}">
${url === '/' ? jsonLd() : ''}
<script src="/assets/${ASSET.js}" defer></script>
</head>
<body class="${semZap ? '' : 'tem-zap-fixo'}">
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
${PREVIA ? '<div class="faixa-previa" role="note">Prévia privada para validação · fotos do Instagram aguardando autorização · não divulgar</div>' : ''}
<header class="nav">
  <div class="dentro nav__dentro">
    <a class="marca" href="/" aria-label="${esc(E.nome)}, página inicial"><span class="marca__nome">Tutão</span><span class="marca__ponto" aria-hidden="true"></span><span class="marca__sub">Tattoo · Piracicaba</span></a>
    <nav class="nav__links" aria-label="Principal">${nav}</nav>
    <div class="nav__acoes">
      <a class="botao botao--acento" href="/agendamento/" data-evento="agendar_clique" data-origem="nav">Solicitar agendamento</a>
      <button class="nav__menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir o menu"><span class="nav__traco"></span><span class="nav__traco"></span></button>
    </div>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true" inert>
  <nav class="menu__links" aria-label="Menu">${menuLinks}</nav>
  <div class="menu__pe">
    <a class="botao botao--zap" href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="menu">${ICONE.zap}Falar no WhatsApp</a>
  </div>
</div>
<main id="conteudo">
${corpo}
</main>
<footer class="rodape">
  <div class="dentro">
    <div class="rodape__topo">
      <div>
        <h2 class="titulo">Tutão <span style="color:var(--acento-no-escuro)">Tattoo</span></h2>
        <p class="lead" style="margin-top:14px">${esc(enderecoLinha)}</p>
        <div class="botoes" style="margin-top:22px">
          <a class="botao botao--zap" href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="rodape">${ICONE.zap}Falar no WhatsApp</a>
          <a class="botao botao--contorno" href="${rotaUrl}" target="_blank" rel="noopener" data-evento="rota_clique" data-origem="rodape">Como chegar</a>
        </div>
      </div>
      <div><p class="rotulo" style="margin-bottom:14px">Páginas</p><ul class="rodape__lista">${PAGINAS.map((p) => `<li><a href="${p.url}">${p.nome}</a></li>`).join('')}<li><a href="/agendamento/">Agendamento</a></li></ul></div>
      <div><p class="rotulo" style="margin-bottom:14px">Redes</p><ul class="rodape__lista">${redes}<li><a href="tel:${E.telefone.numero}">${esc(E.telefone.exibicao)}</a></li></ul></div>
    </div>
    <div class="rodape__pe"><span>© ${new Date().getFullYear()} ${esc(E.nome)}</span><a href="/privacidade/">Privacidade</a></div>
  </div>
</footer>
${semZap ? '' : `<a class="zap-fixo" href="${ZAP_CURTO}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp" data-evento="whatsapp_clique" data-origem="fixo">${ICONE.zap}</a>`}
${dados ? `<script type="application/json" id="dados">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>` : ''}
</body>
</html>`;
}

// ---------- peças ----------
const img = (src, alt, w, h, extra = '') => `<img src="/img/${src}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async"${extra}>`;
const dadosPeca = (p) => [p.estilo, p.tipo, p.cicatrizacao].filter(Boolean).join(' · ');

function copia(p) {
  return `<li class="revela"><a class="copia" href="/portfolio/?peca=${p.id}" aria-label="${esc(p.titulo)}${nomeArtista(p.artista) ? ', por ' + esc(nomeArtista(p.artista)) : ''}: ampliar no portfólio">
    <span class="copia__papel"><span class="copia__foto">${seloProv(p.provisoria)}${img(p.imagem.arquivo, p.imagem.alt, p.imagem.largura, p.imagem.altura)}</span>
    <span class="copia__pe"><span class="copia__marca"></span><b>${p.id}</b><span>${esc(nomeArtista(p.artista) || 'Tutão Tattoo')}</span></span></span>
    <span class="copia__legenda"><b>${esc(p.titulo)}</b><span>${esc(dadosPeca(p) || '—')}</span></span></a></li>`;
}

function artistaCard(a, { grande = false } = {}) {
  const obras = PECAS.filter((p) => p.artista === a.id);
  const estilos = (a.estilos.length ? `<ul class="artista__estilos">${a.estilos.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '')
    + (!a.estilos.length || a.estilosConfirmados === false ? pend('estilos', a.estilos.length ? esc(a._estilos || `Estilos vistos no Instagram; confirmar com ${a.nome}.`) : `Confirmar com ${esc(a.nome)} os estilos em que quer ser procurado.`) : '')
    + (!a.confirmado ? pend('equipe', esc(a._confirmar || `Confirmar com o estúdio se ${a.nome} faz parte da equipe e se aceita aparecer no site.`)) : '');
  const retrato = retratoOk(a) ? `<div class="artista__retrato">${seloProv(a.retrato.provisorio)}${img(a.retrato.arquivo, a.retrato.alt, 1000, 1250)}</div>` : '';
  const texto = `<div class="artista__texto">
      <p class="artista__papel">${esc(a.papel)}</p>
      <h${grande ? 2 : 3} class="artista__nome titulo">${esc(a.nome)}${!a.confirmado ? '<span class="rascunho">a confirmar</span>' : ''}</h${grande ? 2 : 3}>
      ${a.nomeCompleto ? `<p>${esc(a.nomeCompleto)}. ${esc(a.resumo)}</p>` : `<p>${esc(a.resumo)}</p>`}
      ${estilos}
      ${grande && obras.length ? `<div><p class="rotulo">Trabalhos atribuídos</p><div class="artista__obras">${obras.slice(0, 6).map((p) => `<a href="/portfolio/?artista=${a.id}&amp;peca=${p.id}" aria-label="Ver ${esc(p.titulo)} (${p.id})">${seloProv(p.provisoria)}${img(p.imagem.arquivo, p.imagem.alt, p.imagem.largura, p.imagem.altura)}</a>`).join('')}</div></div>` : ''}
      <div class="botoes">
        <a class="botao botao--acento" href="/agendamento/?artista=${a.id}" data-evento="agendar_clique" data-origem="artista">Solicitar com ${esc(a.nome)}</a>
        ${grande && obras.length ? `<a class="botao botao--contorno" href="/portfolio/?artista=${a.id}">Ver portfólio</a>` : ''}
        ${a.instagram ? `<a class="link-seta" href="${a.instagram}" target="_blank" rel="noopener">Instagram</a>` : ''}
      </div>
    </div>`;
  return `<article class="artista${grande ? ' artista--grande' : ''} revela" id="${a.id}">${retrato}${texto}</article>`;
}

const ajudaArtista = `<div class="ajuda-artista revela"><p class="rotulo">Não sabe com quem fazer?</p><h3 class="titulo">Quero ajuda para escolher um artista</h3><p>Conte a ideia e a equipe indica quem combina com o seu projeto.</p><a class="botao botao--escuro" href="/agendamento/?artista=ajuda" data-evento="agendar_clique" data-origem="ajuda-artista">Pedir indicação</a></div>`;

function sanfona(fotos) {
  if (!fotos.length) return '';
  return `<div class="sanfona" role="group" aria-label="Fotos do estúdio">${fotos.map((f, i) => `<button class="sanfona__foto${i === 0 ? ' is-aberta' : ''}" type="button" aria-pressed="${i === 0}" aria-label="${esc(f.titulo)}">${seloProv(f.provisoria)}${img(f.arquivo, f.alt, 1600, 1067)}<span class="sanfona__nome">${esc(f.titulo)}</span></button>`).join('')}</div>`;
}

const blocoHorarios = () => {
  if (!HORARIOS) return '';
  const lista = `<div class="horarios">${HORARIOS.linhas.map((l) => `<div><span>${esc(l.dias)}</span><b>${esc(l.horas)}</b></div>`).join('')}</div>`;
  return `<div><p class="rotulo" style="margin-bottom:10px">Horário de atendimento${!E.horarios.confirmado ? '<span class="rascunho">a confirmar</span>' : ''}</p>${lista}${!E.horarios.confirmado ? pend('horários', 'Estes horários vieram de um índice de terceiros (Glartent, a partir do Facebook). Só aparecem no site público depois da confirmação do estúdio.') : ''}</div>`;
};

const contatosLista = () => `<div class="contatos">
  <a href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="contatos"><span>WhatsApp</span><b>${esc(E.whatsapp.exibicao)}</b></a>
  <a href="tel:${E.telefone.numero}" data-evento="telefone_clique"><span>Telefone</span><b>${esc(E.telefone.exibicao)}</b></a>
  ${E.redes.map((r) => `<a href="${r.url}" target="_blank" rel="noopener"><span>${esc(r.rotulo)}</span><b>${esc(r.usuario)}</b></a>`).join('')}
</div>`;

// ---------- páginas ----------
const destaques = PECAS.filter((p) => p.destaque).slice(0, 5);
const tutao = artistaPorId.tutao;

const heroImg = HERO_OK ? `<picture class="hero__foto"><source media="(max-width: 760px)" srcset="/img/${ESP.hero.mobile}" width="1080" height="1440"><img src="/img/${ESP.hero.desktop}" alt="${esc(ESP.hero.alt)}" width="2400" height="1350" fetchpriority="high"></picture>${seloProv(ESP.hero.provisoria)}` : '';

const home = pagina({
  url: '/',
  titulo: 'Tutão Tattoo · estúdio de tatuagem em Piracicaba',
  descricao: 'Estúdio Tutão Tattoo, na Rua do Rosário, 123, em Piracicaba–SP. Tatuagem autoral com Tutão e equipe. Veja o portfólio e solicite seu agendamento pelo WhatsApp.',
  corpo: `
<section class="hero" aria-labelledby="hero-titulo">
  ${heroImg}
  <span class="hero__nome titulo" aria-hidden="true">Tutão</span>
  <div class="dentro hero__dentro">
    <p class="rotulo">${esc(E.nome)} · Piracicaba–SP</p>
    <h1 class="hero__titulo titulo" id="hero-titulo"><span>Tatuagem autoral</span><span class="acento">em Piracicaba</span></h1>
    <p class="hero__texto">Conheça o trabalho de Tutão e da equipe. Conte sua ideia para começarmos a desenhar seu projeto.</p>
    <div class="botoes">
      <a class="botao botao--acento" href="/agendamento/" data-evento="agendar_clique" data-origem="hero">Solicitar agendamento</a>
      <a class="botao" href="/portfolio/">Ver portfólio</a>
    </div>
    <ul class="hero__dados"><li>${esc(E.fundador.experiencia.replace(/^mais/, 'Mais'))}</li><li>Rua do Rosário, 123 · Alto</li></ul>
  </div>
</section>

${destaques.length ? `<section class="secao destaques" aria-labelledby="sel-titulo">
  <span class="trilho__fundo titulo" aria-hidden="true">Portfólio</span>
  <div class="dentro">
    <div class="secao__topo"><h2 class="secao__titulo titulo" id="sel-titulo">Peças <em>do acervo</em></h2><a class="link-seta" href="/portfolio/">Ver o portfólio completo</a></div>
    ${pend('fotos do portfólio', 'As peças P01 (cobertura, post de 28/03/2026) e P02 (cicatrizada, post de 30/01/2026) são referências reais do Facebook do estúdio e aguardam o arquivo original e a autorização. As demais são marcações de layout.')}
    <ul class="trilho" style="margin-top:28px">${destaques.map(copia).join('')}</ul>
  </div>
</section>` : ''}

<section class="secao papel inclinada" aria-labelledby="equipe-titulo">
  <div class="grao"></div>
  <div class="dentro">
    <div class="secao__topo"><h2 class="secao__titulo titulo" id="equipe-titulo">A <em>equipe</em></h2><a class="link-seta" href="/artistas/">Conhecer os artistas</a></div>
    <div style="display:grid;gap:clamp(36px,5vw,64px)">${ART.map((a) => artistaCard(a, { grande: true })).join('')}${ajudaArtista}</div>
    ${PREVIA ? `<div style="margin-top:28px">${pend('artistas', 'Lista dos artistas em atendimento hoje, com retrato, estilos e as peças de cada um. Tutão está confirmado; Alexandre Fischer aparece nos perfis do estúdio e ainda precisa ser confirmado.')}</div>` : ''}
  </div>
</section>

<section class="secao" aria-labelledby="traj-titulo">
  <div class="dentro duas-col">
    <div class="revela">
      <p class="rotulo" style="margin-bottom:18px">Trajetória</p>
      <h2 class="frase titulo" id="traj-titulo">Mais de duas décadas <span class="acento">com a máquina na mão.</span></h2>
    </div>
    <div class="revela" style="display:grid;gap:18px">
      <div class="numero-grande"><b>20+</b><span class="rotulo">anos de experiência do fundador</span></div>
      <p class="lead">${esc(E.fundador.nome)}, o Tutão, fundou o estúdio e segue à frente dos projetos, com ${esc(E.fundador.experiencia)}.</p>
      <a class="link-seta" href="/estudio/">O estúdio e a trajetória</a>
    </div>
  </div>
</section>

${FOTOS_ESPACO.length ? `<section class="secao papel inclinada" aria-labelledby="espaco-titulo">
  <div class="grao"></div>
  <div class="dentro">
    <div class="secao__topo"><h2 class="secao__titulo titulo" id="espaco-titulo">O <em>espaço</em></h2><p class="lead">Rua do Rosário, 123, no Alto, em Piracicaba.</p></div>
    ${sanfona(FOTOS_ESPACO)}
    ${pend('fotos do espaço', 'Fachada, recepção, salas e equipe em fotos atuais da Rua do Rosário, 123.')}
  </div>
</section>` : ''}

<section class="secao" aria-labelledby="local-titulo">
  <div class="dentro local">
    <div class="revela" style="display:grid;gap:22px">
      <p class="rotulo">Localização</p>
      <h2 class="so-leitor" id="local-titulo">Localização</h2>
      <address class="endereco">Rua do Rosário, 123<br><span style="color:var(--acento-no-escuro)">Alto · Piracicaba</span></address>
      <p class="lead">CEP ${esc(E.endereco.cep)} · Piracicaba–SP</p>
      <div class="botoes">
        <a class="botao" href="${rotaUrl}" target="_blank" rel="noopener" data-evento="rota_clique" data-origem="home">Como chegar</a>
        <a class="botao botao--zap" href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="home-local">${ICONE.zap}Falar no WhatsApp</a>
      </div>
    </div>
    <div class="revela" style="display:grid;gap:26px">${blocoHorarios()}${contatosLista()}</div>
  </div>
</section>

<section class="secao chamada" aria-labelledby="ch-titulo">
  <div class="grao"></div>
  <h2 class="chamada__titulo titulo" id="ch-titulo">Tem uma ideia? <span class="acento">Vamos desenhar.</span></h2>
  <p class="lead">Mande a ideia, a região e o tamanho. A equipe responde com orçamento e datas pelo WhatsApp.</p>
  <div class="botoes" style="justify-content:center">
    <a class="botao botao--acento" href="/agendamento/" data-evento="agendar_clique" data-origem="chamada">Solicitar agendamento</a>
    <a class="botao botao--zap" href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="chamada">${ICONE.zap}Falar no WhatsApp</a>
  </div>
</section>`,
});

// portfólio: os filtros saem do próprio acervo
const CAMPOS = [
  { chave: 'estilo', rotulo: 'Estilo' },
  { chave: 'tipo', rotulo: 'Tipo de projeto' },
  { chave: 'cicatrizacao', rotulo: 'Cicatrização' },
  { chave: 'artista', rotulo: 'Artista' },
];
function filtros() {
  return CAMPOS.map(({ chave, rotulo }) => {
    const cont = {};
    PECAS.forEach((p) => { const v = p[chave]; if (v) cont[v] = (cont[v] || 0) + 1; });
    const vals = Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
    if (!vals.length) return '';
    return `<div class="filtros__grupo" role="group" aria-label="${rotulo}" data-rotulo="${rotulo}"><span>${rotulo}</span>${vals.map((v) => `<button class="chip" type="button" aria-pressed="false" data-campo="${chave}" data-valor="${esc(chave === 'artista' ? v : slug(v))}">${esc(chave === 'artista' ? nomeArtista(v) : v)}<small>${cont[v]}</small></button>`).join('')}</div>`;
  }).join('');
}
const pecaPublica = (p) => ({ id: p.id, titulo: p.titulo, artista: p.artista, artistaNome: nomeArtista(p.artista), estilo: p.estilo, tipo: p.tipo, cicatrizacao: p.cicatrizacao, regiao: p.regiao, ano: p.ano,
  imagem: p.imagem, antes: p.antes, provisoria: PREVIA && p.provisoria, origem: PREVIA ? p.origem : null, premio: PREMIOS.find((r) => r.peca === p.id) || null });
const DADOS = { pecas: PECAS.map(pecaPublica), artistas: ART.map((a) => ({ id: a.id, nome: a.nome })), whatsapp: E.whatsapp.numero, estudio: E.nome, previa: PREVIA };

const portfolio = pagina({
  url: '/portfolio/',
  titulo: 'Portfólio · Tutão Tattoo, Piracicaba',
  descricao: 'Portfólio do Estúdio Tutão Tattoo em Piracicaba: preto e cinza, coberturas e trabalhos cicatrizados. Amplie uma peça e peça um projeto no mesmo estilo.',
  dados: DADOS,
  corpo: `
<div class="dentro cabeca-pagina">
  <p class="rotulo">Acervo</p>
  <h1 class="titulo">Port<span class="acento">fólio</span></h1>
  <p class="lead">Peças reais do estúdio. Amplie uma foto para ver o artista e começar uma conversa sobre um projeto parecido.</p>
</div>
<section class="dentro" style="padding-bottom:clamp(64px,8vw,120px)" aria-label="Galeria">
  ${pend('curadoria', 'As 9 peças vieram dos perfis do Instagram do estúdio, do Tutão e do Alexandre (origem de cada uma no zoom). Nenhuma vai ao site público sem o ok do estúdio e do cliente. O ideal é trocar pelos arquivos originais e incluir antes e depois de coberturas.')}
  <div class="filtros" style="margin-top:24px">${filtros()}
    <div class="filtros__status"><span id="contagem" aria-live="polite">${PECAS.length} peças</span><button class="filtros__limpar" type="button" hidden>Limpar filtros</button></div>
  </div>
  <ul class="galeria">${PECAS.map((p) => `<li class="galeria__item" data-id="${p.id}" data-estilo="${p.estilo ? slug(p.estilo) : ''}" data-tipo="${p.tipo ? slug(p.tipo) : ''}" data-cicatrizacao="${p.cicatrizacao ? slug(p.cicatrizacao) : ''}" data-artista="${p.artista || ''}">
    <a class="peca" href="/portfolio/?peca=${p.id}" data-peca="${p.id}">${seloProv(p.provisoria)}${img(p.imagem.arquivo, p.imagem.alt, p.imagem.largura, p.imagem.altura)}
      <span class="peca__info"><b>${p.id}${nomeArtista(p.artista) ? ' · ' + esc(nomeArtista(p.artista)) : ''}</b><span>${esc(dadosPeca(p) || p.titulo)}</span></span></a></li>`).join('')}</ul>
  <p class="vazio" hidden>Nenhuma peça com essa combinação. <button class="filtros__limpar" type="button">Limpar filtros</button></p>
</section>
<dialog class="caixa" aria-labelledby="caixa-titulo">
  <button class="caixa__fechar" type="button" aria-label="Fechar">×</button>
  <div class="caixa__corpo">
    <div class="caixa__foto"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="1200" height="1500"></div>
    <div class="caixa__texto">
      <p class="rotulo" data-c="id"></p>
      <h2 class="caixa__titulo titulo" id="caixa-titulo"></h2>
      <div class="antes-depois" role="group" aria-label="Antes e depois" hidden><button type="button" aria-pressed="false" data-ver="antes">Antes</button><button type="button" aria-pressed="true" data-ver="depois">Depois</button></div>
      <dl class="caixa__dados"></dl>
      <div class="botoes"><a class="botao botao--acento" data-c="pedir" href="/agendamento/">Quero um projeto nesse estilo</a></div>
      <p class="caixa__origem" hidden></p>
      <div class="caixa__nav"><button type="button" data-ir="-1" aria-label="Peça anterior">←</button><button type="button" data-ir="1" aria-label="Próxima peça">→</button></div>
    </div>
  </div>
</dialog>`,
});

const artistas = pagina({
  url: '/artistas/',
  titulo: 'Artistas · Tutão Tattoo, Piracicaba',
  descricao: 'Conheça Tutão, fundador do Estúdio Tutão Tattoo, com mais de 20 anos de experiência, e a equipe. Escolha o artista e solicite seu agendamento.',
  corpo: `
<div class="dentro cabeca-pagina">
  <p class="rotulo">Quem tatua</p>
  <h1 class="titulo">Artis<span class="acento">tas</span></h1>
  <p class="lead">Escolha pelo trabalho. Cada perfil leva direto ao pedido de agendamento com o artista já preenchido.</p>
</div>
<section class="secao papel inclinada" aria-label="Perfis">
  <div class="grao"></div>
  <div class="dentro" style="display:grid;gap:clamp(48px,7vw,96px)">
    ${ART.map((a) => artistaCard(a, { grande: true })).join('')}
    ${pend('artistas', 'Lista dos artistas em atendimento, com retrato atual, estilos confirmados e as peças de cada um. Perfil só entra com retrato e trabalhos atribuídos.')}
    ${ajudaArtista}
  </div>
</section>`,
});

const premiosHtml = PREMIOS.length ? `<section class="secao" aria-labelledby="premios-titulo"><div class="dentro">
  <div class="secao__topo"><h2 class="secao__titulo titulo" id="premios-titulo">Prê<em>mios</em></h2></div>
  <ul class="artistas-lista">${PREMIOS.map((r) => `<li class="artista revela">${r.foto ? `<div class="artista__retrato">${img(r.foto.arquivo, r.foto.alt, 1000, 1250)}</div>` : ''}
    <p class="artista__papel">${esc(r.ano)} · ${esc(r.colocacao)}</p><h3 class="titulo" style="font-size:40px">${esc(r.evento)}</h3><p>${esc(r.categoria)}${nomeArtista(r.artista) ? ' · ' + esc(nomeArtista(r.artista)) : ''}</p>
    ${r.peca && PECAS.some((p) => p.id === r.peca) ? `<a class="link-seta" href="/portfolio/?peca=${r.peca}">Ver a peça premiada</a>` : ''}</li>`).join('')}</ul></div></section>`
  : (PREVIA ? `<section class="secao"><div class="dentro">${pend('premiações (seção oculta)', 'Seção pronta e escondida. Para publicar cada prêmio: foto, evento, ano, categoria, colocação, artista e o comprovante. Se houver foto da tatuagem premiada, ela fica ligada à peça no portfólio.')}</div></section>` : '');

const estudio = pagina({
  url: '/estudio/',
  titulo: 'O estúdio e a trajetória · Tutão Tattoo, Piracicaba',
  descricao: 'O Estúdio Tutão Tattoo fica na Rua do Rosário, 123, no Alto, em Piracicaba. Conheça o espaço, a equipe e a trajetória de Tutão, com mais de 20 anos de experiência.',
  corpo: `
<div class="dentro cabeca-pagina">
  <p class="rotulo">Rua do Rosário, 123 · Alto</p>
  <h1 class="titulo">O es<span class="acento">túdio</span></h1>
  <p class="lead">O espaço, a equipe e a trajetória de quem está há mais de duas décadas tatuando.</p>
</div>
${FOTOS_ESPACO.length ? `<section class="dentro" style="padding-bottom:clamp(56px,7vw,100px)" aria-label="Fotos do espaço">${sanfona(FOTOS_ESPACO)}<div style="margin-top:20px">${pend('fotos e vídeo do espaço', 'Fotos atuais da fachada, recepção, salas e equipe. O vídeo “Conheça um pouco mais a estrutura do estúdio Tutão Tattoo” (Facebook) entra aqui se mostrar a sede atual e o estúdio mandar o original.')}</div></section>` : ''}
<section class="secao papel inclinada" aria-labelledby="traj">
  <div class="grao"></div>
  <div class="dentro duas-col">
    <div><p class="rotulo" style="margin-bottom:18px">Trajetória</p><h2 class="frase titulo" id="traj">Tutão. <span class="acento">Mais de 20 anos</span> de tatuagem.</h2></div>
    <div style="display:grid;gap:18px">
      <p class="lead">${esc(E.fundador.nome)}, o Tutão, é o fundador do estúdio e soma ${esc(E.fundador.experiencia)}.</p>
      ${MARCOS.length ? `<ul class="marcos">${MARCOS.map((m) => `<li>${esc(m.texto)}${!m.confirmado ? '<span class="rascunho">a confirmar</span>' : ''}</li>`).join('')}</ul>` : ''}
      ${pend('linha do tempo', 'Ano de abertura do estúdio e outros marcos. Os itens acima vieram do Instagram e só vão ao site público com o ok do estúdio; prêmios só com foto do troféu ou certificado.')}
      <a class="botao botao--escuro" href="/agendamento/?artista=tutao" style="justify-self:start" data-evento="agendar_clique" data-origem="estudio">Solicitar com Tutão</a>
    </div>
  </div>
</section>
${premiosHtml}
${SERVICOS ? `<section class="secao" aria-labelledby="serv"><div class="dentro">
  <div class="secao__topo"><h2 class="secao__titulo titulo" id="serv">Também <em>no estúdio</em></h2></div>
  <div class="artistas-lista">${SERVICOS.itens.map((s) => `<div class="ajuda-artista"><h3 class="titulo">${esc(s.nome)}${!E.servicos.confirmado ? '<span class="rascunho">a confirmar</span>' : ''}</h3><p>${esc(s.texto)}</p></div>`).join('')}</div>
  ${!E.servicos.confirmado ? `<div style="margin-top:22px">${pend('serviços complementares', 'O Facebook cita piercing e um workshop individual de preto e cinza (27/08/2026). Confirmar se seguem ativos, quem atende e como contratar.')}</div>` : ''}
</div></section>` : ''}`,
});

const contato = pagina({
  url: '/contato/',
  titulo: 'Contato e como chegar · Tutão Tattoo, Piracicaba',
  descricao: 'Endereço, WhatsApp, telefone e redes do Estúdio Tutão Tattoo: Rua do Rosário, 123, Alto, Piracicaba–SP. Perguntas frequentes sobre orçamento, agenda e coberturas.',
  corpo: `
<div class="dentro cabeca-pagina">
  <p class="rotulo">Fale com o estúdio</p>
  <h1 class="titulo">Con<span class="acento">tato</span></h1>
</div>
<section class="dentro local" style="padding-bottom:clamp(64px,8vw,110px)" aria-label="Endereço e canais">
  <div style="display:grid;gap:22px;align-content:start">
    <address class="endereco">Rua do Rosário, 123<br><span style="color:var(--acento-no-escuro)">Alto · Piracicaba–SP</span></address>
    <p class="lead">CEP ${esc(E.endereco.cep)}</p>
    <div class="botoes">
      <a class="botao" href="${rotaUrl}" target="_blank" rel="noopener" data-evento="rota_clique" data-origem="contato">Como chegar</a>
      <a class="botao botao--zap" href="${ZAP_CURTO}" target="_blank" rel="noopener" data-evento="whatsapp_clique" data-origem="contato">${ICONE.zap}Falar no WhatsApp</a>
      <a class="botao botao--acento" href="/agendamento/" data-evento="agendar_clique" data-origem="contato">Solicitar agendamento</a>
    </div>
    ${E.mapa.confirmado ? '' : pend('Google Maps', 'Link da ficha do Google do estúdio. Enquanto isso, “Como chegar” abre a rota pelo endereço.')}
  </div>
  <div style="display:grid;gap:26px">${blocoHorarios()}${contatosLista()}</div>
</section>
${FAQ_VIS.length ? `<section class="secao papel inclinada" aria-labelledby="faq-titulo">
  <div class="grao"></div>
  <div class="dentro">
    <div class="secao__topo"><h2 class="secao__titulo titulo" id="faq-titulo">Dúvidas <em>frequentes</em></h2></div>
    ${FAQ_VIS.some((q) => !q.aprovado) ? `<div style="margin-bottom:22px">${pend('respostas', 'Rascunhos para a equipe aprovar ou corrigir. Só as respostas aprovadas aparecem no site público.')}</div>` : ''}
    <div class="faq">${FAQ_VIS.map((q) => `<details><summary>${esc(q.pergunta)}${!q.aprovado && PREVIA ? '<span class="rascunho">rascunho</span>' : ''}</summary><p>${esc(q.resposta)}</p></details>`).join('')}</div>
  </div>
</section>` : ''}`,
});

const opcoes = (nome, lista, tipo = 'radio') => `<div class="opcoes">${lista.map((v) => `<label class="opcao"><input type="${tipo}" name="${nome}" value="${esc(v)}"><span>${esc(v)}</span></label>`).join('')}</div>`;
const agendamento = pagina({
  url: '/agendamento/',
  titulo: 'Solicitar agendamento · Tutão Tattoo, Piracicaba',
  descricao: 'Conte sua ideia de tatuagem ao Estúdio Tutão Tattoo, em Piracicaba. O pedido segue pelo WhatsApp, onde a equipe confirma orçamento, disponibilidade e horário.',
  dados: DADOS,
  semZap: true,
  corpo: `
<div class="dentro cabeca-pagina">
  <p class="rotulo">Agendamento</p>
  <h1 class="titulo">Conte sua <span class="acento">ideia</span></h1>
  <p class="lead">Leva um minuto. No fim, a mensagem fica pronta no WhatsApp do estúdio para você enviar.</p>
</div>
<section class="secao papel inclinada" aria-label="Formulário">
  <div class="grao"></div>
  <div class="dentro agendar">
    <form class="form" id="form-agendar" novalidate>
      <div class="ref-peca" hidden><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="72" height="90"><div><p class="rotulo">Referência do portfólio</p><b data-ref></b></div><button type="button" data-tirar-ref>Tirar</button></div>
      <div class="campo"><label for="f-nome">Seu nome</label><input id="f-nome" name="nome" type="text" autocomplete="name" maxlength="80" required></div>
      <div class="campo"><label for="f-ideia">Ideia da tattoo</label><textarea id="f-ideia" name="ideia" maxlength="800" required aria-describedby="f-ideia-dica"></textarea><small id="f-ideia-dica">O que você imagina: tema, elementos, se já tem referência. As imagens você manda na conversa.</small></div>
      <div class="campo--duplo">
        <div class="campo"><label for="f-regiao">Região do corpo</label><select id="f-regiao" name="regiao"><option value="">Escolha</option>${['Braço', 'Antebraço', 'Mão', 'Ombro', 'Costas', 'Peito', 'Costela', 'Barriga', 'Perna', 'Coxa', 'Panturrilha', 'Pé', 'Pescoço', 'Outra', 'Ainda não sei'].map((v) => `<option>${v}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-tamanho">Tamanho aproximado</label><select id="f-tamanho" name="tamanho"><option value="">Escolha</option>${['Pequena (até 10 cm)', 'Média (10 a 20 cm)', 'Grande (mais de 20 cm)', 'Fechamento (braço, perna, costas)', 'Ainda não sei'].map((v) => `<option>${v}</option>`).join('')}</select></div>
      </div>
      <fieldset class="campo"><legend>É cobertura de uma tatuagem antiga?</legend>${opcoes('cobertura', ['Não', 'Sim', 'Não sei'])}<small>Se for, mande uma foto nítida da tatuagem atual na conversa.</small></fieldset>
      <div class="campo"><label for="f-artista">Preferência de artista</label><select id="f-artista" name="artista">${ART.map((a) => `<option value="${a.id}">${esc(a.nome)}</option>`).join('')}<option value="ajuda">Quero ajuda para escolher um artista</option></select></div>
      <fieldset class="campo"><legend>Dias que você pode</legend>${opcoes('dias', ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], 'checkbox')}</fieldset>
      <fieldset class="campo"><legend>Períodos</legend>${opcoes('periodos', ['Manhã', 'Tarde', 'Qualquer horário'], 'checkbox')}<small>São preferências. A equipe confirma a disponibilidade na conversa.</small></fieldset>
      <p class="erro" role="alert" hidden></p>
      <p class="aviso">Ao continuar, o WhatsApp abre com a mensagem pronta. Nada é enviado sem você tocar em enviar. Veja a <a href="/privacidade/">privacidade</a>.</p>
      <div><button class="botao botao--zap" type="submit">${ICONE.zap}Continuar no WhatsApp</button></div>
      <div class="pronto" hidden tabindex="-1">
        <h2 class="titulo">Falta só enviar</h2>
        <ol><li>Na conversa que abriu, toque em <b>enviar</b>.</li><li>Mande ali suas referências e fotos (e a tatuagem atual, se for cobertura).</li><li>A equipe confirma disponibilidade, orçamento e horário.</li></ol>
        <p>O WhatsApp não abriu? <a data-zap-link href="#" target="_blank" rel="noopener" style="color:inherit;font-weight:700">Toque aqui para abrir a conversa</a>.</p>
      </div>
    </form>
    <aside>
      <ol class="passos">
        <li><div><b>Você conta a ideia</b><p class="aviso">Região, tamanho, se é cobertura e quando pode.</p></div></li>
        <li><div><b>Envia pelo WhatsApp</b><p class="aviso">A mensagem já vai organizada. Referências e fotos você manda na própria conversa.</p></div></li>
        <li><div><b>A equipe confirma</b><p class="aviso">Disponibilidade, orçamento e horário são combinados na conversa. O horário só fica reservado depois dessa confirmação.</p></div></li>
      </ol>
    </aside>
  </div>
</section>`,
});

const privacidade = pagina({
  url: '/privacidade/',
  titulo: 'Privacidade · Tutão Tattoo',
  descricao: 'Como o site do Estúdio Tutão Tattoo trata os dados de quem pede um agendamento.',
  corpo: `
<div class="dentro cabeca-pagina"><h1 class="titulo">Privaci<span class="acento">dade</span></h1></div>
<section class="dentro" style="padding-bottom:100px;display:grid;gap:18px;max-width:760px">
  ${pend('responsável e revisão', 'Razão social e CNPJ do estúdio, e-mail para pedidos sobre dados e revisão jurídica deste texto.')}
  <p><b>Responsável:</b> ${esc(E.razaoSocial || E.nome)}${E.cnpj ? `, CNPJ ${esc(E.cnpj)}` : ''}, ${esc(enderecoLinha)}.</p>
  <p><b>O que o site coleta:</b> nada fica guardado neste site. O formulário de agendamento só monta uma mensagem no seu aparelho e abre o WhatsApp do estúdio. A mensagem só chega ao estúdio se você tocar em enviar.</p>
  <p><b>Para que usamos:</b> os dados da conversa (nome, ideia, região, tamanho, preferência de dias e as imagens que você mandar) servem para responder o orçamento e combinar o agendamento.</p>
  <p><b>Base legal:</b> procedimentos preliminares a pedido do titular (art. 7º, V, da LGPD).</p>
  <p><b>Medição:</b> ${'o site pode contar cliques nos botões de WhatsApp, de rotas e o início do formulário, sem nome, texto do projeto ou qualquer dado pessoal.'}</p>
  <p><b>Seus direitos:</b> você pode pedir acesso, correção ou exclusão dos seus dados pelo WhatsApp ${esc(E.whatsapp.exibicao)} ou pelo telefone ${esc(E.telefone.exibicao)}.</p>
</section>`,
});

const naoEncontrada = pagina({
  url: '/404',
  titulo: 'Página não encontrada · Tutão Tattoo',
  descricao: 'Página não encontrada.',
  corpo: `<div class="dentro cabeca-pagina" style="min-height:50svh"><p class="rotulo">Erro 404</p><h1 class="titulo">Essa página <span class="acento">não existe</span></h1><div class="botoes" style="margin-top:28px"><a class="botao" href="/">Ir para o início</a><a class="botao botao--acento" href="/portfolio/">Ver portfólio</a></div></div>`,
});

// ---------- grava ----------
const ROTAS = { '/': home, '/portfolio/': portfolio, '/artistas/': artistas, '/estudio/': estudio, '/contato/': contato, '/agendamento/': agendamento, '/privacidade/': privacidade, '/404': naoEncontrada };
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });
writeFileSync(join(DIST, 'assets', CSS.nome), CSS.c);
writeFileSync(join(DIST, 'assets', JS.nome), JS.c);
// imagens: na prévia vai tudo; na versão pública só as que alguma página usa (nada provisório vaza)
const html = Object.values(ROTAS).join('\n');
const usadas = new Set([...html.matchAll(/\/img\/([^"'\s)]+)/g)].map((m) => decodeURI(m[1])));
PECAS.forEach((p) => { usadas.add(p.imagem.arquivo); if (p.antes) usadas.add(p.antes.arquivo); }); // a ampliação lê do JSON
cpSync(join(RAIZ, 'public'), DIST, { recursive: true, filter: (src) => {
  const rel = src.split('/public/')[1];
  if (!rel || PREVIA || !rel.startsWith('img/')) return true;
  if (existsSync(src) && !/\.[a-z0-9]+$/i.test(rel)) return true; // pastas
  return usadas.has(rel.slice(4)) || rel === 'img/og.jpg' || rel === 'img/grao.png';
} });
// fontes locais (Fontsource, licença OFL: uso comercial livre)
mkdirSync(join(DIST, 'fonts'), { recursive: true });
const nm = (p) => join(RAIZ, 'node_modules/@fontsource-variable', p);
cpSync(nm('big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2'), join(DIST, 'fonts/big-shoulders.woff2'));
cpSync(nm('hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2'), join(DIST, 'fonts/hanken.woff2'));
cpSync(nm('azeret-mono/files/azeret-mono-latin-wght-normal.woff2'), join(DIST, 'fonts/azeret.woff2'));

for (const [rota, conteudo] of Object.entries(ROTAS)) {
  const arq = rota === '/404' ? join(DIST, '404.html') : join(DIST, rota, 'index.html');
  mkdirSync(dirname(arq), { recursive: true });
  writeFileSync(arq, conteudo);
}
// robots e sitemap: a prévia fecha tudo; a pública lista as páginas reais
writeFileSync(join(DIST, 'robots.txt'), PREVIA ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
if (!PREVIA) {
  const hoje = new Date().toISOString().slice(0, 10);
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/portfolio/', '/artistas/', '/estudio/', '/contato/', '/agendamento/', '/privacidade/'].map((u) => `  <url><loc>${BASE}${u}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}\n</urlset>\n`);
}
// cabeçalhos de segurança: ficam no vercel.json da raiz (a Vercel lê antes do build). Endereços *.vercel.app sempre noindex.

// trava final da versão pública: nenhum texto de pendência pode sobrar
if (!PREVIA) {
  const sobra = /(pendência|provisória|rascunho|\[preencher\]|a confirmar|lorem)/i;
  for (const [rota, conteudo] of Object.entries(ROTAS)) {
    const txt = conteudo.replace(/<[^>]+>/g, ' ');
    if (sobra.test(txt)) { console.error(`Texto provisório em ${rota}: ${txt.match(sobra)[0]}`); process.exit(1); }
  }
}
console.log(`dist/ pronto (${MODO}): ${Object.keys(ROTAS).length} páginas, ${PECAS.length} peças, ${ART.length} artista(s).`);
