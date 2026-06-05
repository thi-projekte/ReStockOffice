import { useEffect, useMemo, useState } from "react";
import type {
  Product,
  RestockOrder,
  RestockOrderWithProduct,
  Subscription,
} from "../types/shop";
import { useAPIs } from "../services/products";
import {
  createSubscription,
  deleteSubscriptionOrder,
  loadSubscription,
  upsertSubscriptionOrder,
} from "../services/orders";

interface AddSubscriptionPayload {
  product: Product;
  quantity: number;
  intervalCount: number;
}

interface UseSubscriptionCartOptions {
  customerId?: string;
  token?: string;
}

const MOCK_CUSTOMER_ID = "mock-user";

export function useSubscriptionCart({
                                       customerId,
                                       token,
                                     }: UseSubscriptionCartOptions) {
  const effectiveCustomerId = useAPIs ? customerId : (customerId ?? MOCK_CUSTOMER_ID);
  const [subscription, setSubscription] = useState<Subscription>(() =>
      createSubscription(effectiveCustomerId),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});

  useEffect(() => {
    let ignoreResult = false;

    setIsLoaded(false);

    async function loadCurrentSubscription() {
      if (useAPIs && !token) {
        if (!ignoreResult) {
          setSubscription(createSubscription(effectiveCustomerId));
          setIsLoaded(true);
        }
        return;
      }

      const loadedSubscription = await loadSubscription({ customerId: effectiveCustomerId, token });

      if (!ignoreResult) {
        setSubscription(loadedSubscription);
        setIsLoaded(true);
      }
    }

    void loadCurrentSubscription().catch((error: unknown) => {
      console.error(error);

      if (!ignoreResult) {
        setSubscription(createSubscription(effectiveCustomerId));
        setIsLoaded(true);
      }
    });

    return () => {
      ignoreResult = true;
    };
  }, [effectiveCustomerId, token]);

  function registerProducts(products: Product[]) {
    setProductsById((previousProducts) => {
      const nextProducts = { ...previousProducts };

      for (const product of products) {
        nextProducts[String(product.productId)] = product;
      }

      return nextProducts;
    });
  }

  async function addOrUpdateItem({
                                   product,
                                   quantity,
                                   intervalCount,
                                 }: AddSubscriptionPayload): Promise<"created" | "updated"> {
    if (useAPIs && !token) {
      throw new Error("Abo kann ohne Keycloak-Token nicht gespeichert werden.");
    }

    const productId = String(product.productId);

    const existingItem = subscription.items.find(
        (item) => item.productId === productId,
    );

    const hasExistingItem = Boolean(existingItem);

    const savedOrder = await upsertSubscriptionOrder({
      customerId: effectiveCustomerId,
      token,
      productId,
      quantity,
      intervalCount,
      existingItem,
    });

    setProductsById((previousProducts) => ({
      ...previousProducts,
      [productId]: product,
    }));

    setSubscription((previousSubscription) => {
      const currentItem = previousSubscription.items.find(
          (item) => item.productId === productId,
      );

      const today = new Date().toISOString().slice(0, 10);

      const nextItems: RestockOrder[] = currentItem
          ? previousSubscription.items.map((item) =>
              item.productId === productId
                  ? {
                    ...item,
                    ...savedOrder,
                    customerId: item.customerId,
                    createdAt: item.createdAt,
                    updatedAt: today,
                  }
                  : item,
          )
          : [
            ...previousSubscription.items,
            {
              id: savedOrder.id,
              customerId: previousSubscription.customerId,
              productId: savedOrder.productId,
              status: savedOrder.status,
              quantity: savedOrder.quantity,
              interval: savedOrder.interval,
              createdAt: today,
              updatedAt: today,
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

  async function removeItem(item: RestockOrderWithProduct): Promise<void> {
    if (useAPIs && !token) {
      throw new Error("Abo kann ohne Keycloak-Token nicht gespeichert werden.");
    }

    await deleteSubscriptionOrder({
      customerId: effectiveCustomerId,
      token,
      productId: item.productId,
    });

    setSubscription((previousSubscription) => ({
      ...previousSubscription,
      items: previousSubscription.items.filter(
        (subscriptionItem) => subscriptionItem.productId !== item.productId,
      ),
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  const items = useMemo<RestockOrderWithProduct[]>(
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
              .filter((item): item is RestockOrderWithProduct => item !== null),
      [productsById, subscription.items],
  );

  const totalItems = subscription.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
  );

  const totalPrice = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
  );

  function getExistingItem(productId: number) {
    return subscription.items.find(
        (item) => item.productId === String(productId),
    );
  }

  return {
    subscription,
    isLoaded,
    items,
    totalItems,
    totalPrice,
    registerProducts,
    addOrUpdateItem,
    removeItem,
    getExistingItem,
  };
}
