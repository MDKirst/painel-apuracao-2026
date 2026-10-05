import {
  BookOpen,
  ChartNoAxesCombined,
  Clock,
  Gauge,
  LayoutDashboard,
  Map,
  Table2,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Painel',
      items: [
        { title: 'Visão geral', url: '/', icon: LayoutDashboard },
        { title: 'A noite da apuração', url: '/apuracao', icon: Clock },
        { title: 'Onde cada um ganhou', url: '/regioes', icon: Map },
        { title: 'Indicadores', url: '/indicadores', icon: Gauge },
        { title: 'Todos os estados', url: '/estados', icon: Table2 },
      ],
    },
    {
      title: 'Entenda',
      items: [
        { title: 'Como funciona e glossário', url: '/sobre', icon: BookOpen },
      ],
    },
  ],
}

export const ICONE_APP = ChartNoAxesCombined
