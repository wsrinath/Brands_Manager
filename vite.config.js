import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase SDK (largest dependency)
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Excel export
          'vendor-xlsx': ['xlsx'],
          // Charts
          'vendor-recharts': ['recharts'],
          // Calendar + Moment
          'vendor-calendar': ['react-big-calendar', 'moment'],
          // Drag and drop
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        }
      }
    },
    // Raise the warning limit slightly since vendor chunks can be larger
    chunkSizeWarningLimit: 600
  }
})
