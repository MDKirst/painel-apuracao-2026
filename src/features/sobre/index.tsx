import { useH1 } from '@/hooks/use-h1'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <AlertTitle>Projeção não é resultado</AlertTitle>
        <AlertDescription>
          O resultado oficial é sempre o do TSE. "Direita/esquerda" nos blocos é uma simplificação; a medida principal deste painel
          é a diferença Flávio − Lula. Projeto aberto, sem vínculo com o TSE, partidos ou campanhas.
        </AlertDescription>
      </Alert>
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
