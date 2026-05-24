import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 🎯 Statik asset'lerin '/' kök dizini üzerinden kırılmadan okunmasını sağlar
  build: {
    outDir: 'dist', // Çıktı klasörünün adını dist olarak kilitler
  }
})