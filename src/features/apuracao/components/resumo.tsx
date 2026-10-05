import { Sparkles } from 'lucide-react'
import { FLAVIO, LULA, fmt, fmtInt } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { useMomento } from '@/hooks/use-momento'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { resumoReplay, resumoVivo } from '../textos'

function PlacarBarra({ f, l, df, dl, rodape }: { f: number; l: number; df: string; dl: string; rodape: string }) {
  const resto = Math.max(0, 100 - f - l)
  return (
    <div className='space-y-3'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className='size-2.5 rounded-sm' style={{ background: 'var(--flavio)' }} /> Flávio Bolsonaro (PL)
          </p>
          <p className='tabular text-3xl font-bold tracking-tight'>{fmt(f, 2)}%</p>
          <p className='text-xs text-muted-foreground'>{df}</p>
        </div>
        <div className='text-end'>
          <p className='flex items-center justify-end gap-1.5 text-xs text-muted-foreground'>
            Lula (PT) <span className='size-2.5 rounded-sm' style={{ background: 'var(--lula)' }} />
          </p>
          <p className='tabular text-3xl font-bold tracking-tight'>{fmt(l, 2)}%</p>
          <p className='text-xs text-muted-foreground'>{dl}</p>
        </div>
      </div>
      <div className='flex h-3 gap-0.5 overflow-hidden rounded-full' role='img' aria-label={`Flávio ${fmt(f)}%, outros ${fmt(resto)}%, Lula ${fmt(l)}%`}>
        <div style={{ width: `${f}%`, background: 'var(--flavio)' }} />
        <div className='bg-muted' style={{ width: `${resto}%` }} />
        <div style={{ width: `${l}%`, background: 'var(--lula)' }} />
      </div>
      <p className='text-xs text-muted-foreground'>{rodape}</p>
    </div>
  )
}

export function Resumo() {
  const { modo } = useApuracao()
  const { data: h } = useH1()
  const m = useMomento()
  if (!h) return null
  const vivo = modo === 'vivo'
  const r = vivo ? resumoVivo(m, h) : resumoReplay(h)
  const F = h.candidatos.find((c) => c.numero === FLAVIO)!
  const L = h.candidatos.find((c) => c.numero === LULA)!
  return (
    <Card>
      <CardContent className='grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center'>
        <div className='space-y-3'>
          <Badge variant='secondary' className='gap-1'>
            <Sparkles className='size-3' />
            {vivo ? 'Agora, em 30 segundos' : 'Resumo do 1º turno em 30 segundos'}
          </Badge>
          {r ? (
            <>
              <h2 className='text-xl leading-snug font-semibold tracking-tight'>{r.titulo}</h2>
              <ul className='space-y-2 text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground'>
                {r.itens.map((it, i) => (
                  <li key={i} className='flex gap-2'>
                    <span className='text-muted-foreground/60'>→</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className='text-muted-foreground'>Aguardando os primeiros números do TSE.</p>
          )}
        </div>
        {vivo ? (
          m.pronto && m.flavio != null && m.lula != null ? (
            <PlacarBarra f={m.flavio} l={m.lula} df={`${fmtInt(m.votosF)} votos`} dl={`${fmtInt(m.votosL)} votos`} rodape={`Placar do TSE às ${m.hora} · ${fmt(m.pct, 1)}% apurado`} />
          ) : null
        ) : (
          <PlacarBarra f={F.pct} l={L.pct} df={`${fmtInt(F.votos)} votos`} dl={`${fmtInt(L.votos)} votos`} rodape={`Resultado oficial do TSE · outros candidatos somaram ${fmt(100 - F.pct - L.pct)}% dos válidos`} />
        )}
      </CardContent>
    </Card>
  )
}
