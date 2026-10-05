import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FLAVIO,
  LULA,
  REGIAO,
  REGIOES,
  type Regiao,
  type ResultadoTSE,
  UFS,
  type UFVivo,
  lerResultado,
  lerTSE,
  num,
  projetar,
} from '@/lib/eleicao'
import { useH1 } from './use-h1'

export const ELE_VIVO = new URLSearchParams(location.search).get('ele') || '6258' // 2º turno
export const POLL_BR = 15_000
const POLL_UF = 60_000
const CHAVE = `apuracao-hist-${ELE_VIVO}`

export type PontoHist = {
  t: number
  pct: number
  f?: number
  l?: number
  pf?: number
  pl?: number
  regs: Record<Regiao, number>
}

function lerHist(): PontoHist[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]')
  } catch {
    return []
  }
}
function gravarHist(h: PontoHist[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(h.slice(-2000)))
  } catch {
    /* sem armazenamento: segue sem histórico */
  }
}

/** O 2º turno já tem dados no TSE? (decide o modo inicial) */
export function useTemVivo() {
  return useQuery({
    queryKey: ['tem-vivo', ELE_VIVO],
    queryFn: async () => !!(await lerTSE(`${ELE_VIVO}/dados/br/br-c0001-e00${ELE_VIVO}-u.json`)),
    staleTime: 60_000,
    retry: false,
  })
}

export function useVivo(ativo: boolean) {
  const { data: h1 } = useH1()
  const br = useQuery({
    queryKey: ['vivo-br', ELE_VIVO],
    enabled: ativo,
    refetchInterval: POLL_BR,
    queryFn: async () => {
      const [res, ab] = await Promise.all([
        lerTSE(`${ELE_VIVO}/dados/br/br-c0001-e00${ELE_VIVO}-u.json`),
        lerTSE(`${ELE_VIVO}/dados/br/br-e00${ELE_VIVO}-ab.json`),
      ])
      if (!res || !ab) return null
      const andamento: Record<string, UFVivo> = {}
      for (const a of ab.abr)
        if (a.tpabr === 'uf') andamento[a.cdabr] = { pct: num(a.s.pstn), eleitores: +a.e.te }
      return { resultado: lerResultado(res), andamento }
    },
  })
  const comUrnas = UFS.filter((uf) => (br.data?.andamento[uf]?.pct ?? 0) > 0)
  const ufs = useQuery({
    queryKey: ['vivo-ufs', ELE_VIVO, comUrnas.length],
    enabled: ativo && comUrnas.length > 0,
    refetchInterval: POLL_UF,
    queryFn: async () => {
      const out: Record<string, UFVivo> = {}
      for (const uf of comUrnas) {
        try {
          const d = await lerTSE(`${ELE_VIVO}/dados/${uf}/${uf}-c0001-e00${ELE_VIVO}-u.json`)
          if (!d) continue
          const r = lerResultado(d)
          out[uf] = {
            flavio: r.cands[FLAVIO]?.pct,
            lula: r.cands[LULA]?.pct,
            votosF: r.cands[FLAVIO]?.votos,
            votosL: r.cands[LULA]?.votos,
            validos: r.validos,
            pct: r.pct,
          }
        } catch {
          /* uma UF falhou: tenta no próximo ciclo */
        }
        await new Promise((ok) => setTimeout(ok, 120))
      }
      return out
    },
  })

  const porUf: Record<string, UFVivo> = {}
  for (const uf of UFS) porUf[uf] = { ...br.data?.andamento[uf], ...ufs.data?.[uf] }
  const resultado: ResultadoTSE | undefined = br.data?.resultado ?? undefined
  const proj = resultado ? projetar(porUf, h1) : null

  const [hist, setHist] = useState<PontoHist[]>(lerHist)
  const pct = resultado?.pct
  useEffect(() => {
    if (!resultado || pct == null) return
    const regs = {} as Record<Regiao, number>
    for (const r of REGIOES) {
      let s = 0
      let t = 0
      for (const uf of UFS)
        if (REGIAO[uf] === r) {
          s += (porUf[uf].pct ?? 0) * (porUf[uf].eleitores ?? 0)
          t += porUf[uf].eleitores ?? 0
        }
      regs[r] = t ? s / t : 0
    }
    setHist((h) => {
      const ult = h[h.length - 1]
      if (ult && ult.pct === pct) return h
      const novo = [
        ...h,
        { t: Date.now(), pct, f: resultado.cands[FLAVIO]?.pct, l: resultado.cands[LULA]?.pct, pf: proj?.[0], pl: proj?.[1], regs },
      ]
      gravarHist(novo)
      return novo
    })
    // só reage a uma nova totalização do TSE
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct])

  return {
    carregando: br.isLoading,
    erro: br.error as Error | null,
    semDados: br.isSuccess && !br.data,
    resultado,
    porUf,
    proj,
    hist,
    atualizadoEm: br.dataUpdatedAt,
  }
}
