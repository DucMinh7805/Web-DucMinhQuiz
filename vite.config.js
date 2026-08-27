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
        name: 'DiamondQuiz - Y Khoa Lâm Sàng',
        short_name: 'DiamondQuiz',
        description: 'Ngân hàng đề thi và ca lâm sàng Y khoa toàn diện',
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
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    },
  },
})
