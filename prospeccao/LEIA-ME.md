# Filtro de prospecção (Oficina Conectada)

`filtrar_oficinas.py` lê os arquivos abertos do CNPJ da Receita Federal direto dos .zip, sem PostgreSQL, e gera lotes de oficinas ativas para colar no painel **Operação de Sites** (Pesquisa > Colar lote).

- Filtro: UF SP, cidades dos chips do painel (Campinas e região, Piracicaba e região), CNAE principal 4520-0/01, 02, 03 e 05, situação ATIVA.
- Saída: `lotes_AAAA-MM-DD/chip01_lote001.txt` (50 por arquivo) e `conferencia.csv` para abrir no Excel.
- Precisa: Python 3.8+ (só biblioteca padrão), cerca de 5 a 6 GB livres para os zips, internet para o download.
- Rodar 1 vez por mês, depois que a Receita publica o mês novo. O painel ignora CNPJ repetido, então reimportar é seguro.

Cuidados (LGPD e regras do Miguel):
- Só dados de empresa. O filtro não lê sócios nem e-mails e tira o CPF do fim da razão social de empresário individual (marcado na conferência).
- Nada é enviado a ninguém. O painel só prepara rascunhos; o Miguel revisa e envia.
- Na primeira mensagem, dizer de onde veio o contato (cadastro público de CNPJ) e oferecer saída ("se não quiser receber, é só avisar"). Pedido de parar vira bloqueio no painel.
- O script original do repositório (`code/ETL_coletar_dados_e_gravar_BD.py`) aponta para um endereço antigo da Receita e não baixa mais nada sem ajuste.
