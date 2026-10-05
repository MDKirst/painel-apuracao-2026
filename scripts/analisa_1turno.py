"""Reconstrói a apuração do 1º turno minuto a minuto e calcula os KPIs.

Método: cada seção amostrada tem o horário em que o TSE a recebeu (arquivo
"aux" do arquivo-urna). Ela representa 1/k do seu município (k = seções
amostradas ali), e o município entra na conta com os votos finais dele. Somando
esses pedaços na ordem do horário de recebimento, temos o placar parcial em
cada instante. Limite conhecido: dentro de um mesmo município, supomos que
toda seção vota igual à média da cidade.

Entrada: data/raw/*  (gerado por coleta_1turno.py)
Saída:   data/1turno.json  (lido pelo painel)
"""
import json, os, statistics
from collections import defaultdict
from datetime import datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(AQUI, "..", "data", "raw")
SAIDA = os.path.join(AQUI, "..", "public", "data", "1turno.json")

REGIAO = {
    **dict.fromkeys("ac am ap pa ro rr to".split(), "Norte"),
    **dict.fromkeys("al ba ce ma pb pe pi rn se".split(), "Nordeste"),
    **dict.fromkeys("df go ms mt".split(), "Centro-Oeste"),
    **dict.fromkeys("es mg rj sp".split(), "Sudeste"),
    **dict.fromkeys("pr rs sc".split(), "Sul"),
    "zz": "Exterior",
}
REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Exterior"]

# Campos ideológicos: simplificação editável, usada só nos indicadores de "bloco".
# O indicador principal de inclinação é a margem Flávio − Lula, que não depende disto.
BLOCO = {
    "22": "direita", "55": "direita", "30": "direita", "14": "direita",
    "13": "esquerda", "80": "esquerda", "16": "esquerda", "21": "esquerda", "29": "esquerda",
    "70": "centro/outros", "27": "centro/outros", "35": "centro/outros",
}
FLAVIO, LULA = "22", "13"
INICIO = datetime(2026, 10, 4, 17, 0, 0)
PASSO = 60  # segundos por ponto da série

# Placar publicado pelo TSE em horários conhecidos, lido dos gráficos "Evolução da
# apuração" do g1 (04/10/2026). Leitura visual: precisão de ±0,3 pp. Serve para
# validar a reconstrução, não entra no cálculo.
VALIDACAO_G1 = [
    ("17:21:00", 48.8, 42.4),
    ("18:44:02", 50.2, 41.6),
    ("19:06:33", 49.6, 42.1),
    ("19:45:15", 48.4, 43.4),
    ("20:28:57", 47.9, 44.1),
    ("21:02:07", 47.3, 44.8),
]


def ler(nome):
    with open(os.path.join(RAW, nome), encoding="utf-8") as f:
        return json.load(f)


def minutos(txt):
    return (datetime.strptime(txt, "%d/%m/%Y %H:%M:%S") - INICIO).total_seconds() / 60


def minutos_iso(txt):
    return (datetime.strptime(txt[:19], "%Y-%m-%d %H:%M:%S") - INICIO).total_seconds() / 60


def hhmm(m):
    if m is None:
        return None
    t = INICIO.timestamp() + m * 60
    d = datetime.fromtimestamp(t)
    return d.strftime("%Hh%M") if d.day == 4 else d.strftime("%d/%m %Hh%M")


def main():
    br = ler("br_u.json")
    cands = {}
    for c in br["carg"]:
        for a in c["agr"]:
            for p in a["par"]:
                for cd in p["cand"]:
                    cands[cd["n"]] = {"nome": cd["nmu"].title(), "partido": p["sg"], "votos": int(cd["vap"]),
                                      "pct": float(cd["pvapn"].replace(",", "."))}
    numeros = sorted(cands, key=lambda n: -cands[n]["votos"])

    cm = ler("cm.json")
    info = {}
    for a in cm["abr"]:
        for m in a["mu"]:
            info[(a["cd"], m["cd"])] = {"nome": m["nm"], "ibge": m.get("cdi"), "capital": m.get("c") == "s"}

    eventos = []      # (minuto, uf, mun, seções, válidos, votos Flávio, votos Lula)
    modo_bu, latencias = set(), []
    municipios = []   # resumo por município
    sem_amostra = 0
    for uf in REGIAO:
        if not os.path.exists(os.path.join(RAW, f"rec_{uf}.json")):
            print("faltando", uf)
            continue
        ab = {x["cdabr"]: x for x in ler(f"ab_{uf}.json")["abr"] if x["tpabr"] == "mun"}
        votos = ler(f"mun_{uf}.json")
        bu = ler(f"bu_{uf}.json") if os.path.exists(os.path.join(RAW, f"bu_{uf}.json")) else None
        tempos = defaultdict(list)
        if bu:
            # modo exato: cada urna entra com o próprio voto, na hora em que o TSE a recebeu
            modo_bu.add(uf)
            for chave, sec in bu.items():
                cd = chave.split("/")[0]
                t = minutos_iso(sec["recebido"])
                v = sec["votos"]
                val = sum(x for n, x in v.items() if n not in ("brancos", "nulos"))
                eventos.append((t, uf, cd, 1 + sec.get("agregadas", 0), val, v.get(FLAVIO, 0), v.get(LULA, 0)))
                tempos[cd].append(t)
                if sec.get("encerramento"):
                    latencias.append((REGIAO[uf], t - minutos_iso(sec["encerramento"])))
        else:
            rec = ler(f"rec_{uf}.json")
            for chave, t in rec.items():
                if t and t.strip():
                    tempos[chave.split("/")[0]].append(minutos(t))
        for cd, a in ab.items():
            v = votos.get(cd)
            if not v:
                continue
            ts = tempos.get(cd)
            if not ts:  # sem horário: usa o fechamento do município ou, na falta, a mediana da UF
                if a["dt"].strip():
                    ts = [minutos(f'{a["dt"]} {a["ht"]}')]
                else:
                    ts = [statistics.median([x for l in tempos.values() for x in l])]
                sem_amostra += 1
            validos = sum(v.get(n, 0) for n in cands)
            secoes = int(a["s"]["ts"])
            if not bu:
                # modo amostra: cada seção amostrada carrega 1/k do município
                for t in ts:
                    fr = 1 / len(ts)
                    eventos.append((t, uf, cd, secoes * fr, validos * fr, v.get(FLAVIO, 0) * fr, v.get(LULA, 0) * fr))
            municipios.append({
                "uf": uf, "cd": cd, **info.get((uf, cd), {"nome": cd, "ibge": None, "capital": False}),
                "secoes": secoes, "eleitores": int(a["e"]["te"]), "comparec": int(a["e"]["c"]),
                "validos": validos, "votos": {n: v.get(n, 0) for n in cands},
                "brancos": v.get("brancos", 0), "nulos": v.get("nulos", 0),
                "t50": statistics.median(ts), "t_ini": min(ts), "t_fim": max(ts),
            })
    mun_idx = {(m["uf"], m["cd"]): m for m in municipios}
    eventos.sort()

    # ---------- totais finais ----------
    def soma(ms):
        out = {"secoes": 0, "eleitores": 0, "comparec": 0, "validos": 0, "brancos": 0, "nulos": 0,
               "votos": defaultdict(int)}
        for m in ms:
            for k in ("secoes", "eleitores", "comparec", "validos", "brancos", "nulos"):
                out[k] += m[k]
            for n, x in m["votos"].items():
                out["votos"][n] += x
        out["votos"] = dict(out["votos"])
        return out

    def resumo(ms):
        s = soma(ms)
        val = s["validos"] or 1
        pct = {n: 100 * s["votos"].get(n, 0) / val for n in numeros}
        blocos = defaultdict(float)
        for n, p in pct.items():
            blocos[BLOCO.get(n, "centro/outros")] += p
        return {
            "secoes": s["secoes"], "eleitores": s["eleitores"], "comparec": s["comparec"], "validos": s["validos"],
            "abstencao_pct": round(100 * (1 - s["comparec"] / s["eleitores"]), 2) if s["eleitores"] else None,
            "brancos_nulos_pct": round(100 * (s["brancos"] + s["nulos"]) / s["comparec"], 2) if s["comparec"] else None,
            "pct": {n: round(p, 2) for n, p in pct.items()},
            "margem_pp": round(pct[FLAVIO] - pct[LULA], 2),
            "saldo_votos": s["votos"].get(FLAVIO, 0) - s["votos"].get(LULA, 0),
            "blocos": {k: round(v, 2) for k, v in blocos.items()},
        }

    por_regiao = {r: [m for m in municipios if REGIAO[m["uf"]] == r] for r in REGIOES}
    por_uf = defaultdict(list)
    for m in municipios:
        por_uf[m["uf"]].append(m)
    total = soma(municipios)

    # ---------- série temporal ----------
    fim = max(e[0] for e in eventos)
    n_pontos = int(fim // (PASSO / 60)) + 2
    grupos = ["Brasil"] + REGIOES
    acum = {g: {"secoes": 0.0, "validos": 0.0, "votos": defaultdict(float)} for g in grupos}
    acum_uf = {uf: {"secoes": 0.0, "validos": 0.0, "votos": defaultdict(float)} for uf in por_uf}
    serie = {g: [] for g in grupos}
    serie_uf = {uf: [] for uf in por_uf}
    projecao = []
    i = 0
    total_uf = {uf: soma(ms) for uf, ms in por_uf.items()}
    for p in range(n_pontos):
        t = p * PASSO / 60
        while i < len(eventos) and eventos[i][0] <= t:
            _, uf, cd, sec, val, vf, vl = eventos[i]
            for a in (acum["Brasil"], acum[REGIAO[uf]], acum_uf[uf]):
                a["secoes"] += sec
                a["validos"] += val
                a["votos"][FLAVIO] += vf
                a["votos"][LULA] += vl
            i += 1
        for g in grupos:
            a = acum[g]
            tot = total["secoes"] if g == "Brasil" else sum(m["secoes"] for m in por_regiao[g])
            val = a["validos"]
            serie[g].append([
                round(100 * a["secoes"] / tot, 2) if tot else 0,
                round(100 * a["votos"][FLAVIO] / val, 2) if val else None,
                round(100 * a["votos"][LULA] / val, 2) if val else None,
                round(val),
                round(a["votos"][FLAVIO]),
                round(a["votos"][LULA]),
            ])
        for uf, a in acum_uf.items():
            val = a["validos"]
            serie_uf[uf].append([
                round(100 * a["secoes"] / total_uf[uf]["secoes"], 1),
                round(100 * a["votos"][FLAVIO] / val, 2) if val else None,
                round(100 * a["votos"][LULA] / val, 2) if val else None,
                round(val),
                round(a["votos"][FLAVIO]),
                round(a["votos"][LULA]),
            ])
        # projeção ajustada por UF, só com o que se saberia ao vivo:
        # o que falta de cada UF vota como o que já veio dela, e o tamanho da UF
        # é estimado pelos válidos contados ÷ fração de seções apuradas.
        ja = {uf: a for uf, a in acum_uf.items() if a["validos"] > 0}
        if ja:
            nac = {n: sum(a["votos"][n] for a in ja.values()) / sum(a["validos"] for a in ja.values()) for n in (FLAVIO, LULA)}
            val_por_eleitor = sum(a["validos"] for a in ja.values()) / sum(
                total_uf[uf]["eleitores"] * a["secoes"] / total_uf[uf]["secoes"] for uf, a in ja.items())
            proj, peso = defaultdict(float), 0.0
            for uf, tu in total_uf.items():
                a = acum_uf[uf]
                est = a["validos"] * tu["secoes"] / a["secoes"] if a["secoes"] > 0 else tu["eleitores"] * val_por_eleitor
                for n in (FLAVIO, LULA):
                    proj[n] += (a["votos"][n] / a["validos"] if a["validos"] > 0 else nac[n]) * est
                peso += est
            projecao.append([round(100 * proj[FLAVIO] / peso, 2), round(100 * proj[LULA] / peso, 2)])
        else:
            projecao.append([None, None])

    # ---------- KPIs ----------
    final_f, final_l = cands[FLAVIO]["pct"], cands[LULA]["pct"]
    margem_final = round(final_f - final_l, 2)
    br_s = serie["Brasil"]

    def quando(lista, alvo):
        for p, x in enumerate(lista):
            if x[0] >= alvo:
                return p * PASSO / 60
        return None

    def no_pct(alvo):
        return next((p for p, x in enumerate(br_s) if x[0] >= alvo), len(br_s) - 1)

    marcos = [5, 10, 25, 50, 75, 90, 99]
    kpi_velocidade = {
        g: {str(m): hhmm(quando(serie[g], m)) for m in (25, 50, 90, 99)} for g in grupos
    }
    vies = []
    for alvo in marcos:
        p = no_pct(alvo)
        x = br_s[p]
        vies.append({"apurado": alvo, "hora": hhmm(p * PASSO / 60), "flavio": x[1], "lula": x[2],
                     "margem": round(x[1] - x[2], 2), "vies_pp": round(x[1] - x[2] - margem_final, 2),
                     "proj_flavio": projecao[p][0], "proj_lula": projecao[p][1],
                     "erro_proj_pp": round(projecao[p][0] - projecao[p][1] - margem_final, 2)})
    pico = max(range(len(br_s)), key=lambda p: (br_s[p][1] - br_s[p][2]) if br_s[p][1] is not None and br_s[p][0] >= 1 else -99)
    estab = {}
    for tol in (2, 1, 0.5):
        ultimo_fora = max((p for p, x in enumerate(br_s) if x[1] is None or abs(x[1] - x[2] - margem_final) > tol), default=-1)
        q = min(ultimo_fora + 1, len(br_s) - 1)
        estab[str(tol)] = {"hora": hhmm(q * PASSO / 60), "apurado": br_s[q][0]}
    estab_proj = {}
    for tol in (1, 0.5):
        ultimo_fora = max((p for p, x in enumerate(projecao) if x[0] is None or abs(x[0] - x[1] - margem_final) > tol), default=-1)
        q = min(ultimo_fora + 1, len(br_s) - 1)
        estab_proj[str(tol)] = {"hora": hhmm(q * PASSO / 60), "apurado": br_s[q][0]}
    liderou = {"flavio": sum(1 for x in br_s if x[0] >= 1 and x[1] > x[2]), "lula": sum(1 for x in br_s if x[0] >= 1 and x[2] > x[1])}

    # composição regional dos votos contados vs final
    composicao = []
    val_final = {r: sum(m["validos"] for m in por_regiao[r]) for r in REGIOES}
    for alvo in (10, 25, 50, 75):
        p = no_pct(alvo)
        tot = sum(serie[r][p][3] for r in REGIOES)
        composicao.append({"apurado": alvo, "hora": hhmm(p * PASSO / 60),
                           "regioes": {r: round(100 * serie[r][p][3] / tot, 1) if tot else 0 for r in REGIOES}})
    composicao.append({"apurado": 100, "hora": "final",
                       "regioes": {r: round(100 * val_final[r] / total["validos"], 1) for r in REGIOES}})

    # capitais vs interior
    cap = [m for m in municipios if m["capital"]]
    inter = [m for m in municipios if not m["capital"] and m["uf"] != "zz"]

    def t50_ponderado(ms):
        xs = sorted((m["t50"], m["secoes"]) for m in ms)
        alvo, ac = sum(w for _, w in xs) / 2, 0
        for t, w in xs:
            ac += w
            if ac >= alvo:
                return t

    # porte do município
    faixas = [(0, 10_000, "até 10 mil eleitores"), (10_000, 50_000, "10–50 mil"), (50_000, 200_000, "50–200 mil"),
              (200_000, 1_000_000, "200 mil–1 mi"), (1_000_000, 10**9, "mais de 1 mi")]
    porte = []
    for lo, hi, nome in faixas:
        ms = [m for m in municipios if lo <= m["eleitores"] < hi and m["uf"] != "zz"]
        r = resumo(ms)
        porte.append({"faixa": nome, "municipios": len(ms), "t50": hhmm(t50_ponderado(ms)),
                      "margem_pp": r["margem_pp"], "abstencao_pct": r["abstencao_pct"],
                      "peso_validos_pct": round(100 * r["validos"] / total["validos"], 1)})

    # distribuição de municípios por inclinação
    def classe(m):
        if not m["validos"]:
            return None
        d = 100 * (m["votos"][FLAVIO] - m["votos"][LULA]) / m["validos"]
        return ("Flávio +30" if d >= 30 else "Flávio +10 a +30" if d >= 10 else "Flávio 0 a +10" if d >= 0
                else "Lula 0 a +10" if d > -10 else "Lula +10 a +30" if d > -30 else "Lula +30")
    ordem_cl = ["Lula +30", "Lula +10 a +30", "Lula 0 a +10", "Flávio 0 a +10", "Flávio +10 a +30", "Flávio +30"]
    inclinacao = {r: {c: 0 for c in ordem_cl} for r in REGIOES}
    for m in municipios:
        c = classe(m)
        if c:
            inclinacao[REGIAO[m["uf"]]][c] += 1

    # correlação abstenção x voto em Lula (municípios, ponderada por eleitores)
    def corr(xs, ys, ws):
        sw = sum(ws)
        mx = sum(x * w for x, w in zip(xs, ws)) / sw
        my = sum(y * w for y, w in zip(ys, ws)) / sw
        cov = sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws))
        vx = sum(w * (x - mx) ** 2 for x, w in zip(xs, ws))
        vy = sum(w * (y - my) ** 2 for y, w in zip(ys, ws))
        return cov / (vx * vy) ** 0.5
    br_m = [m for m in municipios if m["uf"] != "zz" and m["validos"] > 0]
    corr_abst_lula = corr([1 - m["comparec"] / m["eleitores"] for m in br_m],
                          [m["votos"][LULA] / m["validos"] for m in br_m], [m["eleitores"] for m in br_m])
    corr_hora_flavio = corr([m["t50"] for m in br_m],
                            [(m["votos"][FLAVIO] - m["votos"][LULA]) / m["validos"] for m in br_m], [m["validos"] for m in br_m])

    ufs = {}
    for uf, ms in por_uf.items():
        r = resumo(ms)
        r["regiao"] = REGIAO[uf]
        r["t50"] = hhmm(t50_ponderado(ms))
        r["t50_min"] = round(t50_ponderado(ms), 1)
        r["t90"] = hhmm(quando(serie_uf[uf], 90))
        r["t99"] = hhmm(quando(serie_uf[uf], 99))
        ufs[uf] = r

    top = sorted((m for m in municipios if m["validos"]), key=lambda m: -abs(m["votos"][FLAVIO] - m["votos"][LULA]))[:25]

    validacao = []
    for h, f, l in VALIDACAO_G1:
        p = int(minutos(f"04/10/2026 {h}") // (PASSO / 60))
        x = br_s[p]
        validacao.append({"hora": h[:5].replace(":", "h"), "g1_flavio": f, "g1_lula": l,
                          "rec_flavio": x[1], "rec_lula": x[2], "apurado_rec": x[0],
                          "erro_margem_pp": round((x[1] - x[2]) - (f - l), 2)})

    # 1 ponto por minuto até as 02h; depois só a cauda (Exterior, retotalizações) a cada 15 min
    n_total = len(serie["Brasil"])
    manter = [i for i in range(n_total) if i * PASSO / 60 <= 540 or i % 15 == 0 or i == n_total - 1]

    out = {
        "fonte": "TSE — resultados.tse.jus.br (eleição 6257, pleito 3220). Reconstrução por amostra de seções.",
        "gerado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "amostra": {"secoes_com_horario": len(eventos), "municipios": len(municipios),
                    "municipios_sem_amostra": sem_amostra,
                    "modo": "boletins" if len(modo_bu) == len(por_uf) else ("misto" if modo_bu else "amostra"),
                    "ufs_com_boletim": sorted(modo_bu)},
        "candidatos": [{"numero": n, **cands[n]} for n in numeros],
        "blocos_def": BLOCO,
        "brasil": resumo(municipios),
        "regioes": {r: resumo(ms) for r, ms in por_regiao.items()},
        "ufs": ufs,
        "serie": {"inicio": "2026-10-04T17:00:00-03:00", "passo_min": PASSO / 60, "minutos": [round(i * PASSO / 60) for i in manter],
                  "colunas": ["pct_secoes", "flavio_pct", "lula_pct", "validos_contados", "votos_flavio", "votos_lula"], "colunas_uf": ["pct_secoes", "flavio_pct", "lula_pct", "validos_contados", "votos_flavio", "votos_lula"],
                  "grupos": {g: [v[i] for i in manter] for g, v in serie.items()},
                  "ufs": {u: [v[i] for i in manter] for u, v in serie_uf.items()},
                  "projecao_uf": [projecao[i] for i in manter]},
        "kpis": {
            "velocidade": kpi_velocidade,
            "vies_ordem_chegada": vies,
            "pico_vantagem": {"hora": hhmm(pico * PASSO / 60), "apurado": br_s[pico][0],
                              "margem": round(br_s[pico][1] - br_s[pico][2], 2)},
            "estabilizacao_placar": estab,
            "estabilizacao_projecao": estab_proj,
            "minutos_liderando": liderou,
            "composicao_regional": composicao,
            "capital_interior": {
                "capitais": {**{k: v for k, v in resumo(cap).items() if k in ("margem_pp", "abstencao_pct", "validos")},
                             "t50": hhmm(t50_ponderado(cap))},
                "interior": {**{k: v for k, v in resumo(inter).items() if k in ("margem_pp", "abstencao_pct", "validos")},
                             "t50": hhmm(t50_ponderado(inter))},
            },
            "porte": porte,
            "latencia_min": {r: round(statistics.median([x for g, x in latencias if g == r]), 1)
                             for r in REGIOES if any(g == r for g, _ in latencias)},
            "validacao_g1": validacao,
            "inclinacao_municipios": {"classes": ordem_cl, "regioes": inclinacao},
            "correlacoes": {"abstencao_x_lula": round(corr_abst_lula, 3),
                            "hora_chegada_x_margem_flavio": round(corr_hora_flavio, 3)},
            "maiores_saldos": [{"nome": m["nome"].title(), "uf": m["uf"].upper(),
                                "saldo": m["votos"][FLAVIO] - m["votos"][LULA],
                                "margem_pp": round(100 * (m["votos"][FLAVIO] - m["votos"][LULA]) / m["validos"], 1)}
                               for m in top],
        },
    }
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("ok:", SAIDA, f"{os.path.getsize(SAIDA)/1024:.0f} KB")
    print(json.dumps(out["kpis"]["vies_ordem_chegada"], ensure_ascii=False, indent=1))
    print(json.dumps({k: out["kpis"][k] for k in ("pico_vantagem", "estabilizacao_placar", "estabilizacao_projecao",
                                                    "minutos_liderando", "capital_interior", "correlacoes")},
                     ensure_ascii=False, indent=1))
    print(json.dumps(out["kpis"]["velocidade"], ensure_ascii=False))
    print(json.dumps(out["kpis"]["composicao_regional"], ensure_ascii=False))
    for r in REGIOES:
        x = out["regioes"][r]
        print(r, x["margem_pp"], x["saldo_votos"], x["abstencao_pct"], x["blocos"])
    for p in porte:
        print(p)
    for v in validacao:
        print(v)


if __name__ == "__main__":
    main()
