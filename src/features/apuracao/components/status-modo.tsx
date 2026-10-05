import { useApuracao } from '@/stores/apuracao'
import { useSidebar } from '@/components/ui/sidebar'

/** Rodapé da sidebar: lembra em que modo o painel está. */
export function StatusModo() {
  const { modo } = useApuracao()
  const { state } = useSidebar()
  if (state === 'collapsed') return null
  return (
    <div className='rounded-lg border bg-background/50 p-3 text-xs text-muted-foreground'>
      {modo === 'vivo' ? (
        <>
          <p className='font-medium text-foreground'>2º turno · 25/10</p>
          <p>Lendo o TSE direto, a cada 15 segundos.</p>
        </>
      ) : (
        <>
          <p className='font-medium text-foreground'>1º turno · 04/10</p>
          <p>Replay da noite, reconstruído urna a urna.</p>
        </>
      )}
      <p className='mt-2'>Projeto educacional, sem fins políticos. Fonte: TSE.</p>
    </div>
  )
}
