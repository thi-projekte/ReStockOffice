import { useEffect, useMemo, useState } from "react";
import type {
  Product,
  SubscriptionCart,
  SubscriptionItem,
  SubscriptionProductItem,
} from "../types/shop";

const STORAGE_KEY = "restockoffice_subscription_cart";

interface AddSubscriptionPayload {
  product: Product;
  quantity: number;
  intervalCount: number;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createSubscriptionCart(): SubscriptionCart {
  const today = formatDate(new Date());

  return {
    subscriptionId: `sub_${crypto.randomUUID()}`,
    customerId: "cust_local",
    status: "ACTIVE",
    startDate: today,
    endDate: null,
    items: [],
    createdAt: today,
    updatedAt: today,
  };
}

function isSubscriptionCart(value: unknown): value is SubscriptionCart {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cart = value as SubscriptionCart;
  return (
    typeof cart.subscriptionId === "string" &&
    typeof cart.customerId === "string" &&
    Array.isArray(cart.items)
  );
}

function loadSubscriptionCart(): SubscriptionCart {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createSubscriptionCart();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    return isSubscriptionCart(parsedValue) ? parsedValue : createSubscriptionCart();
  } catch {
    return createSubscriptionCart();
  }
}

export function useSubscriptionCart() {
  const [subscription, setSubscription] = useState<SubscriptionCart>(loadSubscriptionCart);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
  }, [subscription]);

  function registerProducts(products: Product[]) {
    setProductsById((previousProducts) => {
      const nextProducts = { ...previousProducts };

      for (const product of products) {
        nextProducts[String(product.itemId)] = product;
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
      (item) => item.productId === String(product.itemId),
    );

    setProductsById((previousProducts) => ({
      ...previousProducts,
      [String(product.itemId)]: product,
    }));

    setSubscription((previousSubscription) => {
      const existingItem = previousSubscription.items.find(
        (item) => item.productId === String(product.itemId),
      );

      const nextItems: SubscriptionItem[] = existingItem
        ? previousSubscription.items.map((item) =>
            item.productId === String(product.itemId)
              ? { ...item, quantity, intervalCount }
              : item,
          )
        : [
            ...previousSubscription.items,
            {
              itemId: `item_${crypto.randomUUID()}`,
              productId: String(product.itemId),
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
