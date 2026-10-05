"""Gera public/data/mapa-uf.json: contornos dos estados (malha do IBGE) já projetados
em caminhos SVG, com o ponto onde vai o rótulo de cada estado.

Fonte: https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF
Uso: python scripts/gera_mapa.py
"""
import json, math, os
import requests

URL = ("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR"
       "?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF")
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "mapa-uf.json")
IBGE = {"11": "ro", "12": "ac", "13": "am", "14": "rr", "15": "pa", "16": "ap", "17": "to", "21": "ma", "22": "pi",
        "23": "ce", "24": "rn", "25": "pb", "26": "pe", "27": "al", "28": "se", "29": "ba", "31": "mg", "32": "es",
        "33": "rj", "35": "sp", "41": "pr", "42": "sc", "43": "rs", "50": "ms", "51": "mt", "52": "go", "53": "df"}

ESCALA = 22  # px por grau
COS = math.cos(math.radians(-15))
LON0, LAT0 = -74.2, 5.5


def proj(lon, lat):
    return round((lon - LON0) * COS * ESCALA, 1), round((LAT0 - lat) * ESCALA, 1)


def aneis(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    return geom["coordinates"]


def centroide(pts):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    a /= 2
    return (cx / (6 * a), cy / (6 * a), abs(a)) if a else (pts[0][0], pts[0][1], 0)


def main():
    geo = requests.get(URL, timeout=60).json()
    out, xs, ys = {}, [], []
    for f in geo["features"]:
        uf = IBGE[f["properties"]["codarea"]]
        partes, maior = [], None
        for pol in aneis(f["geometry"]):
            for i, anel in enumerate(pol):
                pts = [proj(lon, lat) for lon, lat in anel]
                xs += [p[0] for p in pts]
                ys += [p[1] for p in pts]
                partes.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
                if i == 0:
                    c = centroide(pts)
                    if maior is None or c[2] > maior[2]:
                        maior = c
        out[uf] = {"d": "".join(partes), "cx": round(maior[0], 1), "cy": round(maior[1], 1)}
    caixa = [math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))]
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"caixa": caixa, "ufs": out}, fh, separators=(",", ":"))
    print("ok", SAIDA, f"{os.path.getsize(SAIDA) / 1024:.0f} KB", caixa)


if __name__ == "__main__":
    main()
