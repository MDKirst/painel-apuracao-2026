/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { COR_REGIAO, REGIOES, type Regiao, fmt, fmtInt, hhmm, sinal } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { type H1Derivado } from '@/hooks/use-h1'
import { type PontoHist } from '@/hooks/use-vivo'

const EIXO = { tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, axisLine: false, tickLine: false } as const
const GRADE = { stroke: 'var(--border)', vertical: false } as const
const INI = Date.parse('2026-10-04T17:00:00-03:00')
const FIM = Date.parse('2026-10-05T01:00:00-03:00')
const TICKS = Array.from({ length: 9 }, (_, i) => INI + i * 3_600_000)

/* ---------- dica (tooltip) no estilo do shadcn ---------- */
function Dica({ titulo, linhas }: { titulo: React.ReactNode; linhas: [string, React.ReactNode, string?][] }) {
  return (
    <div className='min-w-44 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl'>
      <div className='mb-1 font-medium'>{titulo}</div>
      {linhas.map(([n, v, cor]) => (
        <div key={n} className='flex items-center justify-between gap-4'>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            {cor && <span className='size-2 rounded-[2px]' style={{ background: cor }} />}
            {n}
          </span>
          <span className='tabular font-medium text-foreground'>{v}</span>
        </div>
      ))}
    </div>
  )
}

function Legenda({ itens }: { itens: [string, string, ('linha' | 'tracejada' | 'ponto' | 'quadrado')?][] }) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground'>
      {itens.map(([n, cor, tipo = 'linha']) => (
        <span key={n} className='flex items-center gap-1.5'>
          {tipo === 'ponto' ? (
            <span className='size-2.5 rounded-full border-2 bg-background' style={{ borderColor: cor }} />
          ) : tipo === 'quadrado' ? (
            <span className='size-2.5 rounded-[2px]' style={{ background: cor }} />
          ) : (
            <span className='h-0 w-4' style={{ borderTop: `2px ${tipo === 'tracejada' ? 'dashed' : 'solid'} ${cor}` }} />
          )}
          {n}
        </span>
      ))}
    </div>
  )
}

/* ---------- rótulo na ponta da barra (direita se positivo, esquerda se negativo) ---------- */
function rotuloPonta(fmtV: (v: number) => string) {
  return ({ x, y, width, height, value }: any) => {
    const fim = value >= 0 ? x + Math.max(width, 0) + 4 : x + Math.min(width, 0) - 4
    return (
      <text x={fim} y={y + height / 2} dy={4} fontSize={11} fill='var(--muted-foreground)' textAnchor={value >= 0 ? 'start' : 'end'}>
        {fmtV(value)}
      </text>
    )
  }
}

/* ---------- reduz a série para ~1 ponto a cada 2 min (até 01h) ---------- */
function useSerie(h: H1Derivado) {
  return useMemo(() => {
    const s = h.serie
    const out = []
    for (let i = 0; i < h.tempos.length; i++) {
      const t = h.tempos[i]
      if (t > FIM) break
      if (i % 2 && i !== h.tempos.length - 1) continue
      const b = s.grupos.Brasil[i]
      const reg: Record<string, number> = {}
      for (const r of REGIOES) reg[r] = s.grupos[r][i][0]
      const ok = b[0] >= 1 // abaixo de 1% das urnas o placar é só ruído
      out.push({ i, t, pct: b[0], f: ok ? b[1] : null, l: ok ? b[2] : null, pf: ok ? s.projecao_uf[i][0] : null, pl: ok ? s.projecao_uf[i][1] : null, ...reg })
    }
    return out
  }, [h])
}

/* =============== 1. Evolução do placar =============== */
export function GraficoPlacar({ h, hist }: { h: H1Derivado; hist?: PontoHist[] }) {
  const { modo, t } = useApuracao()
  const serie = useSerie(h)
  const vivo = modo === 'vivo'
  const dados: any[] = vivo ? (hist ?? []).map((p) => ({ t: p.t, pct: p.pct, f: p.f, l: p.l, pf: p.pf, pl: p.pl })) : serie
  const g1 = (h.kpis.validacao_g1 ?? []).map((x) => ({ t: Date.parse(`2026-10-04T${x.hora.replace('h', ':')}:00-03:00`), g1f: x.g1_flavio, g1l: x.g1_lula }))
  const tAtual = t == null ? null : h.tempos[t]
  if (vivo && dados.length < 2)
    return (
      <div className='flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground'>
        O gráfico começa a ser desenhado a partir de agora.
        <br />O histórico da noite fica salvo no seu navegador.
      </div>
    )
  const vals = dados.flatMap((d: any) => [d.f, d.l]).filter((x: any) => x != null) as number[]
  const yMin = 5 * Math.floor((Math.min(...vals) - 0.5) / 5)
  const yMax = 5 * Math.ceil((Math.max(...vals) + 0.5) / 5)
  const ticksY = Array.from({ length: (yMax - yMin) / 5 + 1 }, (_, k) => yMin + 5 * k)
  return (
    <>
      <ResponsiveContainer width='100%' height={300}>
        <ComposedChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRADE} />
          <XAxis dataKey='t' type='number' scale='time' domain={vivo ? ['dataMin', 'dataMax'] : [INI, FIM]} ticks={vivo ? undefined : TICKS} tickFormatter={hhmm} {...EIXO} />
          <YAxis domain={[yMin, yMax]} ticks={ticksY} tickFormatter={(v) => `${v}%`} width={40} {...EIXO} />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
            content={({ active, payload }: any) => {
              const d = active && payload?.[0]?.payload
              if (!d || d.f == null) return null
              return (
                <Dica
                  titulo={`${hhmm(d.t)} · ${fmt(d.pct, 1)}% apurado`}
                  linhas={[
                    ['Flávio', `${fmt(d.f, 2)}%`, 'var(--flavio)'],
                    ['Lula', `${fmt(d.l, 2)}%`, 'var(--lula)'],
                    ['Vantagem', `${sinal(d.f - d.l, 2)} pp`],
                    ['Projeção', d.pf != null ? `${sinal(d.pf - d.pl, 2)} pp` : '–'],
                  ]}
                />
              )
            }}
          />
          <Line dataKey='pf' stroke='var(--flavio)' strokeWidth={1.5} strokeDasharray='5 4' dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey='pl' stroke='var(--lula)' strokeWidth={1.5} strokeDasharray='5 4' dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey='f' stroke='var(--flavio)' strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey='l' stroke='var(--lula)' strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
          {!vivo && (
            <>
              <Scatter data={g1} dataKey='g1f' fill='var(--background)' stroke='var(--flavio)' strokeWidth={2} isAnimationActive={false} />
              <Scatter data={g1} dataKey='g1l' fill='var(--background)' stroke='var(--lula)' strokeWidth={2} isAnimationActive={false} />
            </>
          )}
          {tAtual && <ReferenceLine x={tAtual} stroke='var(--foreground)' strokeOpacity={0.5} />}
        </ComposedChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          ['Flávio', 'var(--flavio)'],
          ['Lula', 'var(--lula)'],
          ['Projeção', 'var(--muted-foreground)', 'tracejada'],
          ...(!vivo ? ([['Placar mostrado pelo TSE (g1)', 'var(--muted-foreground)', 'ponto']] as [string, string, 'ponto'][]) : []),
        ]}
      />
    </>
  )
}

/* =============== 2. Ritmo por região =============== */
export function GraficoRitmo({ h, hist }: { h: H1Derivado; hist?: PontoHist[] }) {
  const { modo, t } = useApuracao()
  const serie = useSerie(h)
  const vivo = modo === 'vivo'
  const dados: any[] = vivo ? (hist ?? []).map((p) => ({ t: p.t, ...p.regs })) : serie
  const tAtual = t == null ? null : h.tempos[t]
  return (
    <>
      <ResponsiveContainer width='100%' height={260}>
        <LineChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRADE} />
          <XAxis dataKey='t' type='number' scale='time' domain={vivo ? ['dataMin', 'dataMax'] : [INI, FIM]} ticks={vivo ? undefined : TICKS} tickFormatter={hhmm} {...EIXO} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} {...EIXO} />
          <Tooltip
            content={({ active, payload }: any) => {
              const d = active && payload?.[0]?.payload
              if (!d) return null
              return <Dica titulo={`${hhmm(d.t)} · urnas apuradas`} linhas={REGIOES.map((r) => [r, `${fmt(d[r], 0)}%`, COR_REGIAO[r]])} />
            }}
          />
          {REGIOES.map((r) => (
            <Line key={r} dataKey={r} stroke={COR_REGIAO[r]} strokeWidth={2} strokeDasharray={r === 'Exterior' ? '5 4' : undefined} dot={false} isAnimationActive={false} />
          ))}
          {tAtual && !vivo && <ReferenceLine x={tAtual} stroke='var(--foreground)' strokeOpacity={0.5} />}
        </LineChart>
      </ResponsiveContainer>
      <Legenda itens={REGIOES.map((r) => [r, COR_REGIAO[r], r === 'Exterior' ? 'tracejada' : 'linha'])} />
    </>
  )
}

/* =============== 3. Composição regional dos votos contados =============== */
export function GraficoComposicao({ etapas }: { etapas: { rotulo: string; regioes: Record<Regiao, number> }[] }) {
  const dados = etapas.map((e) => ({ rotulo: e.rotulo, ...e.regioes }))
  return (
    <>
      <ResponsiveContainer width='100%' height={Math.max(160, etapas.length * 44 + 20)}>
        <BarChart data={dados} layout='vertical' margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barCategoryGap={8}>
          <XAxis type='number' domain={[0, 100]} hide />
          <YAxis type='category' dataKey='rotulo' width={150} {...EIXO} />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            content={({ active, payload }: any) => {
              const d = active && payload?.[0]?.payload
              if (!d) return null
              return <Dica titulo={d.rotulo} linhas={REGIOES.map((r) => [r, `${fmt(d[r], 1)}%`, COR_REGIAO[r]])} />
            }}
          />
          {REGIOES.map((r, i) => (
            <Bar key={r} dataKey={r} stackId='a' fill={COR_REGIAO[r]} stroke='var(--card)' strokeWidth={1} radius={i === 0 ? [4, 0, 0, 4] : i === REGIOES.length - 1 ? [0, 4, 4, 0] : 0} isAnimationActive={false}>
              <LabelList dataKey={r} position='center' fill='#fff' fontSize={10} fontWeight={600} formatter={(v: any) => (v >= 8 ? `${fmt(v, 0)}%` : '')} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legenda itens={REGIOES.map((r) => [r, COR_REGIAO[r], 'quadrado'])} />
    </>
  )
}

/* =============== 4. Viés: vantagem × % apurado =============== */
export function GraficoVies({ h, hist }: { h: H1Derivado; hist?: PontoHist[] }) {
  const { modo, t } = useApuracao()
  const vivo = modo === 'vivo'
  const final = h.brasil.margem_pp
  const ref = useMemo(() => {
    const s = h.serie
    const out = []
    for (let i = 0; i < s.grupos.Brasil.length; i += 2) {
      const b = s.grupos.Brasil[i]
      const p = s.projecao_uf[i]
      if (b[0] < 1 || b[1] == null || b[2] == null) continue
      out.push({ x: b[0], placar: b[1] - b[2], proj: p[0] != null && p[1] != null ? p[0] - p[1] : null, vies: b[1] - b[2] - final })
    }
    return out
  }, [h, final])
  const dados = vivo
    ? (hist ?? []).filter((p) => p.f != null).map((p) => ({ x: p.pct, placar: p.f! - p.l!, proj: p.pf != null ? p.pf - p.pl! : null }))
    : ref
  const xAtual = !vivo && t != null ? h.serie.grupos.Brasil[t][0] : null
  return (
    <>
      <ResponsiveContainer width='100%' height={260}>
        <ComposedChart margin={{ top: 8, right: 12, left: 0, bottom: 14 }}>
          <CartesianGrid {...GRADE} />
          <XAxis dataKey='x' type='number' domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: 'urnas apuradas', position: 'insideBottom', offset: -10, fill: 'var(--muted-foreground)', fontSize: 11 }} {...EIXO} />
          <YAxis tickFormatter={(v) => sinal(v, 0)} width={44} {...EIXO} />
          <Tooltip
            content={({ active, payload }: any) => {
              const d = active && payload?.[0]?.payload
              if (!d) return null
              return (
                <Dica
                  titulo={`${fmt(d.x, 1)}% apurado`}
                  linhas={[
                    ...(d.placar != null ? [['Placar', `${sinal(d.placar, 2)} pp`] as [string, string]] : []),
                    ...(d.proj != null ? [['Projeção', `${sinal(d.proj, 2)} pp`] as [string, string]] : []),
                    ...(d.vies != null ? [['Engano (1º turno)', `${sinal(d.vies, 2)} pp`] as [string, string]] : []),
                    ...(!vivo ? [['Resultado final', `${sinal(final, 2)} pp`] as [string, string]] : []),
                  ]}
                />
              )
            }}
          />
          <ReferenceLine y={0} stroke='var(--border)' />
          {!vivo && <ReferenceLine y={final} stroke='var(--flavio)' strokeDasharray='2 3' label={{ value: `final ${sinal(final, 1)}`, position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 11 }} />}
          {vivo && <Line data={ref} dataKey='vies' stroke='var(--muted-foreground)' strokeWidth={1.5} strokeDasharray='2 3' dot={false} isAnimationActive={false} />}
          <Line data={dados} dataKey='proj' stroke='var(--muted-foreground)' strokeWidth={1.5} strokeDasharray='5 4' dot={false} isAnimationActive={false} connectNulls />
          <Line data={dados} dataKey='placar' stroke='var(--foreground)' strokeWidth={2.5} dot={false} isAnimationActive={false} />
          {xAtual != null && <ReferenceLine x={xAtual} stroke='var(--foreground)' strokeOpacity={0.5} />}
        </ComposedChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          ['Vantagem no placar', 'var(--foreground)'],
          ['Projeção', 'var(--muted-foreground)', 'tracejada'],
          vivo ? ['Engano do placar no 1º turno', 'var(--muted-foreground)', 'tracejada'] : ['Resultado final', 'var(--flavio)', 'tracejada'],
        ]}
      />
    </>
  )
}

/* =============== 5. Saldo de votos por região =============== */
export function GraficoSaldo({ h }: { h: H1Derivado }) {
  const dados = [...REGIOES]
    .map((r) => ({ r, v: h.regioes[r].saldo_votos / 1e6, m: h.regioes[r].margem_pp }))
    .sort((a, b) => b.v - a.v)
  return (
    <ResponsiveContainer width='100%' height={260}>
      <BarChart data={dados} layout='vertical' margin={{ top: 0, right: 56, left: 48, bottom: 0 }}>
        <CartesianGrid stroke='var(--border)' horizontal={false} />
        <XAxis type='number' tickFormatter={(v) => `${sinal(v, 0)} mi`} {...EIXO} />
        <YAxis type='category' dataKey='r' width={92} {...EIXO} />
        <ReferenceLine x={0} stroke='var(--muted-foreground)' />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={({ active, payload }: any) => {
            const d = active && payload?.[0]?.payload
            if (!d) return null
            return (
              <Dica
                titulo={d.r}
                linhas={[
                  ['Saldo', `${d.v > 0 ? 'Flávio' : 'Lula'} +${fmtInt(Math.abs(d.v) * 1e6)}`],
                  ['Margem', `${sinal(d.m)} pp`],
                ]}
              />
            )
          }}
        />
        <Bar dataKey='v' barSize={18} isAnimationActive={false}>
          {dados.map((d) => (
            <Cell key={d.r} fill={d.v >= 0 ? 'var(--flavio)' : 'var(--lula)'} radius={(d.v >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as any} />
          ))}
          <LabelList dataKey='v' content={rotuloPonta((v) => `${sinal(v, 1)} mi`)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* =============== 6. Dispersão: hora de chegada × vantagem, por estado =============== */
export function GraficoDispersao({ h }: { h: H1Derivado }) {
  const t0 = Date.parse(h.serie.inicio)
  const pts = Object.entries(h.ufs)
    .filter(([u]) => u !== 'zz')
    .map(([u, x]) => ({ uf: u.toUpperCase(), x: t0 + x.t50_min * 60_000, y: x.margem_pp, z: x.eleitores, t50: x.t50, regiao: x.regiao }))
  return (
    <ResponsiveContainer width='100%' height={280}>
      <ScatterChart margin={{ top: 8, right: 20, left: 0, bottom: 14 }}>
        <CartesianGrid {...GRADE} />
        <XAxis dataKey='x' type='number' scale='time' domain={['dataMin - 600000', 'dataMax + 600000']} tickFormatter={hhmm} label={{ value: 'horário em que metade das urnas chegou', position: 'insideBottom', offset: -10, fill: 'var(--muted-foreground)', fontSize: 11 }} {...EIXO} />
        <YAxis dataKey='y' type='number' tickFormatter={(v) => sinal(v, 0)} width={44} {...EIXO} />
        <ZAxis dataKey='z' range={[60, 900]} />
        <ReferenceLine y={0} stroke='var(--muted-foreground)' strokeDasharray='3 3' />
        <Tooltip
          content={({ active, payload }: any) => {
            const d = active && payload?.[0]?.payload
            if (!d) return null
            return (
              <Dica
                titulo={`${d.uf} · ${d.regiao}`}
                linhas={[
                  ['Metade chegou às', d.t50],
                  ['Margem', `${sinal(d.y)} pp`],
                  ['Eleitores', fmtInt(d.z)],
                ]}
              />
            )
          }}
        />
        <Scatter data={pts} isAnimationActive={false}>
          {pts.map((p) => (
            <Cell key={p.uf} fill={p.y >= 0 ? 'var(--flavio)' : 'var(--lula)'} fillOpacity={0.75} stroke='var(--card)' strokeWidth={1.5} />
          ))}
          <LabelList dataKey='uf' position='top' fill='var(--muted-foreground)' fontSize={9} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/* =============== 7. Porte do município =============== */
export function GraficoPorte({ h }: { h: H1Derivado }) {
  const dados = h.kpis.porte.map((p) => ({ ...p, faixa: p.faixa.replace(' eleitores', '') }))
  return (
    <ResponsiveContainer width='100%' height={230}>
      <BarChart data={dados} layout='vertical' margin={{ top: 0, right: 40, left: 28, bottom: 0 }}>
        <CartesianGrid stroke='var(--border)' horizontal={false} />
        <XAxis type='number' tickFormatter={(v) => sinal(v, 0)} {...EIXO} />
        <YAxis type='category' dataKey='faixa' width={86} {...EIXO} />
        <ReferenceLine x={0} stroke='var(--muted-foreground)' />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={({ active, payload }: any) => {
            const d = active && payload?.[0]?.payload
            if (!d) return null
            return (
              <Dica
                titulo={`Cidades com ${d.faixa} eleitores`}
                linhas={[
                  ['Municípios', fmtInt(d.municipios)],
                  ['Peso nos votos', `${fmt(d.peso_validos_pct)}%`],
                  ['Margem', `${sinal(d.margem_pp)} pp`],
                  ['Metade chegou às', d.t50],
                ]}
              />
            )
          }}
        />
        <Bar dataKey='margem_pp' barSize={16} isAnimationActive={false}>
          {dados.map((d) => (
            <Cell key={d.faixa} fill={d.margem_pp >= 0 ? 'var(--flavio)' : 'var(--lula)'} radius={(d.margem_pp >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as any} />
          ))}
          <LabelList dataKey='margem_pp' content={rotuloPonta((v) => sinal(v, 0))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* =============== 8. Polarização dos municípios =============== */
const CORES_CLASSE = ['var(--d-l3)', 'var(--d-l2)', 'var(--d-l1)', 'var(--d-f1)', 'var(--d-f2)', 'var(--d-f3)']
const NOME_CLASSE: Record<string, string> = {
  'Lula +30': 'Lula +30', 'Lula +10 a +30': 'Lula +10 a 30', 'Lula 0 a +10': 'Lula até 10',
  'Flávio 0 a +10': 'Flávio até 10', 'Flávio +10 a +30': 'Flávio +10 a 30', 'Flávio +30': 'Flávio +30',
}
export function GraficoPolarizacao({ h }: { h: H1Derivado }) {
  const cl = h.kpis.inclinacao_municipios
  const regs = REGIOES.filter((r) => r !== 'Exterior')
  const dados = regs.map((r) => {
    const tot = Object.values(cl.regioes[r]).reduce((a, x) => a + x, 0)
    const o: Record<string, any> = { r, tot }
    for (const c of cl.classes) {
      o[c] = (100 * cl.regioes[r][c]) / tot
      o[`n_${c}`] = cl.regioes[r][c]
    }
    return o
  })
  return (
    <>
      <ResponsiveContainer width='100%' height={210}>
        <BarChart data={dados} layout='vertical' margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
          <XAxis type='number' domain={[0, 100]} hide />
          <YAxis type='category' dataKey='r' width={92} {...EIXO} />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            content={({ active, payload }: any) => {
              const d = active && payload?.[0]?.payload
              if (!d) return null
              return <Dica titulo={`${d.r} · ${fmtInt(d.tot)} cidades`} linhas={cl.classes.map((c, i) => [NOME_CLASSE[c], `${fmtInt(d[`n_${c}`])} (${fmt(d[c], 0)}%)`, CORES_CLASSE[i]])} />
            }}
          />
          {cl.classes.map((c, i) => (
            <Bar key={c} dataKey={c} stackId='a' fill={CORES_CLASSE[i]} stroke='var(--card)' strokeWidth={1} barSize={18} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legenda itens={cl.classes.map((c, i) => [NOME_CLASSE[c], CORES_CLASSE[i], 'quadrado'])} />
    </>
  )
}

/* =============== 9. Abstenção =============== */
export function GraficoAbstencao({ h }: { h: H1Derivado }) {
  const dados = REGIOES.map((r) => ({ r, v: h.regioes[r].abstencao_pct, bn: h.regioes[r].brancos_nulos_pct }))
  return (
    <ResponsiveContainer width='100%' height={230}>
      <BarChart data={dados} layout='vertical' margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid stroke='var(--border)' horizontal={false} />
        <XAxis type='number' tickFormatter={(v) => `${v}%`} {...EIXO} />
        <YAxis type='category' dataKey='r' width={92} {...EIXO} />
        <ReferenceLine x={h.brasil.abstencao_pct} stroke='var(--muted-foreground)' strokeDasharray='3 3' label={{ value: 'Brasil', position: 'top', fill: 'var(--muted-foreground)', fontSize: 10 }} />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={({ active, payload }: any) => {
            const d = active && payload?.[0]?.payload
            if (!d) return null
            return <Dica titulo={d.r} linhas={[['Abstenção', `${fmt(d.v)}%`], ['Brancos e nulos', `${fmt(d.bn)}%`]]} />
          }}
        />
        <Bar dataKey='v' barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {dados.map((d) => (
            <Cell key={d.r} fill={COR_REGIAO[d.r]} />
          ))}
          <LabelList dataKey='v' position='right' fill='var(--muted-foreground)' fontSize={11} formatter={(v: any) => `${fmt(v, 0)}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
