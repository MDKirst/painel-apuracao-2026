# Painel da Apuração · Presidente 2026

> **Projeto educacional, sem fins políticos.** Feito para explicar como funciona a apuração e como ler os números. Não apoia, critica ou promove nenhum candidato ou partido, e não tem vínculo com o TSE, partidos ou campanhas. O resultado oficial é sempre o do TSE.

Painel aberto para acompanhar a apuração para presidente **lendo direto os arquivos públicos do TSE**. Ele explica, em linguagem simples, **quais regiões chegam primeiro** e **por que o placar parcial engana** durante a noite.

- **2º turno · ao vivo (25/10/2026):** o navegador consulta o TSE a cada 15 s. Não há servidor intermediário: o TSE libera CORS.
- **1º turno · replay (04/10/2026):** a noite reconstruída minuto a minuto, a partir do horário em que cada urna chegou ao TSE.

Interface baseada no [shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT): React 19, Vite, Tailwind 4, shadcn/ui, TanStack Router/Query/Table e gráficos em Recharts.

## O que o 1º turno mostrou

| | |
|---|---|
| Resultado | Flávio 47,03% × Lula 45,16% (+1,87 pp) |
| Maior vantagem no placar | Flávio +9,6 pp às 17h36 (3,6% apurado) |
| Engano do placar com 10% apurado | +7,1 pp a favor de Flávio |
| Placar ficou a ±1 pp do final | só às 20h55 (96% apurado) |
| Projeção ajustada por UF ficou a ±1 pp | às 19h01 (62% apurado) |
| Primeiro a chegar / último | Centro-Oeste (metade às 18h20) / Nordeste (19h02) |
| Validação contra o placar publicado | erro médio de 0,8 pp (6 horários, prints do g1) |
| 2º turno garantido pela matemática | 20h56 (96,6% apurado), o mesmo horário em que o TSE confirmou o 2º turno |
| Flávio na frente com 99% de chance | 19h15 (75% apurado) · certeza matemática só às 21h02 (98,3%) |

## Botão "Já está decidido?"

Fica no controle de tempo, em todas as páginas e nos dois modos. Calcula, no instante escolhido:

- **Quanto o candidato de trás precisaria tirar** nas urnas que faltam para virar (em pontos), comparado com o que está fazendo nas já contadas.
- **Certeza matemática:** a vantagem do líder supera todos os eleitores das urnas ainda não apuradas (comparecimento de 100%).
- **Na prática:** a vantagem supera os votos válidos que ainda devem entrar, no comparecimento observado.
- **Estimativa estatística:** chance de o líder terminar na frente, pela projeção por estado e uma margem de erro que encolhe com a apuração (`0,4 + 3 × fração que falta`, em pp; calibrada com folga sobre o erro real do 1º turno).
- **1º turno:** se o 2º turno já está garantido (ninguém passa de 50% nem levando todos os votos restantes).
- **No replay:** o horário exato em que cada uma dessas coisas ficou decidida, com botão para pular até lá.

A lógica está em [`src/lib/decisao.ts`](src/lib/decisao.ts).

## Páginas

| Página | Conteúdo |
|---|---|
| Visão geral | resumo em 30 segundos, placar, projeção, evolução da noite e mapa por UF |
| A noite da apuração | ritmo de chegada por região, de onde vinham os votos contados e o "engano" do placar |
| Onde cada um ganhou | saldo de votos por região, horário de chegada × voto, porte da cidade, polarização, abstenção |
| Indicadores | os 13 KPIs do processo, com tabela de detalhe |
| Todos os estados | tabela ordenável com placar, vantagem e ritmo de cada UF |
| Como funciona | glossário, método e arquivos do TSE usados |

## Rodar localmente

```bash
npm install
npm run dev
```

Parâmetros de URL: `?modo=replay` ou `?modo=vivo` forçam o modo. Já `?modo=vivo&ele=6257` testa o ao vivo com os arquivos (finais) do 1º turno.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie o projeto (`git push`).
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
3. O workflow [`deploy.yml`](.github/workflows/deploy.yml) faz o build e publica a cada push na `main`. O endereço fica `https://<usuario>.github.io/<repositorio>/`.

O roteamento usa hash (`#/estados`), então recarregar qualquer página funciona no Pages.

## Dados do TSE (todos públicos)

Base: `https://resultados.tse.jus.br/oficial/ele2026/` · 1º turno federal = eleição **6257**, pleito **3220** · 2º turno = eleição **6258**.

| Arquivo | Conteúdo |
|---|---|
| `{ele}/dados/br/br-c0001-e00{ele}-u.json` | resultado nacional para presidente |
| `{ele}/dados/br/br-e00{ele}-ab.json` | andamento por UF (seções totalizadas, eleitorado) |
| `{ele}/dados/{uf}/{uf}-e00{ele}-ab.json` / `{uf}{mun}-c0001-e00{ele}-u.json` | andamento e resultado por município |
| `arquivo-urna/{pleito}/dados/{uf}/{mun}/{zona}/{secao}/…-aux.json` | **horário de recebimento de cada urna** |
| dadosabertos.tse.jus.br · "Boletim de urna" | votos de **todas** as urnas + horários de encerramento, emissão e recebimento (sai dias depois) |

## Regenerar o replay

```bash
pip install requests
python scripts/coleta_1turno.py --amostra 0.04   # amostra de urnas (~1h30, o TSE limita a taxa)
python scripts/boletins.py                       # quando o TSE publicar os boletins: troca a amostra por todas as urnas
python scripts/analisa_1turno.py                 # gera public/data/1turno.json
```

Depois do 2º turno: `python scripts/coleta_1turno.py --ele 6258 --pleito <código>` (o código do pleito aparece em `comum/config/ele-c.json`).

## Método e limites

- **Reconstrução por amostra:** cerca de 4% das urnas de cada município (no mínimo 1). Cada urna amostrada carrega a fração correspondente dos votos finais da cidade, no horário em que chegou. Limite: supõe que todas as urnas de uma cidade votam igual à média dela. Com os boletins completos (`boletins.py`), esse limite desaparece.
- **Projeção ajustada por UF:** o que falta de cada estado vota como o que já chegou dele. Estados sem urnas usam o 1º turno mais o swing médio. Não é previsão oficial.
- **Blocos "direita/esquerda":** classificação simplificada e editável (`BLOCO` em `scripts/analisa_1turno.py`). O indicador principal é a margem Flávio − Lula.
- **Cores:** azul = Flávio, vermelho = Lula. As cores das regiões vêm de uma paleta validada para daltonismo.

Projeto educacional, sem fins políticos e sem vínculo com o TSE, partidos ou campanhas. O resultado oficial é sempre o do TSE.
