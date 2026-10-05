import { useQuery } from '@tanstack/react-query'
import { type H1, REGIOES, type Regiao, hhmm } from '@/lib/eleicao'

export type H1Derivado = H1 & {
  tempos: number[]
  t50Regiao: Record<Regiao, number>
  t50RegiaoTxt: Record<Regiao, string>
  polarizadosPct: number
}

async function carregar(): Promise<H1Derivado> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/1turno.json`)
  if (!r.ok) throw new Error('Não foi possível carregar os dados do 1º turno')
  const h: H1 = await r.json()
  const t0 = Date.parse(h.serie.inicio)
  const passo = h.serie.passo_min * 60_000
  const tempos = h.serie.minutos
    ? h.serie.minutos.map((m) => t0 + m * 60_000)
    : h.serie.grupos.Brasil.map((_, i) => t0 + i * passo)
  const t50Regiao = {} as Record<Regiao, number>
  const t50RegiaoTxt = {} as Record<Regiao, string>
  for (const reg of REGIOES) {
    const i = h.serie.grupos[reg].findIndex((x) => x[0] >= 50)
    t50Regiao[reg] = i >= 0 ? i : 1e9
    t50RegiaoTxt[reg] = i >= 0 ? hhmm(tempos[i]) : '–'
  }
  let pol = 0
  let tot = 0
  for (const reg of Object.values(h.kpis.inclinacao_municipios.regioes))
    for (const [c, n] of Object.entries(reg)) {
      tot += n
      if (c === 'Lula +30' || c === 'Flávio +30') pol += n
    }
  return { ...h, tempos, t50Regiao, t50RegiaoTxt, polarizadosPct: (100 * pol) / tot }
}

export function useH1() {
  return useQuery({ queryKey: ['h1'], queryFn: carregar, staleTime: Infinity })
}
