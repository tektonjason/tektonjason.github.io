import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tektonjason.github.io/',
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
            }
          ]
        }
    })
  ]
})
