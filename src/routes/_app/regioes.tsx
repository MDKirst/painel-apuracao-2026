import { createFileRoute } from '@tanstack/react-router'
import { Regioes } from '@/features/regioes'

export const Route = createFileRoute('/_app/regioes')({ component: Regioes })
