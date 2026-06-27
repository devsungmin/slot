import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버는 5173, /api 요청은 NestJS(3001)로 프록시한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
