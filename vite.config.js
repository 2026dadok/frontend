import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 백엔드 API 경로 (API 명세서 기준). BACKEND_URL 이 있을 때만 프록시로 넘긴다.
const BACKEND_PATHS = ['/auth', '/library', '/quests', '/users', '/bookstore', '/books', '/times', '/main']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env.local 값. VITE_ 접두사가 없어서 브라우저 코드에는 노출되지 않는다.
  //   YES24_API_KEY=...             (YES24 키)
  //   BACKEND_URL=http://...        (백엔드 서버 주소, 없으면 백엔드 프록시를 쓰지 않는다)
  const env = loadEnv(mode, '.', '')

  const proxy = {
    // 브라우저 /yes24/... → https://apis.yes24.com/... (CORS 회피 + 키는 여기서 헤더로 추가)
    '/yes24': {
      target: 'https://apis.yes24.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/yes24/, ''),
      headers: { 'X-Api-Key': env.YES24_API_KEY ?? '' },
    },
  }
  if (env.BACKEND_URL) {
    for (const path of BACKEND_PATHS) proxy[path] = { target: env.BACKEND_URL, changeOrigin: true }
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
