import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ARCHIPEDIAICON.png'],
        manifest: {
          name: 'Archipedia',
          short_name: 'Archipedia',
          start_url: './',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#ffffff',
          icons: [
            {
              src: './ARCHIPEDIAICON.png',
              sizes: '144x144',
              type: 'image/png'
            },
            {
              src: './ARCHIPEDIAICON.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: './ARCHIPEDIAICON.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
    })
  ]
})
