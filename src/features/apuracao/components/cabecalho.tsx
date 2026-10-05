import { useEffect } from 'react'
import { Radio, History } from 'lucide-react'
import { useApuracao } from '@/stores/apuracao'
import { useTemVivo } from '@/hooks/use-vivo'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

/** Decide o modo inicial: ao vivo se o TSE já publicou o 2º turno, senão replay do 1º. */
export function useModoInicial() {
  const { modo, setModo } = useApuracao()
  const tem = useTemVivo()
  useEffect(() => {
    if (modo === null && !tem.isLoading) setModo(tem.data ? 'vivo' : 'replay')
  }, [modo, tem.isLoading, tem.data, setModo])
}

export function ModoSwitch() {
  const { modo, setModo } = useApuracao()
  return (
    <Tabs value={modo ?? 'replay'} onValueChange={(v) => setModo(v as 'vivo' | 'replay')}>
      <TabsList>
        <TabsTrigger value='vivo' className='gap-1.5'>
          <Radio className='size-3.5' />
          <span className='hidden sm:inline'>2º turno ·</span> ao vivo
        </TabsTrigger>
        <TabsTrigger value='replay' className='gap-1.5'>
          <History className='size-3.5' />
          <span className='hidden sm:inline'>1º turno ·</span> replay
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function Cabecalho() {
  useModoInicial()
  return (
    <Header fixed>
      <ModoSwitch />
      <div className='ms-auto flex items-center gap-2'>
        <Search placeholder='Buscar página…' className='hidden md:flex' />
        <ThemeSwitch />
        <ConfigDrawer />
      </div>
    </Header>
  )
}

export function TituloPagina({ titulo, sub }: { titulo: string; sub?: React.ReactNode }) {
  return (
    <div className='mb-4 space-y-1'>
      <h1 className='text-2xl font-bold tracking-tight'>{titulo}</h1>
      {sub && <p className='max-w-3xl text-muted-foreground'>{sub}</p>}
    </div>
  )
}
