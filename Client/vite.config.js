import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',  // ← Yeh change karein '/' rakhein
  plugins: [
    tailwindcss(),
  ],
})