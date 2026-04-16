import type { Product } from "../types/Product";

// Einfache Mock-Daten für spätere UI-Tests ohne Backend-Anbindung.
export const products: Product[] = [
  {
    id: "1",
    name: "Tacker",
    description: "Ein kompakter Tacker für den Büroalltag.",
    price: 7.99,
  },
  {
    id: "2",
    name: "Kaffee",
    description: "Klassischer Büro-Kaffee als Platzhalterprodukt.",
    price: 12.49,
  },
  {
    id: "3",
    name: "Tastatur",
    description: "Standard-Tastatur für spätere Produktdarstellung.",
    price: 29.99,
  },
  {
    id: "4",
    name: "Kugelschreiber",
    description: "Einfacher Kugelschreiber für Notizen im Alltag.",
    price: 1.99,
  },
];
