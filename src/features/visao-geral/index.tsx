import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { useMomento } from '@/hooks/use-momento'
import { useVivo } from '@/hooks/use-vivo'
import { CardsPlacar } from '@/features/apuracao/components/cards-placar'
import { CartaoGrafico } from '@/features/apuracao/components/cartao'
import { ControleTempo } from '@/features/apuracao/components/controle-tempo'
import { GraficoPlacar } from '@/features/apuracao/components/graficos'
import { MapaBrasil } from '@/features/apuracao/components/mapa-brasil'
import { Pagina } from '@/features/apuracao/components/pagina'
import { Resumo } from '@/features/apuracao/components/resumo'
import { respostas } from '@/features/apuracao/textos'

export function VisaoGeral() {
  const { data: h } = useH1()
  const { modo } = useApuracao()
  const vivo = useVivo(modo === 'vivo')
  const m = useMomento()
  const r = h ? respostas(h) : null
  return (
    <Pagina
      titulo='Visão geral'
      sub='As urnas não chegam todas juntas. O placar parcial mostra só quem já foi contado, e isso muda bastante durante a noite.'
    >
      <Resumo />
      <ControleTempo />
      <CardsPlacar m={m} />
      {h && (
        <>
          <CartaoGrafico
            pergunta={modo === 'vivo' ? 'Como o placar está mudando?' : 'Como o placar mudou durante a noite?'}
            resposta={modo === 'vivo' ? 'Linhas cheias: o placar do TSE. Tracejadas: a projeção do resultado final.' : r?.placar}
            comoLer='Cada linha mostra a porcentagem de um candidato entre os votos válidos já contados. A tracejada é a projeção: um palpite do resultado final que leva em conta quais estados ainda faltam.'
          >
            <GraficoPlacar h={h} hist={vivo.hist} />
          </CartaoGrafico>
          <CartaoGrafico
            pergunta='Quem está na frente em cada estado?'
            resposta={`Situação ${m.quando}. Azul: Flávio na frente; vermelho: Lula na frente. Em cada estado: quanto já foi contado e os votos de cada candidato.`}
            comoLer='Quanto mais forte a cor, maior a vantagem. Estados pequenos do litoral e o DF aparecem com uma linha ligando o estado à etiqueta. No replay, arraste o controle de tempo para ver o mapa mudando durante a noite.'
          >
            <MapaBrasil porUf={m.porUf} />
          </CartaoGrafico>
        </>
      )}
    </Pagina>
  )
}
