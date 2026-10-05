import { useMemo } from 'react'
import { Calculator, CheckCircle2, CircleDashed, Sigma, Split, TrendingUp } from 'lucide-react'
import { type Situacao, avaliar } from '@/lib/decisao'
import { UFS, type UFVivo, compacto, fmt, fmtInt, hhmm } from '@/lib/eleicao'
import { cn } from '@/lib/utils'
import { useApuracao } from '@/stores/apuracao'
import { type H1Derivado, useH1 } from '@/hooks/use-h1'
import { type Momento, useMomento } from '@/hooks/use-momento'
import { ELE_VIVO } from '@/hooks/use-vivo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function situacaoDoMomento(m: Momento): Situacao | null {
  if (!m.pronto || m.votosF == null || m.votosL == null || !m.validos) return null
  return avaliar({ pct: m.pct, votosF: m.votosF, votosL: m.votosL, validos: m.validos, porUf: m.porUf, projF: m.projF, projL: m.projL })
}

/** No replay: primeiro minuto a partir do qual cada condição ficou verdadeira e não mudou mais. */
function useMarcos(h?: H1Derivado) {
  return useMemo(() => {
    if (!h) return null
    const s = h.serie
    const n = s.grupos.Brasil.length
    const ultimoFalso = { turno2: -1, mat: -1, prat: -1, est: -1 }
    for (let i = 0; i < n; i++) {
      const b = s.grupos.Brasil[i]
      if (b[1] == null || b[2] == null || b[0] < 1) {
        ultimoFalso.turno2 = ultimoFalso.mat = ultimoFalso.prat = ultimoFalso.est = i
        continue
      }
      const porUf: Record<string, UFVivo> = {}
      for (const uf of UFS) porUf[uf] = { pct: s.ufs[uf]?.[i]?.[0] ?? 0, eleitores: h.ufs[uf]?.eleitores }
      const x = avaliar({
        pct: b[0], votosF: b[4] ?? (b[1] * b[3]) / 100, votosL: b[5] ?? (b[2] * b[3]) / 100, validos: b[3], porUf,
        projF: s.projecao_uf[i][0] ?? undefined, projL: s.projecao_uf[i][1] ?? undefined,
      })
      if (!x.segundoTurnoGarantido) ultimoFalso.turno2 = i
      if (!x.matematico) ultimoFalso.mat = i
      if (!x.pratico) ultimoFalso.prat = i
      if ((x.chanceLider ?? 0) < 0.99) ultimoFalso.est = i
    }
    const marco = (k: keyof typeof ultimoFalso) => {
      const i = Math.min(ultimoFalso[k] + 1, n - 1)
      return { i, hora: hhmm(h.tempos[i]), pct: s.grupos.Brasil[i][0] }
    }
    return { turno2: marco('turno2'), est: marco('est'), prat: marco('prat'), mat: marco('mat') }
  }, [h])
}

function Bloco({
  icone: Icone,
  titulo,
  ok,
  rotuloOk,
  rotuloNao,
  children,
}: {
  icone: React.ElementType
  titulo: string
  ok: boolean
  rotuloOk: string
  rotuloNao: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-2 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='flex items-center gap-2 text-sm font-medium'>
          <Icone className='size-4 text-muted-foreground' />
          {titulo}
        </p>
        <Badge variant={ok ? 'default' : 'outline'} className='gap-1'>
          {ok ? <CheckCircle2 className='size-3' /> : <CircleDashed className='size-3' />}
          {ok ? rotuloOk : rotuloNao}
        </Badge>
      </div>
      <div className='text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground'>{children}</div>
    </div>
  )
}

/** Barra: vantagem do líder × votos que ainda podem entrar. */
function Regua({ s }: { s: Situacao }) {
  const max = Math.max(s.vantagem, s.restEleitores, 1)
  return (
    <div className='mt-2 space-y-1.5 text-xs'>
      {[
        [`Vantagem de ${s.lider}`, s.vantagem, s.lider === 'Flávio' ? 'var(--flavio)' : 'var(--lula)'],
        ['Votos válidos que ainda devem entrar', s.restValidos, 'var(--muted-foreground)'],
        ['Eleitores que ainda faltam (teto)', s.restEleitores, 'var(--border)'],
      ].map(([n, v, cor]) => (
        <div key={n as string} className='grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5'>
          <span>{n}</span>
          <span className='tabular text-end font-medium text-foreground'>{compacto(v as number)}</span>
          <div className='col-span-2 h-2 overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full' style={{ width: `${(100 * (v as number)) / max}%`, background: cor as string }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Selo curto, sempre visível ao lado do controle de tempo. */
export function SeloDecisao() {
  const m = useMomento()
  const s = situacaoDoMomento(m)
  if (!s) return null
  const [txt, ok] = s.matematico
    ? [`${s.lider} vence: certeza matemática`, true]
    : (s.chanceLider ?? 0) >= 0.99
      ? [`${s.lider} vence: ${fmt(100 * (s.chanceLider ?? 0), 0)}% de chance`, true]
      : [`Em aberto · ${s.lider} com ${fmt(100 * (s.chanceLider ?? 0.5), 0)}% de chance`, false]
  return (
    <Badge variant={ok ? 'default' : 'outline'} className='gap-1'>
      {ok ? <CheckCircle2 className='size-3' /> : <CircleDashed className='size-3' />}
      {txt}
    </Badge>
  )
}

export function BotaoDecisao() {
  const { modo, setT, setTocando } = useApuracao()
  const { data: h } = useH1()
  const m = useMomento()
  const s = situacaoDoMomento(m)
  const marcos = useMarcos(modo === 'replay' ? h : undefined)
  const primeiroTurno = modo === 'replay' || ELE_VIVO === '6257'

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' disabled={!s}>
          <Calculator />
          Já está decidido?
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Já dá para saber quem ganha?</DialogTitle>
          <DialogDescription>
            Cálculo às <b>{m.hora}</b>, com <b>{fmt(m.pct, 1)}%</b> das urnas apuradas
            {modo === 'replay' ? ' (replay do 1º turno)' : ''}.
          </DialogDescription>
        </DialogHeader>
        {s && (
          <div className='space-y-3'>
            <div className='rounded-lg bg-muted/60 p-4 text-sm'>
              {s.vantagem === 0 ? (
                'Empate exato no momento.'
              ) : s.margemNecessaria > 100 ? (
                <>
                  <b>{s.atras}</b> não alcança mais <b>{s.lider}</b>: precisaria de mais votos do que ainda existem para
                  contar.
                </>
              ) : (
                <>
                  Para virar, <b>{s.atras}</b> precisaria vencer <b>{s.lider}</b> por{' '}
                  <b className='text-foreground'>{fmt(s.margemNecessaria, 1)} pontos</b> em todas as urnas que faltam.{' '}
                  Nas urnas já contadas, {s.atras} está {s.margemAtual >= 0 ? 'ganhando' : 'perdendo'} por{' '}
                  {fmt(Math.abs(s.margemAtual), 1)} pontos.
                </>
              )}
            </div>

            <Bloco icone={Sigma} titulo='Certeza matemática' ok={s.matematico} rotuloOk='Decidido' rotuloNao='Ainda não'>
              {s.matematico ? (
                <>
                  Mesmo que <b>todos os {compacto(s.restEleitores)} eleitores</b> das urnas que faltam votassem em {s.atras},
                  {` ${s.lider}`} continuaria na frente. Não há mais como virar.
                </>
              ) : (
                <>
                  {s.lider} tem <b>{fmtInt(s.vantagem)}</b> votos de vantagem, mas ainda faltam até{' '}
                  <b>{fmtInt(s.restEleitores)}</b> eleitores. Na teoria, ainda dá para virar.
                  {s.pratico && ' Na prática, porém, isso exigiria comparecimento acima do que está acontecendo.'}
                </>
              )}
              <Regua s={s} />
            </Bloco>

            <Bloco
              icone={TrendingUp}
              titulo='Estimativa estatística'
              ok={(s.chanceLider ?? 0) >= 0.99}
              rotuloOk='Decidido (99%+)'
              rotuloNao='Em aberto'
            >
              {s.chanceLider == null ? (
                'Ainda não há urnas suficientes para estimar.'
              ) : (
                <>
                  Pela projeção por estado, {s.lider} termina com <b>{fmt(s.margemProj, 1)} pontos</b> de vantagem. Com a
                  margem de erro deste momento (±{fmt(2 * s.erroPadrao, 1)} pontos), a chance de {s.lider} terminar na frente
                  é de <b>{fmt(Math.min(99.9, 100 * s.chanceLider), 1)}%</b>.
                </>
              )}
            </Bloco>

            {primeiroTurno && (
              <Bloco icone={Split} titulo='Vai ter 2º turno?' ok={s.segundoTurnoGarantido} rotuloOk='Garantido' rotuloNao='Ainda não'>
                {s.segundoTurnoGarantido ? (
                  <>
                    Mesmo recebendo todos os votos restantes, {s.lider} chegaria no máximo a{' '}
                    <b>{fmt(s.maxPossivelLider, 1)}%</b> dos válidos. Ninguém passa de 50%: o 2º turno está garantido.
                  </>
                ) : (
                  <>
                    Em teoria, {s.lider} ainda poderia chegar a {fmt(s.maxPossivelLider, 1)}% dos válidos se levasse todos os
                    votos restantes, então o 2º turno ainda não está garantido pela matemática.
                  </>
                )}
              </Bloco>
            )}

            {marcos && (
              <div className='rounded-lg border p-4'>
                <p className='mb-2 text-sm font-medium'>Quando cada coisa ficou decidida no 1º turno</p>
                <div className='space-y-2 text-sm'>
                  {[
                    ['2º turno garantido (matemática)', marcos.turno2],
                    ['Flávio na frente: 99% de chance', marcos.est],
                    ['Flávio na frente: impossível virar na prática', marcos.prat],
                    ['Flávio na frente: certeza matemática', marcos.mat],
                  ].map(([n, x]) => {
                    const mk = x as { i: number; hora: string; pct: number }
                    return (
                      <div key={n as string} className={cn('flex flex-wrap items-center justify-between gap-2')}>
                        <span className='text-muted-foreground'>{n as string}</span>
                        <span className='flex items-center gap-2'>
                          <span className='tabular'>
                            <b>{mk.hora}</b> · {fmt(mk.pct, 1)}% apurado
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 text-xs'
                            onClick={() => {
                              setTocando(false)
                              setT(mk.i)
                            }}
                          >
                            ir para
                          </Button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <p className='text-xs text-muted-foreground'>
              Como é calculado: "certeza matemática" compara a vantagem com todos os eleitores das urnas ainda não apuradas
              (comparecimento de 100%). "Na prática" usa o comparecimento e os votos válidos observados até agora. A chance
              estatística usa a projeção por estado e uma margem de erro que encolhe conforme a apuração avança, calibrada com folga
              sobre o erro real da projeção no 1º turno. Projeção não é resultado oficial.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
