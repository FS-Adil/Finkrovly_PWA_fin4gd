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
    //   VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     name: 'FinTech',
    //     short_name: 'Adil FinTech',
    //     description: 'Прозрачные финансовые операции',
    //     theme_color: '#123c2f',
    //     background_color: '#f5f7f5',
    //     display: 'standalone',
    //     start_url: '/',
    //   },
    // }),
      VitePWA({
        base,
        scope: base,
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ["**/*{html,css,js,ico,png,svg}"]
        },
        manifest: {
          start_url: base,
          scope: base,
          name: 'Financial Digital Technologies',
          short_name: 'FinDigTech',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: 'desctop-720x1280.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Desktop'
            },
            {
              src: 'modile-1280x720.png',
              sizes: '720x1280',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Mobile'
            }
          ]
        }
      })
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
