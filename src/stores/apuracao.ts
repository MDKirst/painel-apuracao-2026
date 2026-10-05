import { create } from 'zustand'

export type Modo = 'replay' | 'vivo'

type Estado = {
  modo: Modo | null // null = ainda decidindo (consulta ao TSE)
  t: number | null // índice do minuto no replay (null = fim)
  tocando: boolean
  setModo: (m: Modo) => void
  setT: (t: number) => void
  setTocando: (v: boolean) => void
}

const inicial = new URLSearchParams(location.search).get('modo')

export const useApuracao = create<Estado>((set) => ({
  modo: inicial === 'vivo' || inicial === 'replay' ? inicial : null,
  t: null,
  tocando: false,
  setModo: (modo) => set({ modo, tocando: false }),
  setT: (t) => set({ t }),
  setTocando: (tocando) => set({ tocando }),
}))
