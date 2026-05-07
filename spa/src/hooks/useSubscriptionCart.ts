import { useEffect, useMemo, useState } from "react";
import type {
  Product,
  Subscription,
  SubscriptionItem,
  SubscriptionProductItem,
} from "../types/shop";
import {
  createSubscription,
  loadSubscription,
  saveSubscription,
} from "../services/orders";

interface AddSubscriptionPayload {
  product: Product;
  quantity: number;
  intervalCount: number;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function useSubscriptionCart() {
  const [subscription, setSubscription] = useState<Subscription>(createSubscription);
  const [isLoaded, setIsLoaded] = useState(false);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});

  useEffect(() => {
    let ignoreResult = false;

    async function loadCurrentSubscription() {
      const loadedSubscription = await loadSubscription();

      if (!ignoreResult) {
        setSubscription(loadedSubscription);
        setIsLoaded(true);
      }
    }

    void loadCurrentSubscription();

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveSubscription(subscription);
    }
  }, [isLoaded, subscription]);

  function registerProducts(products: Product[]) {
    setProductsById((previousProducts) => {
      const nextProducts = { ...previousProducts };

      for (const product of products) {
        nextProducts[String(product.productId)] = product;
      }

      return nextProducts;
    });
  }

  function addOrUpdateItem({
    product,
    quantity,
    intervalCount,
  }: AddSubscriptionPayload): "created" | "updated" {
    const today = formatDate(new Date());
    const hasExistingItem = subscription.items.some(
      (item) => item.productId === String(product.productId),
    );

    setProductsById((previousProducts) => ({
      ...previousProducts,
      [String(product.productId)]: product,
    }));

    setSubscription((previousSubscription) => {
      const existingItem = previousSubscription.items.find(
        (item) => item.productId === String(product.productId),
      );

      const nextItems: SubscriptionItem[] = existingItem
        ? previousSubscription.items.map((item) =>
            item.productId === String(product.productId)
              ? { ...item, quantity, intervalCount }
              : item,
          )
        : [
            ...previousSubscription.items,
            {
              itemId: `item_${crypto.randomUUID()}`,
              productId: String(product.productId),
              quantity,
              intervalCount,
            },
          ];

      return {
        ...previousSubscription,
        items: nextItems,
        updatedAt: today,
      };
    });

    return hasExistingItem ? "updated" : "created";
  }

  function removeItem(productId: string) {
    const today = formatDate(new Date());

    setSubscription((previousSubscription) => ({
      ...previousSubscription,
      items: previousSubscription.items.filter((item) => item.productId !== productId),
      updatedAt: today,
    }));
  }

  const items = useMemo<SubscriptionProductItem[]>(
    () =>
      subscription.items
        .map((item) => {
          const product = productsById[item.productId];

          if (!product) {
            return null;
          }

          return {
            ...item,
            product,
          };
        })
        .filter((item): item is SubscriptionProductItem => item !== null),
    [productsById, subscription.items],
  );

  const totalItems = subscription.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  function getExistingItem(productId: number) {
    return subscription.items.find((item) => item.productId === String(productId));
  }

  return {
    subscription,
    items,
    totalItems,
    totalPrice,
    registerProducts,
    addOrUpdateItem,
    removeItem,
    getExistingItem,
  };
}
