import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'FinSathi — Intelligent Business OS',
        short_name: 'FinSathi',
        description: 'Intelligent business management for Indian MSMEs',
        theme_color: '#0F172A',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react_vendor: ['react', 'react-dom', 'react-router-dom'],
          ui_vendor: ['lucide-react', 'framer-motion', 'react-select', 'react-hot-toast'],
          chart_vendor: ['chart.js', 'react-chartjs-2'],
          supabase_vendor: ['@supabase/supabase-js'],
          query_vendor: ['@tanstack/react-query'],
        }
      }
    }
  },
})
