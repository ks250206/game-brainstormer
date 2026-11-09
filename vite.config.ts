import { defineConfig } from 'vite-plus';
export default defineConfig({
    base: './',
    oxc: { jsx: { runtime: 'automatic' } },
    server: { host: '127.0.0.1', port: 5173 },
    build: { target: 'es2022', cssCodeSplit: false },
});
