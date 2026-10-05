import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { Badge } from '@/components/ui/badge'
import { CartaoGrafico } from '@/features/apuracao/components/cartao'
import {
  GraficoAbstencao,
  GraficoDispersao,
  GraficoPolarizacao,
  GraficoPorte,
  GraficoSaldo,
} from '@/features/apuracao/components/graficos'
import { Pagina } from '@/features/apuracao/components/pagina'
import { respostas } from '@/features/apuracao/textos'

export function Regioes() {
  const { data: h } = useH1()
  const { modo } = useApuracao()
  const r = h ? respostas(h) : null
  return (
    <Pagina
      titulo='Onde cada um ganhou'
      sub={
        <>
          O mapa do voto explica o vaivém do placar: as regiões que chegam primeiro não votam igual às que chegam por último.{' '}
          {modo === 'vivo' && <Badge variant='outline'>referência: 1º turno</Badge>}
        </>
      }
    >
      {h && r && (
        <>
          <div className='grid gap-4 lg:grid-cols-2'>
            <CartaoGrafico
              pergunta='Quanto cada região deu de vantagem?'
              resposta={r.saldo}
              comoLer='"Saldo" é quantos votos um candidato teve a mais que o outro naquela região. Barra para a direita = saldo de Flávio; para a esquerda = saldo de Lula.'
            >
              <GraficoSaldo h={h} />
            </CartaoGrafico>
            <CartaoGrafico
              pergunta='Quem chega cedo vota diferente?'
              resposta={r.disp}
              comoLer='Cada bolinha é um estado (tamanho = número de eleitores). Mais à esquerda = chegou mais cedo. Mais para cima = mais votos em Flávio.'
            >
              <GraficoDispersao h={h} />
            </CartaoGrafico>
          </div>
          <div className='grid gap-4 lg:grid-cols-3'>
            <CartaoGrafico pergunta='Cidade grande × cidade pequena' resposta={r.porte} comoLer='Vantagem de Flávio (+) ou de Lula (−) por tamanho da cidade, em número de eleitores.'>
              <GraficoPorte h={h} />
            </CartaoGrafico>
            <CartaoGrafico pergunta='Quão divididas estão as cidades?' resposta={r.polar} comoLer='Cada barra soma todas as cidades da região, separadas pela vantagem do vencedor.'>
              <GraficoPolarizacao h={h} />
            </CartaoGrafico>
            <CartaoGrafico pergunta='Quem deixou de votar?' resposta={r.abst} comoLer='Abstenção = eleitores que não foram votar. A linha tracejada é a média do Brasil.'>
              <GraficoAbstencao h={h} />
            </CartaoGrafico>
          </div>
        </>
      )}
    </Pagina>
  )
}
