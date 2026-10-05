import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FAIXAS_MARGEM,
  NOME_UF,
  REGIAO,
  type UFVivo,
  compacto,
  corMargem,
  fmt,
  fmtInt,
  textoSobre,
} from '@/lib/eleicao'
import { Skeleton } from '@/components/ui/skeleton'

type Mapa = { caixa: number[]; ufs: Record<string, { d: string; cx: number; cy: number }> }

// Estados pequenos demais para a etiqueta: chamada com linha até a coluna da direita.
const CHAMADA: Record<string, [number, number]> = {
  rn: [884, 150], pb: [884, 206], pe: [884, 262], al: [884, 318], se: [884, 374],
  df: [884, 452], es: [884, 540], rj: [884, 596],
}
// pequenos ajustes de posição da etiqueta (em px) para não cobrir vizinhos
const AJUSTE: Record<string, [number, number]> = {
  go: [-14, 26], mg: [-14, -6], ma: [-10, -4], pi: [4, 8], ba: [0, 6], ce: [-6, -6], ap: [0, 4], sc: [10, 0], pr: [-6, -4],
}
const LARG = 96
const ALT = 50

function useMapa() {
  return useQuery<Mapa>({
    queryKey: ['mapa-uf'],
    queryFn: async () => (await fetch(`${import.meta.env.BASE_URL}data/mapa-uf.json`)).json(),
    staleTime: Infinity,
  })
}

function Etiqueta({ x, y, uf, v, ativo }: { x: number; y: number; uf: string; v: UFVivo; ativo: boolean }) {
  const tem = (v.pct ?? 0) > 0 && v.votosF != null && v.votosL != null
  // disputa apertada (menos de 2% de diferença): número exato, para "212 mil × 213 mil" não esconder que são 225 votos
  const exato = tem && Math.abs(v.votosF! - v.votosL!) < 0.02 * Math.max(v.votosF!, v.votosL!)
  const num = (x?: number) => (exato ? fmtInt(x) : compacto(x))
  const fLidera = tem && v.votosF! > v.votosL!
  const lLidera = tem && v.votosL! > v.votosF!
  return (
    <g transform={`translate(${x - LARG / 2},${y - ALT / 2})`} pointerEvents='none' className='max-sm:hidden'>
      <rect width={LARG} height={ALT} rx={7} fill='var(--card)' fillOpacity={0.94} stroke={ativo ? 'var(--foreground)' : 'var(--border)'} />
      <text x={8} y={15} fontSize={11} fill='var(--foreground)' fontWeight={700}>
        {uf === 'zz' ? 'EXT' : uf.toUpperCase()}
        <tspan fontWeight={400} fill='var(--muted-foreground)'>
          {' '}· {fmt(v.pct ?? 0, 0)}% urnas
        </tspan>
      </text>
      <rect x={8} y={23} width={7} height={7} rx={1.5} fill='var(--flavio)' />
      <text x={19} y={30} fontSize={10.5} fill='var(--foreground)' fontWeight={fLidera ? 700 : 400} className='tabular'>
        {tem ? num(v.votosF) : '–'}
        {fLidera && <tspan fill='var(--flavio)'> ▲</tspan>}
      </text>
      <rect x={8} y={36} width={7} height={7} rx={1.5} fill='var(--lula)' />
      <text x={19} y={43} fontSize={10.5} fill='var(--foreground)' fontWeight={lLidera ? 700 : 400} className='tabular'>
        {tem ? num(v.votosL) : '–'}
        {lLidera && <tspan fill='var(--lula)'> ▲</tspan>}
      </text>
    </g>
  )
}

function Detalhe({ uf, v }: { uf: string | null; v: UFVivo | null }) {
  if (!uf || !v)
    return <p className='text-sm text-muted-foreground'>Passe o mouse ou toque num estado para ver os números completos.</p>
  const m = v.flavio != null && v.lula != null ? v.flavio - v.lula : null
  return (
    <div className='space-y-3 text-sm'>
      <div>
        <p className='text-base font-semibold'>{NOME_UF[uf]}</p>
        <p className='text-xs text-muted-foreground'>{REGIAO[uf]}</p>
      </div>
      <div>
        <p className='text-xs text-muted-foreground'>Urnas apuradas</p>
        <p className='tabular text-lg font-semibold'>{fmt(v.pct ?? 0, 1)}%</p>
        <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-muted'>
          <div className='h-full rounded-full bg-primary' style={{ width: `${v.pct ?? 0}%` }} />
        </div>
      </div>
      {[
        ['Flávio Bolsonaro', v.votosF, v.flavio, 'var(--flavio)'],
        ['Lula', v.votosL, v.lula, 'var(--lula)'],
      ].map(([n, votos, pct, cor]) => (
        <div key={n as string} className='flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1.5'>
            <span className='size-2.5 rounded-sm' style={{ background: cor as string }} />
            {n}
          </span>
          <span className='tabular text-end'>
            <b>{fmtInt(votos as number | undefined)}</b>
            <span className='ms-1 text-xs text-muted-foreground'>{fmt(pct as number | undefined, 1)}%</span>
          </span>
        </div>
      ))}
      <p className='text-xs text-muted-foreground'>
        Vantagem: <b className='text-foreground'>{m == null ? '–' : `${m > 0 ? 'Flávio' : 'Lula'} +${fmt(Math.abs(m), 1)} pp`}</b>
      </p>
    </div>
  )
}

export function MapaBrasil({ porUf }: { porUf: Record<string, UFVivo> }) {
  const { data: mapa } = useMapa()
  const [ativo, setAtivo] = useState<string | null>(null)
  if (!mapa) return <Skeleton className='aspect-square w-full' />
  const ufs = Object.keys(mapa.ufs)
  const pos = (uf: string): [number, number] => {
    if (CHAMADA[uf]) return [CHAMADA[uf][0] + LARG / 2, CHAMADA[uf][1] + ALT / 2]
    const a = AJUSTE[uf] ?? [0, 0]
    return [mapa.ufs[uf].cx + a[0], mapa.ufs[uf].cy + a[1]]
  }
  return (
    <div className='grid gap-6 lg:grid-cols-[1fr_240px]'>
      <div>
        <svg viewBox='0 0 1000 880' className='h-auto w-full' role='img' aria-label='Mapa do Brasil por estado: urnas apuradas e votos de cada candidato'>
          <defs>
            <pattern id='sem-urnas' width='6' height='6' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
              <rect width='6' height='6' fill='var(--muted)' />
              <line x1='0' y1='0' x2='0' y2='6' stroke='var(--border)' strokeWidth='2' />
            </pattern>
          </defs>
          {ufs.map((uf) => {
            const v = porUf[uf] ?? {}
            const m = (v.pct ?? 0) > 0 && v.flavio != null && v.lula != null ? v.flavio - v.lula : null
            const cor = corMargem(m)
            return (
              <path
                key={uf}
                d={mapa.ufs[uf].d}
                fill={cor ?? 'url(#sem-urnas)'}
                stroke={ativo === uf ? 'var(--foreground)' : 'var(--card)'}
                strokeWidth={ativo === uf ? 2.5 : 1.2}
                strokeLinejoin='round'
                tabIndex={0}
                role='button'
                aria-label={`${NOME_UF[uf]}: ${fmt(v.pct ?? 0, 0)}% das urnas, Flávio ${fmtInt(v.votosF)} votos, Lula ${fmtInt(v.votosL)} votos`}
                className='cursor-pointer outline-none'
                onMouseEnter={() => setAtivo(uf)}
                onFocus={() => setAtivo(uf)}
                onClick={() => setAtivo(uf)}
              />
            )
          })}
          {/* linhas das chamadas */}
          {Object.keys(CHAMADA).map((uf) => (
            <g key={`l-${uf}`} pointerEvents='none' className='max-sm:hidden'>
              <line x1={mapa.ufs[uf].cx} y1={mapa.ufs[uf].cy} x2={CHAMADA[uf][0]} y2={CHAMADA[uf][1] + ALT / 2} stroke='var(--muted-foreground)' strokeWidth={0.8} />
              <circle cx={mapa.ufs[uf].cx} cy={mapa.ufs[uf].cy} r={2.5} fill='var(--foreground)' />
            </g>
          ))}
          {ufs.map((uf) => {
            const [x, y] = pos(uf)
            return <Etiqueta key={`e-${uf}`} x={x} y={y} uf={uf} v={porUf[uf] ?? {}} ativo={ativo === uf} />
          })}
          {/* celular: só a sigla, grande; o toque abre o painel com os números */}
          {ufs.map((uf) => (
            <text key={`s-${uf}`} x={mapa.ufs[uf].cx} y={mapa.ufs[uf].cy} dy={9} fontSize={CHAMADA[uf] ? 18 : 26} fontWeight={700} textAnchor='middle' fill='var(--foreground)' stroke='var(--card)' strokeWidth={3} paintOrder='stroke' pointerEvents='none' className='sm:hidden'>
              {uf.toUpperCase()}
            </text>
          ))}
          {/* Exterior: sem contorno, só a etiqueta */}
          <g onMouseEnter={() => setAtivo('zz')} onClick={() => setAtivo('zz')} className='cursor-pointer'>
            <text x={20} y={792} fontSize={11} fill='var(--muted-foreground)'>
              Brasileiros no exterior
            </text>
            <Etiqueta x={20 + LARG / 2} y={800 + ALT / 2} uf='zz' v={porUf.zz ?? {}} ativo={ativo === 'zz'} />
          </g>
        </svg>
        <div className='mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
          {FAIXAS_MARGEM.map((f) => (
            <span key={f.cor + f.rotulo} className='flex items-center gap-1'>
              <span className='size-3 rounded-sm' style={{ background: f.cor, color: textoSobre(f.cor) }} />
              {f.rotulo}
            </span>
          ))}
          <span className='flex items-center gap-1'>
            <span className='size-3 rounded-sm border bg-muted' />
            sem urnas
          </span>
        </div>
      </div>
      <div className='rounded-lg border p-4 lg:self-start'>
        <Detalhe uf={ativo} v={ativo ? (porUf[ativo] ?? {}) : null} />
        <div className='mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground'>
          <p>Em cada estado:</p>
          <p>
            <b className='text-foreground'>SP · 87% urnas</b> = quanto já foi contado
          </p>
          <p className='flex items-center gap-1.5'>
            <span className='size-2 rounded-[2px]' style={{ background: 'var(--flavio)' }} /> votos de Flávio
          </p>
          <p className='flex items-center gap-1.5'>
            <span className='size-2 rounded-[2px]' style={{ background: 'var(--lula)' }} /> votos de Lula
          </p>
          <p>A cor do estado mostra quem está na frente.</p>
        </div>
      </div>
    </div>
  )
}
