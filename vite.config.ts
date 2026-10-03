import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base: "./" → derlenen dosyalar GitHub Pages gibi alt dizinlerde de çalışır
export default defineConfig({
  base: "./",
  plugins: [react()],
});
