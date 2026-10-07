import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Two pages: the app, and the sheet of check-in codes printed for the
   machines (print.html), which the app itself never links to. */
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        print: fileURLToPath(new URL('./print.html', import.meta.url)),
      },
    },
  },
})
