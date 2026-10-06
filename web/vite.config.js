import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi phát triển, mọi yêu cầu /api được chuyển sang API Node.js ở cổng 3000,
// nên trình duyệt coi frontend và backend là cùng một nguồn (cookie hoạt động bình thường).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:3000' } },
});
