import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',  // ← Isay './' kar ke dekhein
  plugins: [
    tailwindcss(),
  ],
})