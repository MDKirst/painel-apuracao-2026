import { useEffect } from 'react'
import { Pause, Play } from 'lucide-react'
import { hhmm } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { ELE_VIVO, POLL_BR, useVivo } from '@/hooks/use-vivo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BotaoDecisao, SeloDecisao } from './decisao'

const FIM_NOITE = Date.parse('2026-10-05T02:00:00-03:00')

function Replay() {
  const { data: h } = useH1()
  const { t, setT, tocando, setTocando } = useApuracao()
  const ultimo = (h?.tempos.length ?? 1) - 1
  const fimNoite = h ? h.tempos.findIndex((x) => x >= FIM_NOITE) : 0
  const i = t ?? ultimo

  useEffect(() => {
    if (!tocando) return
    const id = setInterval(() => {
      const atual = useApuracao.getState().t ?? ultimo
      if (atual >= ultimo) return setTocando(false)
      setT(Math.min(ultimo, atual + (atual < fimNoite ? 2 : 1)))
    }, 90)
    return () => clearInterval(id)
  }, [tocando, ultimo, fimNoite, setT, setTocando])

  if (!h) return null
  const br = h.serie.grupos.Brasil
  const idx = (pct: number) => br.findIndex((x) => x[0] >= pct)
  const pico = h.tempos.findIndex((x) => hhmm(x) === h.kpis.pico_vantagem.hora)
  const momentos: [string, number][] = [
    ['Primeiros votos', idx(1)],
    [`Maior vantagem (${h.kpis.pico_vantagem.hora})`, pico],
    ['Metade contada', idx(50)],
    ['90% contado', idx(90)],
    ['Resultado final', ultimo],
  ]

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-3'>
        <Button
          size='sm'
          onClick={() => {
            if (!tocando && i >= fimNoite) setT(0)
            setTocando(!tocando)
          }}
          aria-label={tocando ? 'Pausar' : 'Reproduzir a noite'}
        >
          {tocando ? <Pause /> : <Play />}
          <span className='hidden sm:inline'>{tocando ? 'Pausar' : 'Reproduzir a noite'}</span>
        </Button>
        <input
          type='range'
          className='cursor-replay h-2 w-full'
          min={0}
          max={ultimo}
          value={i}
          aria-label='Horário da apuração'
          onChange={(e) => {
            setTocando(false)
            setT(+e.target.value)
          }}
        />
        <span className='tabular w-16 text-end leading-tight'>
          {i === ultimo ? (
            <>
              <span className='block text-lg font-semibold'>Final</span>
              <span className='block text-[10px] text-muted-foreground'>05/10 {hhmm(h.tempos[i])}</span>
            </>
          ) : (
            <span className='text-lg font-semibold'>{hhmm(h.tempos[i])}</span>
          )}
        </span>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs text-muted-foreground'>Pular para:</span>
        {momentos
          .filter(([, k]) => k >= 0)
          .map(([n, k]) => (
            <Button
              key={n}
              variant={k === i ? 'secondary' : 'outline'}
              size='sm'
              className='h-7 rounded-full text-xs'
              onClick={() => {
                setTocando(false)
                setT(k)
              }}
            >
              {n}
            </Button>
          ))}
        <div className='ms-auto flex flex-wrap items-center gap-2'>
          <SeloDecisao />
          <BotaoDecisao />
        </div>
      </div>
      <div className='flex justify-end'>
        <Badge variant='outline' className='hidden text-muted-foreground lg:inline-flex'>
          1º turno · 04/10/2026 · {h.amostra.modo === 'boletins' ? 'todos os boletins de urna' : `amostra de ${h.amostra.secoes_com_horario.toLocaleString('pt-BR')} urnas`}
        </Badge>
      </div>
    </div>
  )
}

function AoVivo() {
  const v = useVivo(true)
  let estado: { cor: string; texto: string; detalhe: string }
  if (v.erro) estado = { cor: 'bg-red-500', texto: 'Falha ao ler o TSE', detalhe: `${v.erro.message}. Nova tentativa em ${POLL_BR / 1000}s.` }
  else if (v.semDados)
    estado = {
      cor: 'bg-muted-foreground',
      texto: 'Aguardando o TSE',
      detalhe: `Os arquivos do 2º turno (eleição ${ELE_VIVO}) ainda não foram publicados. A apuração começa no domingo, 25/10, às 17h (Brasília). Enquanto isso, veja o replay do 1º turno.`,
    }
  else if (v.carregando) estado = { cor: 'bg-muted-foreground', texto: 'Conectando ao TSE…', detalhe: '' }
  else estado = { cor: 'bg-green-500 animate-pulse', texto: `Ao vivo · atualiza a cada ${POLL_BR / 1000}s`, detalhe: `Última totalização do TSE: ${v.resultado?.hora ?? ''}` }
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Badge variant='outline' className='gap-2'>
        <span className={`size-2 rounded-full ${estado.cor}`} />
        {estado.texto}
      </Badge>
      <span className='text-sm text-muted-foreground'>{estado.detalhe}</span>
      {v.resultado && (
        <div className='ms-auto flex flex-wrap items-center gap-2'>
          <SeloDecisao />
          <BotaoDecisao />
        </div>
      )}
    </div>
  )
}

export function ControleTempo() {
  const { modo } = useApuracao()
  return (
    <Card className='py-4'>
      <CardContent className='px-4'>{modo === 'vivo' ? <AoVivo /> : <Replay />}</CardContent>
    </Card>
  )
}
