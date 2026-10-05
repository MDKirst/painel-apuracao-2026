import { createFileRoute } from '@tanstack/react-router'
import { Sobre } from '@/features/sobre'

export const Route = createFileRoute('/_app/sobre')({ component: Sobre })
