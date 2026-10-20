import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // YES24_API_KEY는 VITE_ 접두사가 없어서 브라우저 코드에 노출되지 않는다 (.env.local에 입력)
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // 브라우저 /yes24/... → https://apis.yes24.com/... (CORS 회피 + 키는 여기서 헤더로 추가)
        '/yes24': {
          target: 'https://apis.yes24.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yes24/, ''),
          headers: { 'X-Api-Key': env.YES24_API_KEY ?? '' },
        },
      },
    },
  }
})
