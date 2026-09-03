import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiOrigin = env.DEV_API_ORIGIN || 'https://web-duc-minh-quiz.vercel.app'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['diamond_quiz.png', 'icons/*.png'],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Không để Service Worker trả index.html cho URL API khi mở trực tiếp.
          navigateFallbackDenylist: [/^\/api\//]
        },
        manifest: {
          name: 'DiamondQuiz - Y Khoa Lâm Sàng',
          short_name: 'DiamondQuiz',
          description: 'Ngân hàng đề thi và ca lâm sàng Y khoa toàn diện',
          lang: 'vi',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        clientPort: 5173,
      },
      // `vite` chỉ chạy frontend. Proxy duy nhất manifest công khai để bản local
      // dùng dữ liệu thật mà không chuyển tiếp đăng nhập/đăng ký sang production.
      proxy: {
        '/api/quiz/manifest': {
          target: devApiOrigin,
          changeOrigin: true,
          secure: true,
        },
        '/api/quiz/questions': {
          target: devApiOrigin,
          changeOrigin: true,
          secure: true,
        },
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      },
    },
  }
})
