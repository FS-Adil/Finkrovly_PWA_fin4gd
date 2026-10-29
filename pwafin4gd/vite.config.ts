import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv} from 'vite'
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig (({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_APP_BASE;
  const bffUrl = env.VITE_BFF_URL

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Adil FinTech',
        short_name: 'Adil FinTech',
        description: 'Прозрачные финансовые операции',
        theme_color: '#123c2f',
        background_color: '#f5f7f5',
        display: 'standalone',
        start_url: '/',
      },
    }),
    ],

    server: {
      port: parseInt(env.VITE_APP_PORT),
      proxy: {
        '/api': {
          target: bffUrl,
          changeOrigin: true,
        },
      },
    }
  }
})
