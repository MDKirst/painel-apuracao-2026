import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// base relativa: o mesmo build funciona em https://<usuario>.github.io/<repositorio>/
export default defineConfig({
  base: './',
  // versão do build: os dados são pedidos com ?v=<build>, então código e dados nunca se misturam no cache
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
