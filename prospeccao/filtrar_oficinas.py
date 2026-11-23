"""
Filtro leve de prospecção (Oficina Conectada).

Lê os arquivos abertos do CNPJ da Receita Federal (Estabelecimentos, Empresas,
Municipios) direto dos .zip, sem banco de dados, e gera lotes prontos para colar
no painel Operação de Sites (tela Pesquisa > "Colar lote"), no formato:

    cnpj;nome;fantasia;cidade;telefone;situacao;cnae

Só usa dados de empresa. Não lê a tabela de sócios nem e-mails, tira o CPF que
aparece no fim da razão social de empresário individual e não envia nada a
ninguém: só grava arquivos no disco para o Miguel revisar.

Uso (Python 3.8+, só biblioteca padrão):

    python filtrar_oficinas.py                       # baixa o mês mais recente e filtra
    python filtrar_oficinas.py --pasta C:\\cnpj\\2026-11  # usa zips já baixados
    python filtrar_oficinas.py --mes 2026-10 --tamanho-lote 50

Por padrão usa os CNAEs e as cidades dos dois chips configurados no painel
(Campinas e região, Piracicaba e região).
"""
import argparse
import csv
import io
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from datetime import date

BASE = "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/"

# Mesmos valores da configuração padrão do painel (core.js > configPadrao)
CNAES_PADRAO = ["4520-0/01", "4520-0/02", "4520-0/03", "4520-0/05"]
TERRITORIOS_PADRAO = {
    "chip01": ("Campinas e região", ["Campinas", "Valinhos", "Vinhedo", "Sumaré", "Hortolândia", "Paulínia", "Indaiatuba"]),
    "chip02": ("Piracicaba e região", ["Piracicaba", "Rio das Pedras", "Saltinho", "Charqueada", "Santa Bárbara d'Oeste", "Limeira"]),
}
UF_PADRAO = "SP"
NATUREZA_EMPRESARIO_INDIVIDUAL = "2135"

csv.field_size_limit(10_000_000)


def norm(txt):
    t = unicodedata.normalize("NFKD", txt or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]", "", t.upper())


def cnae_fmt(c):
    c = re.sub(r"\D", "", c or "").zfill(7)
    return f"{c[:4]}-{c[4]}/{c[5:]}"


def cnpj_fmt(basico, ordem, dv):
    d = (basico or "").zfill(8) + (ordem or "").zfill(4) + (dv or "").zfill(2)
    return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"


def tel_fmt(ddd, tel):
    ddd = re.sub(r"\D", "", ddd or "")
    tel = re.sub(r"\D", "", tel or "")
    if not tel:
        return ""
    meio = len(tel) - 4
    return (f"({ddd}) " if ddd else "") + tel[:meio] + "-" + tel[meio:]


def limpar(txt):
    # o painel separa colunas por ";"
    return re.sub(r"\s+", " ", (txt or "").replace(";", ",")).strip()


def sem_cpf(razao):
    # empresário individual: a Receita põe o CPF no fim da razão social
    return re.sub(r"\s*\d{11}\s*$", "", razao or "").strip()


def linhas_zip(caminho):
    with zipfile.ZipFile(caminho) as z:
        for nome in z.namelist():
            with z.open(nome) as f:
                yield from csv.reader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";", quotechar='"')


# ---------------- download ----------------

def abrir(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "filtro-cnpj/1.0"}), timeout=120)


def mes_mais_recente():
    html = abrir(BASE).read().decode("utf-8", "ignore")
    meses = sorted(set(re.findall(r'href="(\d{4}-\d{2})/?"', html)))
    if not meses:
        raise RuntimeError("Não achei pastas de mês em " + BASE)
    return meses[-1]


def baixar(mes, pasta):
    os.makedirs(pasta, exist_ok=True)
    nomes = ["Municipios.zip"] + [f"Estabelecimentos{i}.zip" for i in range(10)] + [f"Empresas{i}.zip" for i in range(10)]
    for nome in nomes:
        destino = os.path.join(pasta, nome)
        url = BASE + mes + "/" + nome
        with abrir(url) as r:
            total = int(r.headers.get("Content-Length") or 0)
            if os.path.isfile(destino) and total and os.path.getsize(destino) == total:
                print("já baixado:", nome)
                continue
            print(f"baixando {nome} ({total / 1e6:.0f} MB)...")
            with open(destino + ".part", "wb") as out:
                while True:
                    bloco = r.read(1 << 20)
                    if not bloco:
                        break
                    out.write(bloco)
        os.replace(destino + ".part", destino)


# ---------------- filtro ----------------

def zips(pasta, prefixo):
    achados = sorted(os.path.join(pasta, n) for n in os.listdir(pasta) if n.lower().startswith(prefixo.lower()) and n.lower().endswith(".zip"))
    if not achados:
        raise RuntimeError(f"Nenhum {prefixo}*.zip em {pasta}")
    return achados


def filtrar(pasta, cnaes, territorios, uf):
    cnaes_num = {re.sub(r"\D", "", c) for c in cnaes}
    alvo = {}  # nome normalizado -> (chip, nome como está no painel)
    for chip, (_, cidades) in territorios.items():
        for c in cidades:
            alvo[norm(c)] = (chip, c)

    municipios = {}
    for lin in linhas_zip(zips(pasta, "Municipios")[0]):
        if len(lin) >= 2 and norm(lin[1]) in alvo:
            municipios[lin[0].strip()] = alvo[norm(lin[1])]
    faltando = set(v[1] for v in alvo.values()) - set(v[1] for v in municipios.values())
    if faltando:
        print("Aviso: cidades sem código na tabela da Receita:", ", ".join(sorted(faltando)))

    achados = []
    for z in zips(pasta, "Estabelecimentos"):
        print("lendo", os.path.basename(z))
        for e in linhas_zip(z):
            if len(e) < 23 or e[19] != uf or e[20] not in municipios:
                continue
            if e[11] not in cnaes_num or e[5].lstrip("0") != "2":  # 02 = ATIVA
                continue
            chip, cidade = municipios[e[20]]
            achados.append({
                "basico": e[0], "cnpj": cnpj_fmt(e[0], e[1], e[2]), "fantasia": limpar(e[4]),
                "cidade": cidade, "chip": chip, "telefone": tel_fmt(e[21], e[22]),
                "cnae": cnae_fmt(e[11]), "inicio": e[10], "bairro": limpar(e[17]),
            })
    print(len(achados), "estabelecimentos ativos encontrados; buscando razão social...")

    precisa = {a["basico"] for a in achados}
    razao = {}
    for z in zips(pasta, "Empresas"):
        print("lendo", os.path.basename(z))
        for emp in linhas_zip(z):
            if emp and emp[0] in precisa:
                razao[emp[0]] = (sem_cpf(limpar(emp[1])), emp[2] if len(emp) > 2 else "")
    for a in achados:
        nome, natureza = razao.get(a["basico"], ("", ""))
        a["nome"] = nome or a["fantasia"] or "(sem nome)"
        a["fantasia"] = a["fantasia"] or a["nome"]
        a["pessoa_fisica"] = natureza == NATUREZA_EMPRESARIO_INDIVIDUAL
    return achados


def gravar(achados, saida, territorios, tamanho):
    os.makedirs(saida, exist_ok=True)
    resumo = []
    for chip, (territorio, _) in territorios.items():
        do_chip = sorted((a for a in achados if a["chip"] == chip), key=lambda a: (a["cidade"], a["nome"]))
        for n in range(0, len(do_chip), tamanho):
            parte = do_chip[n:n + tamanho]
            arq = os.path.join(saida, f"{chip}_lote{n // tamanho + 1:03d}.txt")
            with open(arq, "w", encoding="utf-8") as f:
                for a in parte:
                    f.write(";".join([a["cnpj"], a["nome"], a["fantasia"], a["cidade"], a["telefone"], "ATIVA", a["cnae"]]) + "\n")
        resumo.append((territorio, len(do_chip)))
    # planilha de conferência (abre no Excel), com colunas que o painel ainda não usa
    with open(os.path.join(saida, "conferencia.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["chip", "cidade", "bairro", "cnpj", "nome", "fantasia", "telefone", "cnae", "inicio_atividade", "empresario_individual"])
        for a in sorted(achados, key=lambda a: (a["chip"], a["cidade"], a["nome"])):
            w.writerow([a["chip"], a["cidade"], a["bairro"], a["cnpj"], a["nome"], a["fantasia"], a["telefone"], a["cnae"], a["inicio"], "sim" if a["pessoa_fisica"] else ""])
    return resumo


def main():
    p = argparse.ArgumentParser(description="Gera lotes de oficinas para o painel Operação de Sites.")
    p.add_argument("--pasta", help="pasta com os .zip da Receita já baixados (pula o download)")
    p.add_argument("--mes", help="mês da Receita no formato AAAA-MM (padrão: o mais recente)")
    p.add_argument("--downloads", default="dados_receita", help="onde guardar os zips baixados")
    p.add_argument("--saida", default=None, help="pasta dos lotes (padrão: lotes_AAAA-MM-DD)")
    p.add_argument("--tamanho-lote", type=int, default=50, help="empresas por arquivo (padrão 50, a capacidade diária do chip)")
    p.add_argument("--cnaes", default=",".join(CNAES_PADRAO), help="CNAEs principais aceitos, separados por vírgula")
    a = p.parse_args()

    pasta = a.pasta
    if not pasta:
        mes = a.mes or mes_mais_recente()
        pasta = os.path.join(a.downloads, mes)
        print("Mês da Receita:", mes)
        baixar(mes, pasta)
    achados = filtrar(pasta, [c.strip() for c in a.cnaes.split(",") if c.strip()], TERRITORIOS_PADRAO, UF_PADRAO)
    saida = a.saida or f"lotes_{date.today().isoformat()}"
    for territorio, n in gravar(achados, saida, TERRITORIOS_PADRAO, a.tamanho_lote):
        print(f"{territorio}: {n} oficinas")
    print("Lotes em", os.path.abspath(saida), "· cole cada arquivo em Pesquisa > Colar lote, escolhendo o território certo.")


if __name__ == "__main__":
    sys.exit(main())
