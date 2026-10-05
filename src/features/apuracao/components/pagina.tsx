import { useH1 } from '@/hooks/use-h1'
import { Main } from '@/components/layout/main'
import { Skeleton } from '@/components/ui/skeleton'
import { Cabecalho, TituloPagina } from './cabecalho'

/** Moldura comum das páginas: cabeçalho, título e espera dos dados do 1º turno. */
export function Pagina({ titulo, sub, children }: { titulo: string; sub?: React.ReactNode; children: React.ReactNode }) {
  const { data, error } = useH1()
  return (
    <>
      <Cabecalho />
      <Main>
        <TituloPagina titulo={titulo} sub={sub} />
        {error ? (
          <p className='text-destructive'>{(error as Error).message}</p>
        ) : !data ? (
          <div className='space-y-4'>
            <Skeleton className='h-40 w-full' />
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className='h-28' />
              ))}
            </div>
            <Skeleton className='h-80 w-full' />
          </div>
        ) : (
          <div className='space-y-4'>{children}</div>
        )}
      </Main>
    </>
  )
}
