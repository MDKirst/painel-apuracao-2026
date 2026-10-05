import { Activity, Crosshair, Scale } from 'lucide-react'
import { fmt, fmtInt, quemLidera, sinal } from '@/lib/eleicao'
import { type Momento } from '@/hooks/use-momento'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Stat({
  titulo,
  icone: Icone,
  valor,
  detalhe,
  cor,
  children,
}: {
  titulo: string
  icone?: React.ElementType
  valor: string
  detalhe?: React.ReactNode
  cor?: string
  children?: React.ReactNode
}) {
  return (
    <Card className='gap-2'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-0'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          {cor && <span className='size-2.5 rounded-sm' style={{ background: cor }} />}
          {titulo}
        </CardTitle>
        {Icone && <Icone className='size-4 text-muted-foreground' />}
      </CardHeader>
      <CardContent>
        <div className='tabular text-2xl font-bold'>{valor}</div>
        {detalhe && <p className='text-xs text-muted-foreground'>{detalhe}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

export function CardsPlacar({ m }: { m: Momento }) {
  const margem = m.flavio != null && m.lula != null ? m.flavio - m.lula : null
  const proj = m.projF != null && m.projL != null ? m.projF - m.projL : null
  return (
    <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 [&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1'>
      <Stat titulo='Urnas apuradas' icone={Activity} valor={`${fmt(m.pct, 1)}%`} detalhe={m.det}>
        <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-muted'>
          <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${m.pct}%` }} />
        </div>
      </Stat>
      <Stat
        titulo='Flávio Bolsonaro (PL)'
        cor='var(--flavio)'
        valor={`${fmt(m.flavio, 2)}%`}
        detalhe={m.votosF != null ? `${fmtInt(m.votosF)} votos` : 'dos votos válidos contados'}
      />
      <Stat
        titulo='Lula (PT)'
        cor='var(--lula)'
        valor={`${fmt(m.lula, 2)}%`}
        detalhe={m.votosL != null ? `${fmtInt(m.votosL)} votos` : 'dos votos válidos contados'}
      />
      <Stat
        titulo='Vantagem no placar'
        icone={Scale}
        valor={`${sinal(margem, 1)} pp`}
        detalhe={margem == null ? '' : `${quemLidera(margem)} à frente às ${m.hora}`}
      />
      <Stat
        titulo='Projeção do resultado'
        icone={Crosshair}
        valor={proj == null ? '–' : `${sinal(proj, 1)} pp`}
        detalhe={
          proj == null ? (
            'aguardando urnas'
          ) : (
            <>
              {quemLidera(proj)} à frente no fim
              {m.final != null && <> · real: {sinal(m.final, 1)}</>}
            </>
          )
        }
      />
    </div>
  )
}

