import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [ react() ],
  base: "./",
  build: {
    rollupOptions: {
      input: "index.html"
    }
  },
  server: { port: 5000 },
  resolve: {
    alias: {
      "@": path.resolve(new URL("./src", import.meta.url).pathname),
      "@page": path.resolve(new URL("./src/assets/pages", import.meta.url).pathname)
    }
  }
})