import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'DucMinh lon.png'],
      manifest: {
        name: 'MedQuiz - Y Khoa Lâm Sàng',
        short_name: 'MedQuiz',
        description: 'Ứng dụng luyện thi và ôn tập Y Khoa lâm sàng',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'DucMinh lon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'DucMinh lon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})
