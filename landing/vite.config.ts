import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/landing',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('keycloak-js'))            return 'keycloak'
          if (id.includes('react-dom') || id.includes('node_modules/react/')) return 'react'
        },
      },
    },
  },
})
