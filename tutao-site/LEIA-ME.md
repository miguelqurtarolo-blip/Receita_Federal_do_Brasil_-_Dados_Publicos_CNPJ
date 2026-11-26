# Site do Estúdio Tutão Tattoo

Site estático, sem framework: um gerador (`build.mjs`) lê os arquivos de `conteudo/` e grava as páginas prontas em `dist/`. Base visual a partir da template **Kromo** (ProfitizeBuild, licença para projeto de cliente; não publicar o prompt): títulos condensados gigantes, borda inclinada entre seções, cópias de papel, sanfona de fotos, grão, menu de tela cheia. Adaptado para carvão + off-white e movimento discreto (respeita "reduzir movimento").

## Páginas
`/` início · `/portfolio/` galeria com filtros e ampliação · `/artistas/` · `/estudio/` (espaço, trajetória, prêmios, serviços) · `/contato/` (endereço, rotas, canais, horários, dúvidas) · `/agendamento/` (formulário → WhatsApp) · `/privacidade/` · `404.html`.

## Dois modos
| Comando | Para quê | O que muda |
|---|---|---|
| `node build.mjs --modo=previa` (padrão) | prévia privada para validar com o estúdio | mostra fotos provisórias com selo, caixas amarelas de pendência, rascunhos do FAQ, `noindex`, `robots.txt` fechado |
| `node build.mjs --modo=publico` | site no ar | só itens aprovados; esconde seções sem conteúdo; gera `sitemap.xml`; **para com erro** se faltar domínio, CNPJ, foto de abertura, 6 peças aprovadas ou se sobrar texto provisório |

Na Vercel o modo vem da variável `SITE_MODO` (sem ela = prévia). Qualquer endereço `*.vercel.app` sai sempre com `X-Robots-Tag: noindex` (regra no `vercel.json`).

## Atualizar o conteúdo (sem mexer em código)
Tudo fica em `conteudo/`. Cada arquivo começa com um campo `_leia` explicando os campos.

- **estudio.json**: dados do estúdio. Campo com `"confirmado": false` só aparece na prévia. Preencher `dominio`, `cnpj`, `razaoSocial`; ao confirmar horários, trocar para `"confirmado": true` e preencher `schemaOrg` (ex.: `["Mo-Fr 10:00-18:30","Sa 09:00-14:00"]`).
- **pecas.json**: o portfólio. `estilo`, `tipo` e `cicatrizacao` são campos separados; os filtros saem deles (valor `null` não vira filtro). `artista` = id de `artistas.json`. Cobertura com antes e depois: preencher `antes` só se as duas fotos forem do mesmo trabalho. Registrar `origem`, `autoria`, `autorizacaoCliente`. Publica quando `"aprovada": true` e `"provisoria": false`.
- **artistas.json**: um perfil por artista confirmado (`"confirmado": true`), com retrato, estilos e Instagram. As peças atribuídas aparecem sozinhas no perfil.
- **premios.json**: só prêmios com comprovante. Lista vazia = seção escondida. Campo `peca` liga o prêmio à foto no portfólio.
- **faq.json**: perguntas; no público só as com `"aprovado": true`.
- **espaco.json**: fotos do espaço e a foto de abertura (desktop 16:9 e celular 3:4, recortes próprios).

### Trocar uma foto provisória por uma real
1. Salvar a foto aprovada em `public/img/...` (pode ser o mesmo nome, mesma proporção: peças 4:5, ~1200×1500; espaço 3:2, ~1600×1067; abertura 2400×1350 e 1080×1440). JPG de qualidade 75–80, até ~300 KB. Não aplicar filtro que esconda o acabamento; preservar o tom de pele.
2. No JSON: ajustar `alt` (descrição real), `largura`/`altura`, marcar `"provisoria": false`, `"aprovada": true`.
3. Rodar `node build.mjs` e conferir.

As marcações provisórias são geradas por `node scripts/placeholders.mjs` (precisa do Playwright). `scripts/marca.mjs` gera a imagem de compartilhamento (`og.jpg`) e o ícone; refazer quando chegar o logotipo oficial e trocar `--acento` em `src/css/site.css` pela cor dele.

## WhatsApp e agendamento
- "Falar no WhatsApp": abre `wa.me/5519987111620` com uma mensagem curta.
- "Solicitar agendamento": formulário curto (nome, ideia, região, tamanho, cobertura, artista, dias e períodos; região e tamanho têm "Ainda não sei"). O botão **Continuar no WhatsApp** monta a mensagem legível, codifica na URL e abre a conversa. Nada é gravado em servidor. Se a pessoa veio de uma peça, a mensagem leva o código da peça, o estilo e o artista.
- Agenda real: só mostrar horários quando houver integração por artista (bloqueios, duração e confirmação de reserva). O ponto de encaixe está marcado no fim de `src/js/site.js`. Até lá, dias e períodos são preferências.

## Medição
`src/js/site.js` → função `medir()`. Liga sozinha se houver Vercel Web Analytics (`window.va`) ou `dataLayer` (GTM/GA4). Eventos: `whatsapp_clique`, `agendar_clique`, `rota_clique`, `telefone_clique`, `estilo_clique`, `formulario_inicio`, `formulario_whatsapp`. Só vão nome do evento, origem, página, código da peça e id do artista; nunca nome, texto do projeto ou telefone. Recomendado: Vercel Web Analytics (sem cookies, não exige banner). GA4 ou Pixel pedem banner e ajuste na privacidade.

## Rodar e testar
```
npm install
node build.mjs              # prévia em dist/
npm run serve               # http://localhost:4173
npm run teste               # 165 checagens (Playwright + axe): páginas, filtros, ampliação, teclado, WhatsApp com acentos, rotas, rolagem lateral
```

## Publicar
- **Prévia (agora)**: projeto Vercel `tutao-tattoo-previa`, deploy de prévia protegido pelo login da Vercel. Para mostrar ao estúdio, gerar um link de compartilhamento no painel (Share) ou pedir ao Claude.
- **Produção (depois das pendências)**: ver `CHECKLIST-ENTREGA.md`. Resumo: preencher conteúdo e domínio → `SITE_MODO=publico` na Vercel → deploy de produção → domínio → Search Console → atualizar links do Instagram e do Perfil da Empresa.
