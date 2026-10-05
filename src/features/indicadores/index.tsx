import { ChevronDown } from 'lucide-react'
import { REGIOES, fmt, pontos, sinal } from '@/lib/eleicao'
import { type H1Derivado, useH1 } from '@/hooks/use-h1'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Pagina } from '@/features/apuracao/components/pagina'
import { fatos, nomeRegiao } from '@/features/apuracao/textos'

type Kpi = { titulo: string; valor: string; texto: React.ReactNode; tabela?: { cab: string[]; linhas: (string | number)[][] } }

function montar(h: H1Derivado): Kpi[] {
  const f = fatos(h)
  const k = f.k
  const v = k.velocidade
  const ci = k.capital_interior
  const ufs = Object.entries(h.ufs).filter(([u]) => u !== 'zz').sort((a, b) => a[1].t50_min - b[1].t50_min)
  const val = k.validacao_g1 ?? []
  const erroMed = val.length ? val.reduce((a, x) => a + Math.abs(x.erro_margem_pp), 0) / val.length : null
  const lista: Kpi[] = [
    {
      titulo: 'Velocidade da contagem',
      valor: `metade às ${v.Brasil['50']}`,
      texto: `Às ${v.Brasil['90']} o país já tinha 90% das urnas contadas; às ${v.Brasil['99']}, 99%.`,
      tabela: { cab: ['Região', '25%', '50%', '90%'], linhas: REGIOES.map((r) => [r, v[r]['25'] ?? '–', v[r]['50'] ?? '–', v[r]['90'] ?? '–']) },
    },
    {
      titulo: 'Quem chega primeiro',
      valor: `${f.ordem[0]} → ${f.ordem[f.ordem.length - 1]}`,
      texto: `Estados mais rápidos: ${ufs.slice(0, 3).map(([u]) => u.toUpperCase()).join(', ')}. Mais lentos: ${ufs.slice(-3).map(([u]) => u.toUpperCase()).join(', ')}.`,
      tabela: { cab: ['Região', 'metade às'], linhas: f.ordem.map((r) => [r, h.t50RegiaoTxt[r]]) },
    },
    {
      titulo: 'Peso desproporcional no início',
      valor: `${f.sobre[0][0]}: ${sinal(f.sobre[0][1], 0)} pontos`,
      texto: `Com 10% das urnas, ${nomeRegiao(f.sobre[0][0])} era ${fmt(f.c10.regioes[f.sobre[0][0]], 0)}% dos votos contados. No final, ${fmt(f.cf.regioes[f.sobre[0][0]], 0)}%.`,
      tabela: { cab: ['Região', 'aos 10%', 'final'], linhas: f.sobre.map(([r]) => [r, `${fmt(f.c10.regioes[r])}%`, `${fmt(f.cf.regioes[r])}%`]) },
    },
    {
      titulo: 'Engano do placar parcial',
      valor: `${pontos(f.b10.vies_pp)} com 10% apurado`,
      texto: 'Quanto o placar exagerava a vantagem de Flávio, comparado ao resultado final, em cada etapa da contagem.',
      tabela: { cab: ['Apurado', 'hora', 'placar', 'engano'], linhas: k.vies_ordem_chegada.map((x) => [`${x.apurado}%`, x.hora, sinal(x.margem), sinal(x.vies_pp)]) },
    },
    {
      titulo: 'Maior vantagem da noite',
      valor: `Flávio ${sinal(f.pico.margem)} às ${f.pico.hora}`,
      texto: `Foi quando o placar mais se afastou do resultado final (${sinal(f.final, 2)}).${k.minutos_liderando.lula === 0 ? ' Lula não liderou em nenhum momento.' : ''}`,
    },
    {
      titulo: 'Quando dava para confiar',
      valor: `placar ${k.estabilizacao_placar['1'].hora} · projeção ${k.estabilizacao_projecao['1'].hora}`,
      texto: `O placar só ficou a menos de 1 ponto do resultado final com ${fmt(k.estabilizacao_placar['1'].apurado, 0)}% apurado. A projeção chegou lá bem antes, com ${fmt(k.estabilizacao_projecao['1'].apurado, 0)}%.`,
    },
    {
      titulo: 'Capitais × interior',
      valor: `capitais ${sinal(ci.capitais.margem_pp, 0)} · interior ${sinal(ci.interior.margem_pp, 0)}`,
      texto: `Metade das urnas das capitais chegou às ${ci.capitais.t50}; no interior, às ${ci.interior.t50}.`,
    },
    {
      titulo: 'Cidades por tamanho',
      valor: `+1 mi de eleitores: ${k.porte[k.porte.length - 1].t50}`,
      texto: 'Horário em que metade das urnas chegou e vantagem, por tamanho de cidade.',
      tabela: { cab: ['Eleitores', 'metade às', 'margem'], linhas: k.porte.map((x) => [x.faixa, x.t50, sinal(x.margem_pp)]) },
    },
    {
      titulo: 'Vantagem por região',
      valor: `${f.saldos[0][0]} × ${f.saldos[f.saldos.length - 1][0]}`,
      texto: 'Saldo de votos (Flávio − Lula) e soma dos blocos de direita e de esquerda.',
      tabela: {
        cab: ['Região', 'saldo', 'direita', 'esquerda'],
        linhas: REGIOES.map((r) => [r, `${sinal(h.regioes[r].saldo_votos / 1e6, 2)} mi`, `${fmt(h.regioes[r].blocos.direita, 0)}%`, `${fmt(h.regioes[r].blocos.esquerda, 0)}%`]),
      },
    },
    {
      titulo: 'Cidades polarizadas',
      valor: `${fmt(h.polarizadosPct, 0)}% com vitória por 30+`,
      texto: 'Quanto mais cidades com vitórias largas, mais o placar oscila conforme a ordem em que elas chegam.',
    },
    {
      titulo: 'Abstenção',
      valor: `${fmt(h.brasil.abstencao_pct)}% não votaram`,
      texto: `Onde a abstenção é maior, o voto em Lula tende a ser ${k.correlacoes.abstencao_x_lula > 0.1 ? 'maior' : k.correlacoes.abstencao_x_lula < -0.1 ? 'menor' : 'parecido'} (correlação ${fmt(k.correlacoes.abstencao_x_lula, 2)}).`,
      tabela: { cab: ['Região', 'abstenção', 'brancos+nulos'], linhas: REGIOES.map((r) => [r, `${fmt(h.regioes[r].abstencao_pct)}%`, `${fmt(h.regioes[r].brancos_nulos_pct)}%`]) },
    },
  ]
  const lat = k.latencia_min
  if (lat && Object.keys(lat).length) {
    const vs = Object.values(lat) as number[]
    lista.push({
      titulo: 'Tempo da urna até o TSE',
      valor: `${fmt(Math.min(...vs), 0)} a ${fmt(Math.max(...vs), 0)} minutos`,
      texto: 'Tempo mediano entre o fim da votação na seção e a chegada do boletim ao TSE.',
      tabela: { cab: ['Região', 'minutos'], linhas: Object.entries(lat).map(([r, x]) => [r, fmt(x as number, 0)]) },
    })
  }
  if (val.length && erroMed != null)
    lista.push({
      titulo: 'Esta reconstrução é confiável?',
      valor: `erro médio de ${pontos(erroMed)}`,
      texto: `Comparamos com o placar que o TSE mostrou em ${val.length} horários (lido dos gráficos do g1, precisão de ±0,3).`,
      tabela: { cab: ['Hora', 'TSE', 'aqui', 'erro'], linhas: val.map((x) => [x.hora, sinal(x.g1_flavio - x.g1_lula), sinal(x.rec_flavio - x.rec_lula), sinal(x.erro_margem_pp)]) },
    })
  return lista
}

export function Indicadores() {
  const { data: h } = useH1()
  return (
    <Pagina titulo='Indicadores do processo' sub='Os números que resumem como foi a apuração do 1º turno. Abra "ver detalhes" para a tabela de cada um.'>
      {h && (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {montar(h).map((k, i) => (
            <Card key={k.titulo} className='gap-3'>
              <CardHeader>
                <CardDescription className='tabular text-xs font-semibold tracking-wider'>{String(i + 1).padStart(2, '0')}</CardDescription>
                <CardTitle className='text-sm font-medium text-muted-foreground'>{k.titulo}</CardTitle>
                <div className='text-xl font-bold tracking-tight'>{k.valor}</div>
              </CardHeader>
              <CardContent className='space-y-3 text-sm text-muted-foreground'>
                <p>{k.texto}</p>
                {k.tabela && (
                  <Collapsible>
                    <CollapsibleTrigger className='group flex items-center gap-1 text-xs font-medium text-foreground'>
                      ver detalhes <ChevronDown className='size-3.5 transition-transform group-data-[state=open]:rotate-180' />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <table className='tabular mt-2 w-full text-xs'>
                        <thead>
                          <tr>
                            {k.tabela.cab.map((c, j) => (
                              <th key={c} className={`border-b py-1 font-medium ${j ? 'text-end' : 'text-start'}`}>
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {k.tabela.linhas.map((l) => (
                            <tr key={String(l[0])}>
                              {l.map((c, j) => (
                                <td key={j} className={`border-b py-1 ${j ? 'text-end' : 'text-start text-foreground'}`}>
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Pagina>
  )
}
