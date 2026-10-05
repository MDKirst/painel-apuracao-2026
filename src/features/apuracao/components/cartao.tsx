import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

/** Card padrão: uma pergunta como título, a resposta em uma frase, o gráfico e o "como ler". */
export function CartaoGrafico({
  pergunta,
  resposta,
  comoLer,
  children,
  className,
}: {
  pergunta: string
  resposta?: React.ReactNode
  comoLer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle className='text-base'>{pergunta}</CardTitle>
        {resposta && <CardDescription className='text-sm leading-relaxed text-foreground/80'>{resposta}</CardDescription>}
      </CardHeader>
      <CardContent className='ps-2 pe-4'>{children}</CardContent>
      {comoLer && (
        <CardFooter className='gap-2 text-xs text-muted-foreground'>
          <Info className='size-3.5 shrink-0' />
          <span>{comoLer}</span>
        </CardFooter>
      )}
    </Card>
  )
}
