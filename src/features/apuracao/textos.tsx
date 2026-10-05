// Frases em linguagem simples, sempre calculadas a partir dos dados (nunca supor quem vai melhor onde).
import { REGIOES, type Regiao, fmt, milhoes, pontos, quemLidera, sinal } from '@/lib/eleicao'
import { type H1Derivado } from '@/hooks/use-h1'
import { type Momento } from '@/hooks/use-momento'

export const nomeRegiao = (r: string) => (r === 'Exterior' ? 'o Exterior' : `o ${r}`)

export function fatos(h: H1Derivado) {
  const k = h.kpis
  const final = h.brasil.margem_pp
  const regs = REGIOES.filter((r) => r !== 'Exterior')
  const ordem = [...regs].sort((a, b) => h.t50Regiao[a] - h.t50Regiao[b])
  const c10 = k.composicao_regional.find((c) => c.apurado === 10)!
  const cf = k.composicao_regional.find((c) => c.apurado === 100)!
  const sobre = regs
    .map((r) => [r, c10.regioes[r] - cf.regioes[r]] as [Regiao, number])
    .sort((a, b) => b[1] - a[1])
  const saldos = REGIOES.map((r) => [r, h.regioes[r].saldo_votos] as [Regiao, number]).sort((a, b) => b[1] - a[1])
  const b10 = k.vies_ordem_chegada.find((x) => x.apurado === 10)!
  const b50 = k.vies_ordem_chegada.find((x) => x.apurado === 50)!
  return { k, final, ordem, c10, cf, sobre, saldos, b10, b50, pico: k.pico_vantagem }
}

export function resumoReplay(h: H1Derivado) {
  const f = fatos(h)
  const vezes = f.pico.margem / f.final
  const cedo = f.sobre[0][0]
  const tarde = f.sobre[f.sobre.length - 1][0]
  return {
    titulo: `Flávio terminou ${pontos(f.final)} à frente de Lula, mas durante a noite a vantagem dele pareceu ${
      vezes >= 1.5 ? `até ${fmt(vezes, 0)} vezes maior` : 'maior'
    }.`,
    itens: [
      <>
        Às <b>{f.pico.hora}</b> o placar mostrava Flávio <b>{pontos(f.pico.margem)}</b> na frente. No fim, a diferença foi de{' '}
        <b>{pontos(f.final)}</b>.
      </>,
      <>
        Motivo: <b>{nomeRegiao(cedo)}</b> foi contado cedo e pesava {fmt(f.c10.regioes[cedo], 0)}% dos votos com 10% apurado (no
        final, {fmt(f.cf.regioes[cedo], 0)}%), com margem de {sinal(h.regioes[cedo].margem_pp, 0)}. Já{' '}
        <b>{nomeRegiao(tarde)}</b>, com margem de {sinal(h.regioes[tarde].margem_pp, 0)}, foi contado mais tarde.
      </>,
      <>
        Flávio tirou mais votos de vantagem no <b>{f.saldos[0][0]}</b> (+{milhoes(f.saldos[0][1])}); Lula, no{' '}
        <b>{f.saldos[f.saldos.length - 1][0]}</b> (+{milhoes(f.saldos[f.saldos.length - 1][1])}).
      </>,
      <>
        Lição para o 2º turno: <b>não confie no placar das primeiras horas</b>. Olhe a projeção, que corrige quem ainda não
        chegou.
      </>,
    ],
  }
}

export function resumoVivo(m: Momento, h?: H1Derivado) {
  if (!m.pronto || m.flavio == null || m.lula == null) return null
  const mg = m.flavio - m.lula
  const mp = m.projF != null && m.projL != null ? m.projF - m.projL : null
  const ref = h?.kpis.vies_ordem_chegada.reduce((a, x) => (Math.abs(x.apurado - m.pct) < Math.abs(a.apurado - m.pct) ? x : a))
  return {
    titulo: `${fmt(m.pct, 0)}% das urnas contadas. ${Math.abs(mg) < 0.05 ? 'Empate' : `${quemLidera(mg)} está ${pontos(mg)} à frente`} no placar.`,
    itens: [
      mp != null ? (
        <>
          A projeção aponta <b>{quemLidera(mp)} {pontos(mp)} à frente</b> no resultado final.
        </>
      ) : (
        <>Ainda não há urnas suficientes para projetar.</>
      ),
      ref && m.pct < 99 ? (
        <>
          No 1º turno, com {ref.apurado}% apurado, o placar ainda exagerava a vantagem de Flávio em <b>{pontos(ref.vies_pp)}</b>.
        </>
      ) : null,
      <>O placar parcial favorece quem vai bem nas regiões que chegam primeiro. As cidades grandes e o Nordeste costumam chegar por último.</>,
    ].filter(Boolean),
  }
}

export function respostas(h: H1Derivado) {
  const f = fatos(h)
  const v = f.k.velocidade
  const k = h.kpis
  const p = k.porte
  const corr = k.correlacoes.hora_chegada_x_margem_flavio
  const abst = REGIOES.filter((r) => r !== 'Exterior')
    .map((r) => [r, h.regioes[r].abstencao_pct] as [Regiao, number])
    .sort((a, b) => b[1] - a[1])
  const ultimo = f.ordem[f.ordem.length - 1]
  return {
    placar: (
      <>
        Flávio liderou do começo ao fim, mas a vantagem foi <b>encolhendo</b>: chegou a {pontos(f.pico.margem)} às {f.pico.hora} e
        terminou em {pontos(f.final)}.
      </>
    ),
    ritmo: (
      <>
        <b>{f.ordem[0]}</b> chegou à metade das urnas às {v[f.ordem[0]]['50']}; <b>{ultimo}</b>, só às {v[ultimo]['50']}.
      </>
    ),
    comp: (
      <>
        No começo, <b>{nomeRegiao(f.sobre[0][0])}</b> pesava {pontos(f.sobre[0][1], 0)} a mais do que pesaria no final, e{' '}
        <b>{nomeRegiao(f.sobre[f.sobre.length - 1][0])}</b>, {pontos(f.sobre[f.sobre.length - 1][1], 0)} a menos.
      </>
    ),
    vies: (
      <>
        Com 10% das urnas, o placar exagerava a vantagem de Flávio em <b>{pontos(f.b10.vies_pp)}</b>; com metade, ainda em{' '}
        {pontos(f.b50.vies_pp)}. A projeção errava bem menos: {pontos(f.b10.erro_proj_pp)} e {pontos(f.b50.erro_proj_pp)}.
      </>
    ),
    saldo: (
      <>
        Flávio tirou a maior vantagem do <b>{f.saldos[0][0]}</b>; Lula, do <b>{f.saldos[f.saldos.length - 1][0]}</b>.
      </>
    ),
    disp:
      corr < -0.2 ? (
        <>
          Sim: <b>quanto mais tarde o estado chega, mais votos Lula costuma ter</b>. Por isso o placar começa favorável a Flávio.
        </>
      ) : (
        <>A relação entre horário de chegada e voto é fraca por estado; o efeito vem mais de dentro das regiões.</>
      ),
    porte: (
      <>
        Cidades até 10 mil eleitores: {sinal(p[0].margem_pp, 0)}. Acima de 1 milhão: {sinal(p[p.length - 1].margem_pp, 0)}.
        Capitais: {sinal(k.capital_interior.capitais.margem_pp, 0)}.
      </>
    ),
    polar: (
      <>
        <b>{fmt(h.polarizadosPct, 0)}%</b> das cidades deram vitória de 30 pontos ou mais para alguém.
      </>
    ),
    abst: (
      <>
        {fmt(h.brasil.abstencao_pct, 0)}% dos eleitores não votaram. A maior abstenção foi no <b>{abst[0][0]}</b> (
        {fmt(abst[0][1])}%).
      </>
    ),
  }
}
