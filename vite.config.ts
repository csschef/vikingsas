import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // I utveckling kör frontend och API som två processer. Allt som börjar med
    // /api skickas vidare till Express, så webbläsaren ser bara en adress och
    // vi slipper CORS. I produktion ligger de redan på samma domän via Vercel.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
