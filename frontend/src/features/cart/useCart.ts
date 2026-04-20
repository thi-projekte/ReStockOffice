import { useState, useEffect } from 'react';
import type { Article, CartItem } from '../../types';

const STORAGE_KEY = 'restockoffice_cart';

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  const article = item.article as Record<string, unknown> | undefined;

  return (
    typeof item.quantity === 'number' &&
    item.quantity > 0 &&
    !!article &&
    typeof article.id === 'string' &&
    article.id.length > 0 &&
    typeof article.name === 'string' &&
    typeof article.description === 'string' &&
    typeof article.price === 'number'
  );
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidCartItem);
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
      const safePrev = prev.filter(isValidCartItem);
      const existing = safePrev.find((i) => i.article.id === article.id);
      if (existing) {
        return safePrev.map((i) =>
          i.article.id === article.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...safePrev, { article, quantity: 1 }];
    });
  }

  function remove(articleId: string) {
    setItems((prev) =>
      prev.filter((i) => isValidCartItem(i) && i.article.id !== articleId),
    );
  }

  function updateQuantity(articleId: string, quantity: number) {
    if (quantity < 1) { remove(articleId); return; }
    setItems((prev) =>
      prev
        .filter(isValidCartItem)
        .map((i) => (i.article.id === articleId ? { ...i, quantity } : i)),
    );
  }

  function clear() { setItems([]); }

  const safeItems = items.filter(isValidCartItem);
  const totalItems = safeItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = safeItems.reduce((sum, i) => sum + i.article.price * i.quantity, 0);

  return { items: safeItems, add, remove, updateQuantity, clear, totalItems, totalPrice };
}
