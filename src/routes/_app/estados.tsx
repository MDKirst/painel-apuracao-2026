import { createFileRoute } from '@tanstack/react-router'
import { Estados } from '@/features/estados'

export const Route = createFileRoute('/_app/estados')({ component: Estados })
