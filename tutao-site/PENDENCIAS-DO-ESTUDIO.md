# Pendências do Estúdio Tutão Tattoo (para o site ir ao ar)

Situação em 26/11/2026 (atualizada à tarde com as fotos e a equipe vistas no Instagram). Nada foi enviado ao estúdio; o Miguel apresenta a prévia e pede o material.

| # | O que falta | Para quê | Onde entra |
|---|---|---|---|
| 1 | **Mídia original aprovada**: foto de abertura de impacto (com recorte para celular e computador), de 12 a 20 peças começando por preto e cinza, coberturas e cicatrizados, fotos atuais da fachada, recepção, salas e equipe na Rua do Rosário, 123, e o vídeo curto do espaço se houver | Galeria, abertura, página do estúdio | `public/img/` + `pecas.json` / `espaco.json` |
| 2 | **Dados de cada foto**: artista, estilo, tipo de projeto, se está cicatrizada, região, ano, autoria e **autorização do cliente** quando ele for identificável. Antes e depois só do mesmo trabalho | Filtros, ampliação, LGPD | `pecas.json` |
| 3 | **Ok para as 9 peças tiradas do Instagram** (P01–P09, origem e post de cada uma em `pecas.json`) e, se possível, os arquivos originais delas. Confirmar quem fez a águia cicatrizada (P06, post do perfil do estúdio) | O portfólio da prévia já usa essas fotos; no site público só entram com o ok | `pecas.json` |
| 4 | **Equipe**: confirmar que o **Alexandre Fischer Rodrigues** (@alexandre_fischer1, fechamentos sombreados) atende no estúdio e aceita aparecer; retrato atual dele e do Tutão; confirmar os estilos tirados do Instagram (Tutão: realismo, retrato, sombreado, colorido, coberturas; Alexandre: fechamentos, sombreado, preto e cinza, oriental). Há mais alguém? | Página de artistas e filtro por artista | `artistas.json` |
| 5 | **Prêmios documentados** (a bio fala em premiações nacionais e internacionais) e ok para os marcos tirados do Instagram: jurado no 13º Piracicaba Tattoo Fest (16 a 18/10/2026) e trabalhos no Brasil, Argentina, México e Espanha. Prêmios: foto, evento, ano, categoria, colocação, artista e comprovante; foto da tatuagem premiada se houver | Seção de premiações (escondida até lá) | `premios.json` |
| 6 | **Horários** de atendimento (o índice Glartent mostra seg–sex 10h–18h30 e sáb 9h–14h: confirmar) | Contato e dados do Google | `estudio.json` |
| 7 | **Serviços complementares**: piercing e o workshop/mentoria de preto e cinza seguem ativos? Quem atende? | Página do estúdio | `estudio.json` |
| 8 | **Respostas do FAQ** aprovadas (orçamento, agenda, referências, coberturas, escolha de artista). Rascunhos prontos | Contato | `faq.json` |
| 9 | **Ficha do Google**: link do Perfil da Empresa e acesso de gerente para o Miguel; conferir **o que abre hoje no botão "Site"** da ficha antes de definir domínio ou migração | Botão "Como chegar", dados estruturados, SEO local | `estudio.json` → `mapa` |
| 10 | **Domínio**: já existe? Em nome de quem? Se não, registrar no CNPJ do estúdio (Registro.br) | Endereço final | `estudio.json` → `dominio` |
| 11 | **Razão social e CNPJ** | Página de privacidade (responsável) | `estudio.json` |
| 12 | **Logotipo oficial** (SVG ou PNG grande) | Cor de destaque, nav, imagem de compartilhamento | `public/img/marca/`, `--acento` |
| 13 | Agenda: o estúdio usa alguma agenda online por artista? | Integração futura (só mostrar horário real) | `src/js/site.js` |

## Rascunho de mensagem para o Miguel mandar ao estúdio (não enviado)

> Oi, Tutão! Montei uma prévia do site do estúdio para você ver como fica: [link da prévia]. Usei trabalhos que já estão no Instagram de vocês e do Alexandre, mas nada vai para o site oficial sem o ok de vocês.
> Para deixar pronto, preciso de:
> 1. As fotos originais (sem print do Instagram) das tattoos que vocês querem no portfólio, começando por preto e cinza, coberturas e cicatrizadas, com o nome do artista de cada uma. Se o cliente aparece, só com autorização dele.
> 2. Fotos atuais da fachada, recepção, salas e equipe, e uma foto forte para a abertura.
> 3. Se o Alexandre faz parte da equipe e quer aparecer, se há mais algum artista, e uma foto de cada um.
> 4. Horários, e se piercing e o workshop de preto e cinza continuam.
> 5. Prêmios com foto ou certificado.
> 6. Se já existe domínio e o acesso à ficha do Google.
> Com isso eu fecho e coloco no ar.
