import { useState, useEffect } from 'react';
import type { Article, CartItem } from '../../types';

const STORAGE_KEY = 'restockoffice_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function add(article: Article) {
    setItems((prev) => {
      const existing = prev.find((i) => i.article.id === article.id);
      if (existing) {
        return prev.map((i) =>
          i.article.id === article.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { article, quantity: 1 }];
    });
  }

  function remove(articleId: string) {
    setItems((prev) => prev.filter((i) => i.article.id !== articleId));
  }

  function updateQuantity(articleId: string, quantity: number) {
    if (quantity < 1) { remove(articleId); return; }
    setItems((prev) =>
      prev.map((i) => (i.article.id === articleId ? { ...i, quantity } : i)),
    );
  }

  function clear() { setItems([]); }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.article.price * i.quantity, 0);

  return { items, add, remove, updateQuantity, clear, totalItems, totalPrice };
}
