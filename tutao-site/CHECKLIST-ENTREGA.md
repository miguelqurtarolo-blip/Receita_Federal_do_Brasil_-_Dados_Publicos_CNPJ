# Ficha de entrega · Site Estúdio Tutão Tattoo
Regra: `04 Operação/Checklist de entrega de sites` (24/11/2026). Só vira "entregue" com A e B completas.
Site: Estúdio Tutão Tattoo · Domínio: a definir · Endereço de teste: prévia Vercel `tutao-tattoo-previa` (protegida)

## Antes de começar
- [ ] Domínio no nome do cliente · pendente (pendência 10)
- [ ] Dados reais confirmados por escrito (horários, serviços, artistas, CNPJ) · pendente
- [ ] Conta Google do cliente definida (Search Console e Perfil da Empresa) · pendente
- [ ] Autorizações de imagem guardadas (clientes identificáveis) · pendente

## Parte A · Segurança (antes do ar)
| # | Passo | Situação em 26/11/2026 |
|---|---|---|
| A1 | HTTPS e redirecionamentos | Vercel cuida; testar no domínio real (http→https, www) |
| A2 | Cabeçalhos | `vercel.json`: CSP sem unsafe-eval com frame-ancestors 'none', HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP, CORP. Conferir no endereço publicado |
| A3 | Formulário | Sem servidor: só monta a mensagem e abre o WhatsApp. Testado com acentos, `&` e `<b>` (vira texto, não código). Validação de nome e ideia com foco no campo |
| A4 | Privacidade/LGPD | Página `/privacidade/` pronta; falta razão social, CNPJ e revisão jurídica. Sem rastreador = sem banner |
| A5 | Segredos | Nenhuma chave no código (site estático) |
| A6 | Dependências | Só fontes (Fontsource) e axe-core em desenvolvimento; `npm audit` sem alertas |
| A7 | Terceiros | Nada externo carrega: fontes locais, sem embed do Instagram, sem mapa embutido. Links externos com `rel="noopener"` |
| A8 | Acessibilidade | axe sem erro sério em todas as páginas (desktop e celular); teclado na galeria, ampliação (setas, Esc, foco volta), menu, sanfona e formulário |
| A9 | Links, imagens, telas | Testado local: sem 404, sem erro de console, sem rolagem lateral em 390×844, 390×660, 820 e 1440. Repetir no domínio. A versão pública bloqueia se sobrar texto provisório |
| A10 | Contatos de verdade | WhatsApp 5519987111620, telefone (19) 3371-0339, rota pelo endereço. Conferir no celular real após publicar |
| A11 | Contas e acesso | 2FA na Vercel/GitHub/Registro.br; tag `v1-entrega` no código |

## Parte B · Google e SEO (logo depois do ar)
| # | Passo | Situação |
|---|---|---|
| B1 | Base de SEO | Títulos e descrições únicos com "Tutão Tattoo" e "estúdio de tatuagem em Piracicaba", canonical, Open Graph 1200×630, favicon, sitemap e robots gerados no modo público, conteúdo sem JavaScript ✓ |
| B2 | Dados estruturados | JSON-LD `TattooParlor` com nome, endereço, telefone, fundador e redes; horário e mapa entram quando confirmados. Validar no Rich Results Test |
| B3 | Velocidade | Medir no PageSpeed após as fotos reais (meta ≥ 90 no celular) |
| B4 | Search Console | Propriedade de domínio na conta do estúdio, verificação TXT |
| B5 | Sitemap | Enviar `https://DOMINIO/sitemap.xml` |
| B6 | Indexação | Pedir indexação de /, /portfolio/, /artistas/, /contato/, /agendamento/ |
| B7 | Busca local | No Perfil da Empresa: botão "Site" = domínio novo; mesmo nome, endereço e telefone do site. Bing Webmaster importando do Search Console |
| B8 | Retorno em 14 dias | Indexação e primeiras buscas |

## Depois do ar: links que mudam
- Bio do Instagram @studiotutaotattoo e @tutao_tattoo: link do site (ou manter o Linktree com o site como 1º botão e um botão "Agendar" para `/agendamento/`).
- Linktree: adicionar "Site" e "Solicitar agendamento".
- Perfil da Empresa no Google: campo Site e, se houver, link de agendamento → `/agendamento/`.
- Facebook: campo Site.
