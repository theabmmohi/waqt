import { VitePWA } from "vite-plugin-pwa"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      registerType: "autoUpdate",
      filename: "sw.js",
      srcDir: "src",
      includeAssets: [
        "favicon-16x16.png",
        "favicon-32x32.png",
        "icon.png"
      ],
      manifest: {
        description: "Prayer times, simplified.",
        background_color: "#ffffff",
        orientation: "portrait",
        theme_color: "#ffffff",
        display: "standalone",
        short_name: "Waqt",
        start_url: "/",
        name: "Waqt",
        related_applications: [{
            url: "/manifest.webmanifest",
            platform: "webapp"
        }],
        icons: [
          {
            src: "/icon.png",
            type: "image/png",
            sizes: "1024x1024",
            "purpose": "any",
          }
        ]
      },
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,png,ico}"] },
      devOptions: { enabled: false }
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