/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── Brand-Farben ──────────────────────────────────────────────────────
      // Alle Farben hier zentral ändern, der Rest der App passt sich an.
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',  // ← Primärfarbe (Buttons, Links, Akzente)
          700: '#1d4ed8',  // ← Hover-Zustand
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          DEFAULT: '#f8fafc',   // Seiten-Hintergrund
          card:    '#ffffff',   // Karten-Hintergrund
        },
        ink: {
          DEFAULT: '#0f172a',   // Haupttext
          muted:   '#64748b',   // Nebentext
        },
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
