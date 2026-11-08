// vite.config.js 수정: 환경 변수 로딩 디버깅 및 안전한 백엔드 URL 설정
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const BACKEND_PATHS = ['/auth', '/library', '/quests', '/users', '/bookstore', '/books', '/times', '/main']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // 디버깅용 로그 추가
  console.log("Current working directory:", process.cwd());
  console.log("Loaded environment variables:", env);
  
  // .env.local이 로드되지 않는 경우를 대비한 하드코딩된 폴백
  const backendUrl = env.BACKEND_URL || 'http://127.0.0.1:8080';
  console.log("Using backend URL:", backendUrl);

  const proxy = {
    '/yes24': {
      target: 'https://apis.yes24.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/yes24/, ''),
      headers: { 'X-Api-Key': env.YES24_API_KEY ?? '' },
    },
  }
  
  // 환경 변수 존재 여부와 관계없이 항상 프록시 적용
  for (const path of BACKEND_PATHS) {
    proxy[path] = {
      target: backendUrl,
      changeOrigin: true,
      bypass: (req) => (req.headers.accept?.includes('text/html') ? '/index.html' : undefined),
    }
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
