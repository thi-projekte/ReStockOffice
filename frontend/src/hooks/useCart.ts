import { useEffect, useState } from "react";
import type { CartItem, Product } from "../types/shop";

const STORAGE_KEY = "restockoffice_combined_cart";

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

  function add(product: Product) {
    setItems((previousItems) => {
      const existingItem = previousItems.find(
        (item) => item.product.itemId === product.itemId,
      );

      if (existingItem) {
        return previousItems.map((item) =>
          item.product.itemId === product.itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...previousItems, { product, quantity: 1 }];
    });
  }

  function remove(itemId: number) {
    setItems((previousItems) =>
      previousItems.filter((item) => item.product.itemId !== itemId),
    );
  }

  function updateQuantity(itemId: number, quantity: number) {
    if (quantity < 1) {
      remove(itemId);
      return;
    }

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.product.itemId === itemId ? { ...item, quantity } : item,
      ),
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return {
    items,
    add,
    remove,
    updateQuantity,
    totalItems,
    totalPrice,
  };
}
