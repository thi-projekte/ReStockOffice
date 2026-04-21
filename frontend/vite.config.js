import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Minimale Vite-Konfiguration fuer ein spaeter direkt deploybares SPA.
export default defineConfig({
    plugins: [react()],
});
