import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/rezon/', // Yeh line add karein
  plugins: [
    tailwindcss(),
  ],
})