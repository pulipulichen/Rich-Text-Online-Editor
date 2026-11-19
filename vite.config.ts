import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/Rich-Text-Online-Editor/',
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      manifest: false,
      injectRegister: 'script-defer',
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'],
        // The self-hosted TinyMCE bundle is close to Workbox's default 2 MiB limit.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022' }
})
