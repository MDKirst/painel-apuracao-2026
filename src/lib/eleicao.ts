// Tipos, constantes e contas do painel. Nada aqui depende de React.

export const TSE = 'https://resultados.tse.jus.br/oficial/ele2026'
export const FLAVIO = '22'
export const LULA = '13'

export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'] as const
export type Regiao = (typeof REGIOES)[number]

export const REGIAO: Record<string, Regiao> = {
  ac: 'Norte', am: 'Norte', ap: 'Norte', pa: 'Norte', ro: 'Norte', rr: 'Norte', to: 'Norte',
  al: 'Nordeste', ba: 'Nordeste', ce: 'Nordeste', ma: 'Nordeste', pb: 'Nordeste', pe: 'Nordeste', pi: 'Nordeste', rn: 'Nordeste', se: 'Nordeste',
  df: 'Centro-Oeste', go: 'Centro-Oeste', ms: 'Centro-Oeste', mt: 'Centro-Oeste',
  es: 'Sudeste', mg: 'Sudeste', rj: 'Sudeste', sp: 'Sudeste',
  pr: 'Sul', rs: 'Sul', sc: 'Sul', zz: 'Exterior',
}
export const UFS = Object.keys(REGIAO)

export const NOME_UF: Record<string, string> = {
  ac: 'Acre', al: 'Alagoas', am: 'Amazonas', ap: 'Amapá', ba: 'Bahia', ce: 'Ceará', df: 'Distrito Federal',
  es: 'Espírito Santo', go: 'Goiás', ma: 'Maranhão', mg: 'Minas Gerais', ms: 'Mato Grosso do Sul',
  mt: 'Mato Grosso', pa: 'Pará', pb: 'Paraíba', pe: 'Pernambuco', pi: 'Piauí', pr: 'Paraná',
  rj: 'Rio de Janeiro', rn: 'Rio Grande do Norte', ro: 'Rondônia', rr: 'Roraima', rs: 'Rio Grande do Sul',
  sc: 'Santa Catarina', se: 'Sergipe', sp: 'São Paulo', to: 'Tocantins', zz: 'Exterior',
}

// cores por região: paleta categórica validada (sem o azul/vermelho dos candidatos)
export const COR_REGIAO: Record<Regiao, string> = {
  Norte: 'var(--r-norte)', Nordeste: 'var(--r-nordeste)', 'Centro-Oeste': 'var(--r-co)',
  Sudeste: 'var(--r-sudeste)', Sul: 'var(--r-sul)', Exterior: 'var(--r-exterior)',
}

// grade geográfica aproximada dos estados (coluna, linha)
export const GRADE: Record<string, [number, number]> = {
  rr: [1, 0], ap: [2, 0],
  am: [1, 1], pa: [2, 1], ma: [3, 1], ce: [4, 1], rn: [5, 1],
  ac: [0, 2], ro: [1, 2], to: [2, 2], pi: [3, 2], pe: [4, 2], pb: [5, 2],
  mt: [1, 3], df: [2, 3], ba: [3, 3], se: [4, 3], al: [5, 3],
  ms: [1, 4], go: [2, 4], mg: [3, 4], es: [4, 4],
  pr: [1, 5], sp: [2, 5], rj: [3, 5],
  sc: [1, 6], zz: [5, 6],
  rs: [1, 7],
}

/* ---------------- tipos do data/1turno.json ---------------- */
export type Resumo = {
  secoes: number; eleitores: number; comparec: number; validos: number
  abstencao_pct: number; brancos_nulos_pct: number
  pct: Record<string, number>; margem_pp: number; saldo_votos: number
  blocos: Record<string, number>
}
export type ResumoUF = Resumo & { regiao: Regiao; t50: string; t50_min: number; t90: string | null; t99: string | null }
export type Vies = { apurado: number; hora: string; flavio: number; lula: number; margem: number; vies_pp: number; proj_flavio: number; proj_lula: number; erro_proj_pp: number }
export type H1 = {
  fonte: string
  gerado_em: string
  amostra: { secoes_com_horario: number; municipios: number; modo: 'amostra' | 'boletins' | 'misto' }
  candidatos: { numero: string; nome: string; partido: string; votos: number; pct: number }[]
  brasil: Resumo
  regioes: Record<Regiao, Resumo>
  ufs: Record<string, ResumoUF>
  serie: {
    inicio: string; passo_min: number; minutos?: number[]
    // [% urnas, % Flávio, % Lula, válidos contados, votos Flávio, votos Lula]
    grupos: Record<'Brasil' | Regiao, [number, number | null, number | null, number, number, number][]>
    ufs: Record<string, [number, number | null, number | null, number, number, number][]>
    projecao_uf: [number | null, number | null][]
  }
  kpis: {
    velocidade: Record<string, Record<string, string | null>>
    vies_ordem_chegada: Vies[]
    pico_vantagem: { hora: string; apurado: number; margem: number }
    estabilizacao_placar: Record<string, { hora: string; apurado: number }>
    estabilizacao_projecao: Record<string, { hora: string; apurado: number }>
    minutos_liderando: { flavio: number; lula: number }
    composicao_regional: { apurado: number; hora: string; regioes: Record<Regiao, number> }[]
    capital_interior: Record<'capitais' | 'interior', { validos: number; abstencao_pct: number; margem_pp: number; t50: string }>
    porte: { faixa: string; municipios: number; t50: string; margem_pp: number; abstencao_pct: number; peso_validos_pct: number }[]
    inclinacao_municipios: { classes: string[]; regioes: Record<Regiao, Record<string, number>> }
    correlacoes: { abstencao_x_lula: number; hora_chegada_x_margem_flavio: number }
    latencia_min?: Partial<Record<Regiao, number>>
    validacao_g1?: { hora: string; g1_flavio: number; g1_lula: number; rec_flavio: number; rec_lula: number; erro_margem_pp: number }[]
  }
}

/* ---------------- formatação ---------------- */
export const fmt = (x: number | null | undefined, d = 1) =>
  x == null || Number.isNaN(x) ? '–' : x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmtInt = (x: number | null | undefined) => (x == null ? '–' : Math.round(x).toLocaleString('pt-BR'))
export const sinal = (x: number | null | undefined, d = 1) =>
  x == null || Number.isNaN(x) ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '±') + fmt(Math.abs(x), d)
// vantagem com precisão suficiente para não virar "±0,0" numa disputa de poucos votos
export const sinalPrec = (x: number | null | undefined) => sinal(x, x != null && Math.abs(x) < 0.1 ? 2 : 1)
export const pctPrec = (a?: number, b?: number) => (a != null && b != null && Math.abs(a - b) < 0.1 ? 2 : 1)
export const pontos = (x: number, d = 1) => `${fmt(Math.abs(x), d)} ${Math.abs(x) >= 1.95 || Math.abs(x) < 0.95 ? 'pontos' : 'ponto'}`
export const milhoes = (x: number) => `${fmt(Math.abs(x) / 1e6, 1)} ${Math.abs(x) >= 1.95e6 ? 'milhões' : 'milhão'}`
// 12,3 mi · 845 mil · 920
export const compacto = (x: number | null | undefined) =>
  x == null ? '–' : x >= 1e6 ? `${fmt(x / 1e6, 1)} mi` : x >= 1e4 ? `${fmt(x / 1e3, 0)} mil` : fmtInt(x)
export const quemLidera = (m: number) => (m > 0 ? 'Flávio' : m < 0 ? 'Lula' : 'empate')
export const num = (s: unknown) => (s == null ? NaN : parseFloat(String(s).replace(',', '.')))
export const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(':', 'h')
export const siglaUF = (uf: string) => (uf === 'zz' ? 'EXT' : uf.toUpperCase())

// escala divergente da margem (Flávio + / Lula −) em 7 faixas
export const FAIXAS_MARGEM = [
  { min: 20, cor: 'var(--d-f3)', rotulo: 'Flávio +20' },
  { min: 10, cor: 'var(--d-f2)', rotulo: '+10' },
  { min: 3, cor: 'var(--d-f1)', rotulo: '+3' },
  { min: -3, cor: 'var(--neutro)', rotulo: '±3' },
  { min: -10, cor: 'var(--d-l1)', rotulo: 'Lula +3' },
  { min: -20, cor: 'var(--d-l2)', rotulo: '+10' },
  { min: -Infinity, cor: 'var(--d-l3)', rotulo: '+20' },
]
export function corMargem(m: number | null | undefined) {
  if (m == null || Number.isNaN(m)) return null
  if (m > -3 && m < 3) return FAIXAS_MARGEM[3].cor
  return (FAIXAS_MARGEM.find((f) => m >= f.min) ?? FAIXAS_MARGEM[6]).cor
}
// texto legível sobre uma faixa: token CSS par (--d-f3 → --t-f3), troca sozinho com o tema
export function textoSobre(corCss: string) {
  return corCss.replace('--d-', '--t-').replace('--neutro', '--t-neutro')
}

/* ---------------- TSE ao vivo ---------------- */
export type ResultadoTSE = {
  cands: Record<string, { nome: string; partido: string; votos: number; pct: number }>
  hora: string; secoes: number; totalSecoes: number; pct: number; validos: number
}
export type UFVivo = {
  pct?: number; eleitores?: number; flavio?: number; lula?: number; validos?: number
  votosF?: number; votosL?: number
}

type JsonTSE = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export async function lerTSE(caminho: string): Promise<JsonTSE | null> {
  const r = await fetch(`${TSE}/${caminho}`, { cache: 'no-store' })
  if (r.status === 404 || r.status === 403) return null
  if (!r.ok) throw new Error(`TSE respondeu ${r.status}`)
  return r.json()
}

export function lerResultado(d: JsonTSE): ResultadoTSE {
  const cands: ResultadoTSE['cands'] = {}
  for (const g of d.carg ?? []) for (const a of g.agr ?? []) for (const p of a.par ?? []) for (const c of p.cand ?? [])
    cands[c.n] = { nome: c.nmu, partido: p.sg, votos: +c.vap, pct: num(c.pvapn) }
  return {
    cands, hora: `${d.dt} ${d.ht}`, secoes: +d.s.st, totalSecoes: +d.s.ts, pct: num(d.s.pstn), validos: +d.v.vv,
  }
}

// Referência do 1º turno por UF: bloco direita × esquerda reescalado para 2 candidatos.
export function priorUF(h1: H1 | undefined, uf: string) {
  const x = h1?.ufs[uf]
  if (!x) return null
  const d = x.blocos.direita ?? 0, e = x.blocos.esquerda ?? 0
  return { flavio: (100 * d) / (d + e), lula: (100 * e) / (d + e), validos: x.validos }
}

// Projeção ajustada por UF: o que falta de cada UF vota como o que já veio dela.
// Abaixo de 5% apurado, mistura com o 1º turno corrigido pelo swing médio.
export function projetar(porUf: Record<string, UFVivo>, h1: H1 | undefined): [number, number] | null {
  const vivos = Object.entries(porUf).filter(([, x]) => (x.pct ?? 0) > 0 && (x.validos ?? 0) > 0 && x.flavio != null)
  if (!vivos.length) return null
  let sf = 0, sl = 0, sw = 0
  for (const [uf, x] of vivos) {
    const p = priorUF(h1, uf)
    if (!p) continue
    sf += (x.flavio! - p.flavio) * x.validos!; sl += (x.lula! - p.lula) * x.validos!; sw += x.validos!
  }
  const swing = sw ? [sf / sw, sl / sw] : [0, 0]
  let f = 0, l = 0, peso = 0
  for (const uf of UFS) {
    const x = porUf[uf] ?? {}, p = priorUF(h1, uf)
    const base = p ? [p.flavio + swing[0], p.lula + swing[1]] : null
    let share: number[], est: number
    if ((x.pct ?? 0) > 0 && (x.validos ?? 0) > 0 && x.flavio != null) {
      const w = Math.min(1, x.pct! / 5)
      share = base ? [w * x.flavio + (1 - w) * base[0], w * x.lula! + (1 - w) * base[1]] : [x.flavio, x.lula!]
      est = (x.validos! * 100) / x.pct!
    } else if (base && p) { share = base; est = p.validos } else continue
    f += share[0] * est; l += share[1] * est; peso += est
  }
  return [f / peso, l / peso]
}
