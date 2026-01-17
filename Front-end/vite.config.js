import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [react(), wasm()],
<<<<<<< HEAD
=======
  optimizeDeps: {
    exclude: ["argon2-browser"],
  },
>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
});
