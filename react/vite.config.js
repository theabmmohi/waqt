import react from "@vitejs/plugin-react"
import {
  defineConfig
} from "vite"

export default defineConfig({
  plugins: [react()],
  server: { port: 5000 },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@asset": new URL("./src/assets", import.meta.url).pathname,
      "@page": new URL("./src/assets/pages", import.meta.url).pathname
    }
  }
})