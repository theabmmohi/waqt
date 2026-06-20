import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } "vite-plugin-pwa"


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png"
      ],
      manifest: {
        name: "Waqt",
        short_name: "Waqt",
        description: "Prayer times, simplified.",
        start_url: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: { port: 5000 },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@asset": new URL("./src/assets", import.meta.url).pathname,
      "@page": new URL("./src/assets/pages", import.meta.url).pathname
    }
  }
})