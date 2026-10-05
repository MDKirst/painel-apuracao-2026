// "Já está decidido?" — contas a partir do que já foi apurado e do que ainda falta.
import { UFS, type UFVivo } from './eleicao'

export type Entrada = {
  pct: number // % de urnas apuradas no país
  votosF: number
  votosL: number
  validos: number // votos válidos já contados (todos os candidatos)
  porUf: Record<string, UFVivo> // pct e eleitores por UF
  projF?: number // projeção ajustada (% dos válidos)
  projL?: number
}

export type Situacao = {
  lider: 'Flávio' | 'Lula'
  atras: 'Flávio' | 'Lula'
  vantagem: number // votos
  restEleitores: number // eleitores das urnas ainda não apuradas
  restValidos: number // estimativa de votos válidos que ainda vão entrar
  margemNecessaria: number // pp que o de trás precisa tirar sobre o líder nos votos restantes
  margemAtual: number // pp que o de trás está fazendo nos votos já contados (negativo = perdendo)
  matematico: boolean // nem com 100% dos eleitores restantes o de trás passa
  pratico: boolean // nem com 100% dos válidos esperados o de trás passa
  chanceLider: number | null // 0–1, pela projeção e margem de erro
  margemProj: number | null
  erroPadrao: number
  // 1º turno: alguém ainda pode passar de 50% e evitar o 2º turno?
  segundoTurnoGarantido: boolean
  maxPossivelLider: number // % máximo dos válidos que o líder ainda alcançaria
}

const erf = (x: number) => {
  // Abramowitz & Stegun 7.1.26
  const s = Math.sign(x)
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return s * y
}
const normal = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))

/** Margem de erro (desvio, em pp) da projeção conforme o quanto já foi apurado.
 *  Regra fixa, com folga sobre os erros observados no 1º turno de 2026
 *  (4,6 pp com 5% apurado; 1,1 com 50%; 0,5 com 90%). */
export const erroPadrao = (pct: number) => 0.4 + 3 * (1 - pct / 100)

export function avaliar(e: Entrada): Situacao {
  const fNaFrente = e.votosF >= e.votosL
  const lider = fNaFrente ? 'Flávio' : 'Lula'
  const atras = fNaFrente ? 'Lula' : 'Flávio'
  const vantagem = Math.abs(e.votosF - e.votosL)

  let restEleitores = 0
  let eleitoresApurados = 0
  for (const uf of UFS) {
    const x = e.porUf[uf]
    if (!x?.eleitores) continue
    const p = Math.min(100, Math.max(0, x.pct ?? 0)) / 100
    restEleitores += x.eleitores * (1 - p)
    eleitoresApurados += x.eleitores * p
  }
  // quantos válidos cada eleitor das urnas já apuradas rendeu (comparecimento × válidos)
  const taxa = eleitoresApurados > 0 ? e.validos / eleitoresApurados : 0.75
  const restValidos = restEleitores * taxa

  const margemNecessaria = restValidos > 0 ? (100 * vantagem) / restValidos : Infinity
  const margemAtual = e.validos > 0 ? (100 * (fNaFrente ? e.votosL - e.votosF : e.votosF - e.votosL)) / e.validos : 0

  const margemProj = e.projF != null && e.projL != null ? (fNaFrente ? e.projF - e.projL : e.projL - e.projF) : null
  const sd = erroPadrao(e.pct)
  const chanceLider = margemProj == null ? null : e.pct >= 100 ? (vantagem > 0 ? 1 : 0.5) : normal(margemProj / sd)

  const votosLider = Math.max(e.votosF, e.votosL)
  const maxPossivelLider = (100 * (votosLider + restEleitores)) / (e.validos + restEleitores)

  return {
    lider, atras, vantagem, restEleitores, restValidos, margemNecessaria, margemAtual,
    matematico: vantagem > restEleitores,
    pratico: vantagem > restValidos,
    chanceLider, margemProj, erroPadrao: sd,
    segundoTurnoGarantido: maxPossivelLider < 50,
    maxPossivelLider,
  }
}
