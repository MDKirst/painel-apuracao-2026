import { REGIAO, REGIOES, type Regiao, UFS } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { useVivo } from '@/hooks/use-vivo'
import { CartaoGrafico } from './components/cartao'
import { ControleTempo } from './components/controle-tempo'
import { GraficoComposicao, GraficoRitmo, GraficoVies } from './components/graficos'
import { Pagina } from './components/pagina'
import { respostas } from './textos'

export function Apuracao() {
  const { data: h } = useH1()
  const { modo } = useApuracao()
  const vivo = useVivo(modo === 'vivo')
  const ehVivo = modo === 'vivo'
  const r = h ? respostas(h) : null

  // composição: etapas do 1º turno, ou "contado agora" × "peso esperado" ao vivo
  let etapas: { rotulo: string; regioes: Record<Regiao, number> }[] = []
  if (h && !ehVivo)
    etapas = h.kpis.composicao_regional.map((c) => ({
      rotulo: c.apurado === 100 ? 'Resultado final' : `${c.apurado}% apurado (${c.hora})`,
      regioes: c.regioes,
    }))
  if (h && ehVivo) {
    const cont = {} as Record<Regiao, number>
    const esp = {} as Record<Regiao, number>
    let tc = 0
    let te = 0
    for (const reg of REGIOES) {
      cont[reg] = 0
      esp[reg] = h.regioes[reg].validos
      te += esp[reg]
    }
    for (const uf of UFS) {
      const v = vivo.porUf[uf]?.validos ?? 0
      cont[REGIAO[uf]] += v
      tc += v
    }
    const pct = (o: Record<Regiao, number>, t: number) =>
      Object.fromEntries(REGIOES.map((reg) => [reg, t ? (100 * o[reg]) / t : 0])) as Record<Regiao, number>
    etapas = [
      { rotulo: 'Contado até agora', regioes: pct(cont, tc) },
      { rotulo: 'Peso esperado (1º turno)', regioes: pct(esp, te) },
    ]
  }

  return (
    <Pagina
      titulo='A noite da apuração'
      sub='Por que o placar parcial engana: cada região manda os votos num ritmo diferente, e as que chegam primeiro não votam igual às que chegam por último.'
    >
      <ControleTempo />
      {h && (
        <>
          <div className='grid gap-4 lg:grid-cols-2'>
            <CartaoGrafico
              pergunta='Quem foi contado primeiro?'
              resposta={ehVivo ? 'Porcentagem das urnas de cada região já somadas, agora.' : r?.ritmo}
              comoLer='Cada linha é uma região e sobe de 0% a 100% conforme as urnas dela chegam. A linha que sobe antes é a região contada primeiro.'
            >
              <GraficoRitmo h={h} hist={vivo.hist} />
            </CartaoGrafico>
            <CartaoGrafico
              pergunta='De onde vinham os votos já contados?'
              resposta={ehVivo ? 'Compare o que já foi contado com o peso que cada região deve ter no final.' : r?.comp}
              comoLer='Cada barra soma 100% dos votos contados até aquele momento. Compare com a última barra: a diferença mostra quanto cada região estava sobrando ou faltando.'
            >
              <GraficoComposicao etapas={etapas} />
            </CartaoGrafico>
          </div>
          <CartaoGrafico
            pergunta='Quanto o placar parcial enganava?'
            resposta={
              ehVivo
                ? 'A linha cheia é a vantagem de Flávio sobre Lula agora. A pontilhada mostra quanto o placar do 1º turno enganava em cada etapa: use como régua do que ainda pode mudar.'
                : r?.vies
            }
            comoLer='O eixo de baixo mostra quanto já foi contado. O eixo do lado mostra a vantagem em pontos percentuais (positivo = Flávio, negativo = Lula).'
          >
            <GraficoVies h={h} hist={vivo.hist} />
          </CartaoGrafico>
        </>
      )}
    </Pagina>
  )
}
