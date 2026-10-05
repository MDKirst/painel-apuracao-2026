import { FLAVIO, LULA, UFS, type UFVivo, fmtInt, hhmm } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { useH1 } from './use-h1'
import { useVivo } from './use-vivo'

/** Retrato do placar no instante que está na tela (replay ou ao vivo), no mesmo formato. */
export type Momento = {
  pronto: boolean
  pct: number
  flavio?: number
  lula?: number
  votosF?: number
  votosL?: number
  validos?: number
  projF?: number
  projL?: number
  porUf: Record<string, UFVivo>
  hora: string
  det: string
  final?: number
}

const VAZIO: Momento = { pronto: false, pct: 0, porUf: {}, hora: '', det: '' }

export function useMomento(): Momento {
  const { modo, t } = useApuracao()
  const { data: h } = useH1()
  const vivo = useVivo(modo === 'vivo')
  if (modo === 'vivo') {
    const r = vivo.resultado
    if (!r) return VAZIO
    return {
      pronto: true,
      pct: r.pct,
      flavio: r.cands[FLAVIO]?.pct,
      lula: r.cands[LULA]?.pct,
      votosF: r.cands[FLAVIO]?.votos,
      votosL: r.cands[LULA]?.votos,
      validos: r.validos,
      projF: vivo.proj?.[0],
      projL: vivo.proj?.[1],
      porUf: vivo.porUf,
      hora: r.hora.slice(11, 16).replace(':', 'h'),
      det: `${fmtInt(r.secoes)} de ${fmtInt(r.totalSecoes)} urnas`,
    }
  }
  if (!h) return VAZIO
  const i = t ?? h.tempos.length - 1
  const br = h.serie.grupos.Brasil[i]
  const pj = h.serie.projecao_uf[i]
  const porUf: Record<string, UFVivo> = {}
  for (const uf of UFS) {
    const x = h.serie.ufs[uf]?.[i]
    if (x)
      porUf[uf] = {
        pct: x[0],
        flavio: x[1] ?? undefined,
        lula: x[2] ?? undefined,
        validos: x[3],
        votosF: x[1] != null ? Math.round((x[1] * x[3]) / 100) : undefined,
        votosL: x[2] != null ? Math.round((x[2] * x[3]) / 100) : undefined,
        eleitores: h.ufs[uf]?.eleitores,
      }
  }
  return {
    pronto: true,
    pct: br[0],
    flavio: br[1] ?? undefined,
    lula: br[2] ?? undefined,
    votosF: br[1] != null ? Math.round((br[1] * br[3]) / 100) : undefined,
    votosL: br[2] != null ? Math.round((br[2] * br[3]) / 100) : undefined,
    validos: br[3],
    projF: pj[0] ?? undefined,
    projL: pj[1] ?? undefined,
    porUf,
    hora: hhmm(h.tempos[i]),
    det: `${fmtInt(br[3])} votos válidos somados`,
    final: h.brasil.margem_pp,
  }
}
