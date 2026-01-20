import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ARCHIPEDIA图标.png'],
      manifest: {
        name: 'Archipedia',
        short_name: 'Archipedia',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/ARCHIPEDIA图标.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
