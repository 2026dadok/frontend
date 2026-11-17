import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 백엔드 API 경로 (API 명세서 기준). BACKEND_URL 이 있을 때만 프록시로 넘긴다.
// /shared-readings: 공동서재, /images: 서버에 올린 프로필·배경 사진 (명세서: image_url 이 /images/... 형태)
const BACKEND_PATHS = ['/auth', '/library', '/quests', '/users', '/bookstore', '/books', '/times', '/main', '/shared-readings', '/images']

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
    for (const path of BACKEND_PATHS) {
      proxy[path] = {
        target: env.BACKEND_URL,
        changeOrigin: true,
        // 브라우저 주소창으로 들어온 화면 이동(예: /auth/log_page)은 백엔드로 보내지 않고 프런트 화면을 보여준다.
        // 화면 주소와 API 주소가 /auth/... 로 겹쳐도 충돌하지 않게 하기 위해서다. fetch 호출은 그대로 백엔드로 간다.
        bypass: (req) => (req.headers.accept?.includes('text/html') ? '/index.html' : undefined),
        // 브라우저의 Origin 을 빼고 보낸다. 백엔드 CORS 목록에 없는 주소(다른 포트·다른 컴퓨터 IP)에서 열어도
        // POST·PUT·DELETE 가 403("Invalid CORS request")이 되지 않게 한다. 프록시 → 백엔드는 서버끼리의 요청이다.
        configure: (proxyServer) => {
          proxyServer.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
        },
      }
    }
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
