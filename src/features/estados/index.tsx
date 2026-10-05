import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { NOME_UF, REGIAO, UFS, corMargem, fmt, fmtInt, pctPrec, priorUF, sinal, sinalPrec, textoSobre } from '@/lib/eleicao'
import { useApuracao } from '@/stores/apuracao'
import { useH1 } from '@/hooks/use-h1'
import { useMomento } from '@/hooks/use-momento'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTableColumnHeader } from '@/components/data-table'
import { ControleTempo } from '@/features/apuracao/components/controle-tempo'
import { Pagina } from '@/features/apuracao/components/pagina'

type Linha = {
  uf: string
  nome: string
  regiao: string
  eleitores: number
  apurado: number | null
  flavio: number | null
  lula: number | null
  margem: number | null
  final: number | null
  saldo: number | null
  t50: number | null
  t50txt: string
  abst: number | null
}

function Chip({ m }: { m: number | null }) {
  const cor = corMargem(m)
  if (!cor || m == null) return <span className='text-muted-foreground'>–</span>
  return (
    <span className='tabular inline-block rounded-full px-2 py-0.5 text-xs font-semibold' style={{ background: cor, color: textoSobre(cor) }}>
      {sinalPrec(m)}
    </span>
  )
}

const num = (d = 1, suf = '') => ({ getValue }: { getValue: () => unknown }) => {
  const v = getValue() as number | null
  return <span className='tabular'>{v == null ? '–' : `${fmt(v, d)}${suf}`}</span>
}

export function Estados() {
  const { data: h } = useH1()
  const { modo } = useApuracao()
  const m = useMomento()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'eleitores', desc: true }])
  const [busca, setBusca] = useState('')
  const vivo = modo === 'vivo'

  const dados = useMemo<Linha[]>(() => {
    if (!h) return []
    return UFS.map((uf) => {
      const x = m.porUf[uf] ?? {}
      const fim = h.ufs[uf]
      const ref = vivo ? priorUF(h, uf) : null
      return {
        uf: uf === 'zz' ? 'EXT' : uf.toUpperCase(),
        nome: NOME_UF[uf],
        regiao: REGIAO[uf],
        eleitores: fim?.eleitores ?? x.eleitores ?? 0,
        apurado: x.pct ?? null,
        flavio: x.flavio ?? null,
        lula: x.lula ?? null,
        margem: x.flavio != null && x.lula != null ? x.flavio - x.lula : null,
        final: vivo ? (ref ? ref.flavio - ref.lula : null) : (fim?.margem_pp ?? null),
        saldo: vivo ? null : (fim?.saldo_votos ?? null),
        t50: fim?.t50_min ?? null,
        t50txt: fim?.t50 ?? '–',
        abst: fim?.abstencao_pct ?? null,
      }
    }).filter((l) => !busca || `${l.uf} ${l.nome} ${l.regiao}`.toLowerCase().includes(busca.toLowerCase()))
  }, [h, m.porUf, vivo, busca])

  const colunas = useMemo<ColumnDef<Linha>[]>(
    () => [
      {
        accessorKey: 'nome',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Estado' />,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span className='w-9 font-mono text-xs text-muted-foreground'>{row.original.uf}</span>
            <span className='font-medium'>{row.original.nome}</span>
          </div>
        ),
      },
      { accessorKey: 'regiao', header: ({ column }) => <DataTableColumnHeader column={column} title='Região' /> },
      { accessorKey: 'eleitores', header: ({ column }) => <DataTableColumnHeader column={column} title='Eleitores' />, cell: ({ getValue }) => <span className='tabular'>{fmtInt(getValue() as number)}</span> },
      { accessorKey: 'apurado', header: ({ column }) => <DataTableColumnHeader column={column} title='Apurado' />, cell: num(1, '%') },
      { accessorKey: 'flavio', header: ({ column }) => <DataTableColumnHeader column={column} title='Flávio' />, cell: ({ row }) => <span className='tabular'>{row.original.flavio == null ? '–' : `${fmt(row.original.flavio, pctPrec(row.original.flavio, row.original.lula ?? undefined))}%`}</span> },
      { accessorKey: 'lula', header: ({ column }) => <DataTableColumnHeader column={column} title='Lula' />, cell: ({ row }) => <span className='tabular'>{row.original.lula == null ? '–' : `${fmt(row.original.lula, pctPrec(row.original.flavio ?? undefined, row.original.lula))}%`}</span> },
      { accessorKey: 'margem', header: ({ column }) => <DataTableColumnHeader column={column} title={vivo ? 'Vantagem agora' : 'Vantagem no momento'} />, cell: ({ getValue }) => <Chip m={getValue() as number | null} /> },
      { accessorKey: 'final', header: ({ column }) => <DataTableColumnHeader column={column} title={vivo ? 'Referência 1º turno' : 'Vantagem final'} />, cell: ({ getValue }) => <Chip m={getValue() as number | null} /> },
      ...(!vivo
        ? ([
            { accessorKey: 'saldo', header: ({ column }) => <DataTableColumnHeader column={column} title='Saldo (votos)' />, cell: ({ getValue }) => { const v = getValue() as number; return <span className='tabular'>{Math.abs(v) < 1e4 ? `${sinal(v, 0)} votos` : `${sinal(v / 1000, 0)} mil`}</span> } },
            { accessorKey: 't50', header: ({ column }) => <DataTableColumnHeader column={column} title='Metade chegou' />, cell: ({ row }) => <span className='tabular'>{row.original.t50txt}</span> },
            { accessorKey: 'abst', header: ({ column }) => <DataTableColumnHeader column={column} title='Abstenção' />, cell: num(1, '%') },
          ] as ColumnDef<Linha>[])
        : []),
    ],
    [vivo]
  )

  const tabela = useReactTable({
    data: dados,
    columns: colunas,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Pagina titulo='Todos os estados' sub='Placar e ritmo de cada estado. Clique no nome de uma coluna para ordenar.'>
      <ControleTempo />
      <Card>
        <CardContent className='space-y-4'>
          <Input placeholder='Filtrar estado ou região…' value={busca} onChange={(e) => setBusca(e.target.value)} className='h-8 w-full sm:w-64' />
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                {tabela.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((c) => (
                      <TableHead key={c.id} className='whitespace-nowrap'>
                        {flexRender(c.column.columnDef.header, c.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {tabela.getRowModel().rows.map((r) => (
                  <TableRow key={r.id}>
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id} className='whitespace-nowrap'>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Pagina>
  )
}
