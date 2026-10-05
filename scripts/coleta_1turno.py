"""Coleta os dados públicos do TSE de um turno da eleição federal 2026.

Padrão: 1º turno (eleição 6257, pleito 3220). Para o 2º turno use
--ele 6258 --pleito <código>; o código do pleito aparece em
https://resultados.tse.jus.br/oficial/comum/config/ele-c.json (campo "cd" do bloco "pl").

O servidor do TSE limita a taxa (HTTP 429), então a coleta é educada:
ritmo adaptativo, amostra estratificada de seções por município e retomada
a partir do que já foi salvo.

Saídas em data/raw/ (1º turno) ou data/raw-<eleição>/:
  ab_<uf>.json   abrangência por UF (municípios, seções, eleitorado, comparecimento)
  mun_<uf>.json  votos de presidente por município {cdmun: {numero: votos, ...}}
  cs_<uf>.json   lista de seções da UF (config do arquivo-urna)
  rec_<uf>.json  horário de recebimento das seções amostradas {"mun/zona/secao": "dd/mm/aaaa hh:mm:ss"}

Uso: python scripts/coleta_1turno.py [--amostra 0.04] [--uf sp,rj] [--rps 6] [--ele 6258 --pleito NNNN]
"""
import argparse, json, math, os, random, threading, time
from concurrent.futures import ThreadPoolExecutor
import requests

BASE = "https://resultados.tse.jus.br/oficial/ele2026"
ELE, PLEITO = "6257", "3220"
UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz".split()
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
RAW = os.path.join(DATA, "raw")

S = requests.Session()
S.headers["User-Agent"] = "painel-apuracao-2026 (pesquisa; dados publicos)"
S.mount("https://", requests.adapters.HTTPAdapter(pool_maxsize=16))


class Ritmo:
    """Limitador adaptativo: sobe devagar, despenca e pausa ao levar 429."""

    def __init__(self, rps):
        self.rps, self.max = rps, rps
        self.lock = threading.Lock()
        self.prox = time.monotonic()
        self.pausa_ate = 0.0

    def esperar(self):
        with self.lock:
            agora = time.monotonic()
            t = max(self.prox, agora, self.pausa_ate)
            self.prox = t + 1.0 / self.rps
        time.sleep(max(0.0, t - time.monotonic()))

    def ok(self):
        with self.lock:
            self.rps = min(self.max, self.rps * 1.01)

    def bloqueado(self):
        with self.lock:
            self.rps = max(0.5, self.rps / 2)
            self.pausa_ate = time.monotonic() + 20


RITMO = Ritmo(6)


def get(url, tentativas=8):
    for _ in range(tentativas):
        RITMO.esperar()
        try:
            r = S.get(url, timeout=20)
        except requests.RequestException:
            time.sleep(3)
            continue
        if r.status_code == 200:
            RITMO.ok()
            return r.json()
        if r.status_code == 404:
            RITMO.ok()
            return None
        if r.status_code == 429:
            RITMO.bloqueado()
            continue
        time.sleep(3)
    raise RuntimeError(f"falhou: {url}")


def caminho(nome):
    return os.path.join(RAW, nome)


def salvar(nome, obj):
    tmp = caminho(nome) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, caminho(nome))


def carregar(nome):
    if os.path.exists(caminho(nome)):
        with open(caminho(nome), encoding="utf-8") as f:
            return json.load(f)
    return None


def votos_presidente(doc):
    out = {}
    for c in doc["carg"]:
        for a in c["agr"]:
            for p in a["par"]:
                for cd in p["cand"]:
                    out[cd["n"]] = int(cd["vap"])
    v = doc["v"]
    out["brancos"] = int(v["vb"])
    out["nulos"] = int(v["tvn"])
    return out


def horario_recebimento(doc):
    if not doc or not doc.get("hashes"):
        return None
    hs = [h for h in doc["hashes"] if h.get("st", "").startswith("Totaliz")] or doc["hashes"]
    # o hash mais antigo é a primeira vez que a urna entrou na conta
    h = min(hs, key=lambda h: (h["dr"][6:] + h["dr"][3:5] + h["dr"][:2], h["hr"]))
    return f'{h["dr"]} {h["hr"]}'


def coleta_uf(uf, amostra, workers):
    t0 = time.time()
    ab = carregar(f"ab_{uf}.json") or get(f"{BASE}/{ELE}/dados/{uf}/{uf}-e00{ELE}-ab.json")
    salvar(f"ab_{uf}.json", ab)
    muns = [x["cdabr"] for x in ab["abr"] if x["tpabr"] == "mun"]

    mun = carregar(f"mun_{uf}.json") or {}
    faltam = [m for m in muns if m not in mun]
    if faltam:
        def um(m):
            return m, get(f"{BASE}/{ELE}/dados/{uf}/{uf}{m}-c0001-e00{ELE}-u.json")
        with ThreadPoolExecutor(workers) as ex:
            for i, (m, d) in enumerate(ex.map(um, faltam), 1):
                if d:
                    mun[m] = votos_presidente(d)
                if i % 200 == 0:
                    salvar(f"mun_{uf}.json", mun)
        salvar(f"mun_{uf}.json", mun)

    cs = carregar(f"cs_{uf}.json") or get(f"{BASE}/arquivo-urna/{PLEITO}/config/{uf}/{uf}-p00{PLEITO}-cs.json")
    salvar(f"cs_{uf}.json", cs)
    por_mun = {}
    for a in cs["abr"]:
        for m in a["mu"]:
            for z in m["zon"]:
                for s in z["sec"]:
                    por_mun.setdefault(m["cd"], []).append((m["cd"], z["cd"], s["ns"]))
    rnd = random.Random(f"{uf}-42")
    secs = []
    for m in sorted(por_mun):
        l = por_mun[m]
        k = len(l) if amostra >= 1 else min(len(l), max(1, math.ceil(len(l) * amostra)))
        secs += rnd.sample(l, k)

    rec = carregar(f"rec_{uf}.json") or {}
    faltam = [s for s in secs if "/".join(s) not in rec]

    def uma(s):
        m, z, n = s
        d = get(f"{BASE}/arquivo-urna/{PLEITO}/dados/{uf}/{m}/{z}/{n}/p00{PLEITO}-{uf}-m{m}-z{z}-s{n}-aux.json")
        return "/".join(s), horario_recebimento(d)

    with ThreadPoolExecutor(workers) as ex:
        for i, (k, t) in enumerate(ex.map(uma, faltam), 1):
            rec[k] = t
            if i % 250 == 0:
                salvar(f"rec_{uf}.json", rec)
                print(f"  {uf}: {i}/{len(faltam)} seções, ritmo {RITMO.rps:.1f}/s", flush=True)
    salvar(f"rec_{uf}.json", rec)
    sem = sum(1 for v in rec.values() if v is None)
    print(f"{uf}: {len(muns)} municípios, {len(rec)} seções amostradas de "
          f"{sum(map(len, por_mun.values()))} ({sem} sem horário) em {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--amostra", type=float, default=0.04)
    ap.add_argument("--uf", default=",".join(UFS))
    ap.add_argument("--rps", type=float, default=6)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--ele", default=ELE)
    ap.add_argument("--pleito", default=PLEITO)
    a = ap.parse_args()
    ELE, PLEITO = a.ele, a.pleito
    if ELE != "6257":
        RAW = os.path.join(DATA, f"raw-{ELE}")
    os.makedirs(RAW, exist_ok=True)
    RITMO.rps = RITMO.max = a.rps
    for uf in a.uf.split(","):
        coleta_uf(uf, a.amostra, a.workers)
    print("FIM", flush=True)
