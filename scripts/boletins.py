"""Baixa os Boletins de Urna (BU na Web) do TSE e extrai, para cada seção, os votos
para presidente e os horários de encerramento, emissão do BU e recebimento pelo TSE.

Com isso a reconstrução da apuração deixa de ser por amostra: entra cada urna do
país, com o seu voto real, na hora exata em que chegou ao TSE.

O TSE publica os BUs alguns dias depois da eleição em
https://dadosabertos.tse.jus.br (conjunto "resultados-2026-boletim-de-urna").
Se ainda não saiu, o script avisa e sai sem erro.

Saída: data/raw/bu_<uf>.json  {"mun/zona/secao": {...}}

Uso: python scripts/boletins.py [--turno 1] [--uf ac,sp]
"""
import argparse, csv, io, json, os, sys, zipfile
import requests

CKAN = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2026-boletim-de-urna"
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "raw")
ZIPS = os.path.join(RAW, "bweb")


def urls(turno):
    r = requests.get(CKAN, timeout=60)
    d = r.json()
    if not d.get("success"):
        return {}
    out = {}
    for res in d["result"]["resources"]:
        u = res["url"]
        nome = u.rsplit("/", 1)[-1]
        if nome.startswith(f"bweb_{turno}t_") and nome.endswith(".zip"):
            uf = nome.split("_")[2].lower()
            out[uf] = max(out.get(uf, ""), u)  # mais recente vence
    return out


def baixar(url):
    os.makedirs(ZIPS, exist_ok=True)
    destino = os.path.join(ZIPS, url.rsplit("/", 1)[-1])
    if not os.path.exists(destino):
        with requests.get(url, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(destino + ".tmp", "wb") as f:
                for bloco in r.iter_content(1 << 20):
                    f.write(bloco)
        os.replace(destino + ".tmp", destino)
    return destino


def processar(caminho_zip, uf):
    secoes = {}
    with zipfile.ZipFile(caminho_zip) as z:
        nome = next(n for n in z.namelist() if n.endswith(".csv"))
        with z.open(nome) as f:
            leitor = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";")
            for l in leitor:
                if l["CD_CARGO_PERGUNTA"] != "1":  # 1 = Presidente
                    continue
                chave = f'{int(l["CD_MUNICIPIO"]):05d}/{int(l["NR_ZONA"]):04d}/{int(l["NR_SECAO"]):04d}'
                s = secoes.get(chave)
                if s is None:
                    agreg = l.get("DS_SECOES_AGREGADAS", "#NULO#")
                    s = secoes[chave] = {
                        "recebido": l["DT_BU_RECEBIDO"], "encerramento": l.get("DT_ENCERRAMENTO"),
                        "emissao_bu": l.get("DT_EMISSAO_BU"), "aptos": int(l["QT_APTOS"]),
                        "comparec": int(l["QT_COMPARECIMENTO"]), "tipo_urna": l["DS_TIPO_URNA"],
                        "agregadas": 0 if agreg in ("#NULO#", "", None) else agreg.count(",") + 1,
                        "local": l["NR_LOCAL_VOTACAO"], "votos": {},
                    }
                n = {"Nominal": l["NR_VOTAVEL"], "Branco": "brancos", "Nulo": "nulos"}.get(l["DS_TIPO_VOTAVEL"])
                if n:
                    s["votos"][n] = s["votos"].get(n, 0) + int(l["QT_VOTOS"])
    with open(os.path.join(RAW, f"bu_{uf}.json"), "w", encoding="utf-8") as f:
        json.dump(secoes, f, ensure_ascii=False, separators=(",", ":"))
    return len(secoes)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--turno", default="1")
    ap.add_argument("--uf", default="")
    a = ap.parse_args()
    lista = urls(a.turno)
    if not lista:
        print("O TSE ainda não publicou os Boletins de Urna de 2026 deste turno. Tente de novo mais tarde.")
        sys.exit(0)
    alvo = a.uf.split(",") if a.uf else sorted(lista)
    for uf in alvo:
        z = baixar(lista[uf])
        print(f"{uf}: {processar(z, uf)} seções", flush=True)
