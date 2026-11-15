import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)) // Alias for src folder
        }
    },
    plugins: [
        vue(),
        tailwindcss(),
        VitePWA({
            // Registration is handled in app code (PwaUpdatePrompt.vue) so a
            // "new version available" prompt can be shown instead of silently
            // reloading the user's session.
            registerType: 'prompt',
            injectRegister: null,
            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true
            },
            includeAssets: [
                'favicon.ico',
                'favicon-16x16.png',
                'favicon-32x32.png',
                'apple-touch-icon.png',
                'android-chrome-192x192.png',
                'android-chrome-512x512.png'
            ],
            manifest: {
                id: '/',
                name: 'Money Manager',
                short_name: 'Money',
                description: 'Offline-first personal finance manager',
                lang: 'en',
                dir: 'ltr',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'android-chrome-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            }
        })
    ],
})
