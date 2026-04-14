import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'map'; // Isolates map logic
            }
            if (id.includes('@dnd-kit')) {
              return 'dnd'; // Isolates drag-and-drop
            }
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
              return 'vendor'; // Isolates core React
            }
          }
        }
      }
    }
  }
})