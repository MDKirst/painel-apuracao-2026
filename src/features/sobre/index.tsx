import { BadgeCheck } from 'lucide-react'
import { useH1 } from '@/hooks/use-h1'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagina } from '@/features/apuracao/components/pagina'

const GLOSSARIO: [string, string][] = [
  ['Seção / urna', 'Cada urna eletrônica corresponde a uma seção eleitoral. O Brasil teve cerca de 500 mil no 1º turno.'],
  ['Urna apurada', 'Urna cujo boletim já chegou ao TSE e foi somado. "40% apurado" quer dizer que 40% das urnas já entraram na conta.'],
  ['Votos válidos', 'Votos dados a algum candidato. Brancos e nulos ficam de fora, e é sobre os válidos que se calcula a porcentagem.'],
  ['pp (pontos percentuais)', 'Diferença entre duas porcentagens. Se um tem 47% e o outro 45%, a vantagem é de 2 pp.'],
  ['Vantagem (margem)', 'Porcentagem de Flávio menos a de Lula. Positiva = Flávio na frente; negativa = Lula na frente.'],
  ['Saldo de votos', 'Votos de Flávio menos votos de Lula, em número de pessoas.'],
  ['Projeção', 'Estimativa do resultado final: supõe que o que falta contar em cada estado vai votar como o que já chegou dele. É um cálculo deste painel, não do TSE.'],
  ['Abstenção', 'Eleitores que não foram votar.'],
]

// Relatório Resultado da Totalização do TRE-AP (Presidente, 1º turno), conferido com o painel em 05/10/2026
const CONFERENCIA_AP: [string, string][] = [
  ['Lula', '212.503 (45,71%)'],
  ['Flávio Bolsonaro', '212.278 (45,67%)'],
  ['Augusto Cury', '19.057'],
  ['Renan Santos', '11.342'],
  ['Ronaldo Caiado', '8.304'],
  ['Demais 7 candidatos', '1.374'],
  ['Eleitores aptos', '576.988'],
  ['Comparecimento', '476.562'],
  ['Votos válidos', '464.858'],
  ['Brancos / nulos', '4.415 / 7.289'],
]

const ARQUIVOS: [string, string][] = [
  ['Placar nacional', 'resultados.tse.jus.br/oficial/ele2026/{eleição}/dados/br/br-c0001-e00{eleição}-u.json'],
  ['Andamento por estado', '…/dados/br/br-e00{eleição}-ab.json'],
  ['Andamento por município', '…/dados/{uf}/{uf}-e00{eleição}-ab.json'],
  ['Resultado por município', '…/dados/{uf}/{uf}{mun}-c0001-e00{eleição}-u.json'],
  ['Horário de chegada de cada urna', '…/arquivo-urna/{pleito}/dados/{uf}/{mun}/{zona}/{seção}/…-aux.json'],
  ['Boletins de urna completos', 'dadosabertos.tse.jus.br · conjunto "Boletim de urna" (publicado dias depois da eleição)'],
]

export function Sobre() {
  const { data: h } = useH1()
  return (
    <Pagina titulo='Como funciona' sub='De onde vêm os números, o que cada termo quer dizer e o que este painel não faz.'>
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>De onde vêm os dados</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>
              <b className='text-foreground'>Ao vivo (2º turno, 25/10):</b> seu navegador lê os arquivos públicos do TSE a cada 15
              segundos. Não existe servidor no meio, e o histórico da noite fica guardado no seu próprio navegador.
            </p>
            <p>
              <b className='text-foreground'>Replay (1º turno):</b> cada urna tem registrado o horário em que o TSE a recebeu.
              Juntando esses horários com os votos, dá para "rebobinar" a noite minuto a minuto.{' '}
              {h?.amostra.modo === 'boletins'
                ? 'Esta versão usa todos os boletins de urna publicados pelo TSE.'
                : `Esta versão usa uma amostra de ${h?.amostra.secoes_com_horario.toLocaleString('pt-BR') ?? '…'} urnas, cerca de 4% por cidade. Quando o TSE publicar os boletins completos, o replay passa a usar todas.`}
            </p>
            <p>
              <b className='text-foreground'>Projeção:</b> o que falta de cada estado vota como o que já chegou dele. Estados ainda
              sem urnas usam o 1º turno corrigido pela tendência do momento.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Glossário rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className='grid gap-3 text-sm sm:grid-cols-2'>
              {GLOSSARIO.map(([t, d]) => (
                <div key={t}>
                  <dt className='font-medium'>{t}</dt>
                  <dd className='text-muted-foreground'>{d}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
      <Alert>
        <AlertTitle>Projeto educacional, sem fins políticos</AlertTitle>
        <AlertDescription>
          Este painel foi feito para ensinar como funciona a apuração: por que o placar muda durante a noite, de onde vêm os votos e
          como ler os números. Não apoia, critica ou promove nenhum candidato ou partido, e não tem vínculo com o TSE, partidos ou
          campanhas. As cores (azul e vermelho) só identificam os candidatos.
        </AlertDescription>
      </Alert>
      <Alert>
        <AlertTitle>Projeção não é resultado</AlertTitle>
        <AlertDescription>
          O resultado oficial é sempre o do TSE. "Direita/esquerda" nos blocos é uma simplificação; a medida principal deste painel
          é a diferença Flávio − Lula. Projeto aberto, sem vínculo com o TSE, partidos ou campanhas.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <BadgeCheck className='size-4 text-green-600' />
            Conferência com documentos oficiais
          </CardTitle>
          <CardDescription>
            Os números do painel foram comparados com as fontes oficiais da Justiça Eleitoral. Todos batem.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-5 text-sm'>
          <div className='space-y-2'>
            <p className='font-medium'>Relatório Resultado da Totalização · TRE-AP · Presidente, 1º turno</p>
            <p className='text-muted-foreground'>
              Documento oficial assinado pelo presidente da Comissão Apuradora do Amapá (SISTOT, gerado em 04/10/2026 às 21h17;
              resultado das 21h02). O Amapá foi escolhido por ser o estado mais apertado do país: Lula venceu por 225 votos.
            </p>
            <div className='overflow-x-auto rounded-md border'>
              <table className='tabular w-full text-xs'>
                <thead className='bg-muted/50 text-muted-foreground'>
                  <tr>
                    <th className='px-3 py-2 text-start font-medium'>Item</th>
                    <th className='px-3 py-2 text-end font-medium'>Relatório oficial</th>
                    <th className='px-3 py-2 text-end font-medium'>Painel</th>
                    <th className='px-3 py-2 text-center font-medium'>Confere</th>
                  </tr>
                </thead>
                <tbody>
                  {CONFERENCIA_AP.map(([item, valor]) => (
                    <tr key={item} className='border-t'>
                      <td className='px-3 py-1.5'>{item}</td>
                      <td className='px-3 py-1.5 text-end'>{valor}</td>
                      <td className='px-3 py-1.5 text-end'>{valor}</td>
                      <td className='px-3 py-1.5 text-center text-green-600'>✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className='text-xs text-muted-foreground'>
              O relatório também explica dois detalhes: 57 seções do Amapá foram <i>agregadas</i> (votaram na urna de outra seção,
              por isso não têm urna própria), e 17 votos no candidato 28 (PRTB), que renunciou, contam como nulos técnicos.
            </p>
          </div>
          <div className='space-y-1'>
            <p className='font-medium'>Resultado oficial de cada estado (arquivos do TSE)</p>
            <p className='text-muted-foreground'>
              Os votos de Flávio e de Lula nos 26 estados, no Distrito Federal e no Exterior foram comparados um a um com o resultado
              oficial publicado pelo TSE: <b className='text-foreground'>nenhuma diferença</b>, nem de um voto.
            </p>
          </div>
          <div className='space-y-1'>
            <p className='font-medium'>Placar mostrado durante a noite (replay)</p>
            <p className='text-muted-foreground'>
              A reconstrução minuto a minuto foi comparada com o placar que o TSE exibiu em 6 horários da noite de 04/10 (registrados
              pelo g1). Erro médio de 0,8 ponto, e de 0,1 a 0,3 ponto a partir das 19h45. O replay é uma reconstrução; o resultado
              final é o oficial.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Arquivos do TSE usados (para quem quer conferir)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='space-y-2 text-sm'>
            {ARQUIVOS.map(([n, u]) => (
              <li key={n} className='grid gap-1 sm:grid-cols-[220px_1fr]'>
                <span className='text-muted-foreground'>{n}</span>
                <code className='rounded bg-muted px-1.5 py-0.5 text-xs break-all'>{u}</code>
              </li>
            ))}
          </ul>
          {h && <p className='mt-4 text-xs text-muted-foreground'>Replay gerado em {h.gerado_em}.</p>}
        </CardContent>
      </Card>
    </Pagina>
  )
}
