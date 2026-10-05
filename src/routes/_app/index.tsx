import { createFileRoute } from '@tanstack/react-router'
import { VisaoGeral } from '@/features/visao-geral'

export const Route = createFileRoute('/_app/')({ component: VisaoGeral })
