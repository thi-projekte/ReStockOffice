import type { RestockOrder, Subscription, SubscriptionItem } from "../types/shop";

export const useAPI = true;

export const FALLBACK_CUSTOMER_ID = "100";
const ORDERS_API_URL = "https://orders.restockoffice.de/orders";
const STORAGE_KEY = "restockoffice-subscription";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createSubscription(customerId = FALLBACK_CUSTOMER_ID): Subscription {
  const today = formatDate(new Date());

  return {
    subscriptionId: `sub_${crypto.randomUUID()}`,
    customerId,
    status: "ACTIVE",
    startDate: today,
    endDate: null,
    items: [],
    createdAt: today,
    updatedAt: today,
  };
}

function isSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") {
    return false;
  }
  const sub = value as Subscription;
  return (
    Array.isArray(sub.items)
  );
}

function normalizeRestockOrder(rawOrder: unknown): RestockOrder {
  const source = rawOrder as Record<string, unknown>;

  return {
    customerId: String(source.customerId ?? ""),
    productId: String(source.productId ?? ""),
    status: String(source.status ?? "ACTIVE"),
    quantity: Number(source.quantity ?? 1),
    interval: Number(source.interval ?? 1),
    createdAt: String(source.createdAt ?? formatDate(new Date())),
    updatedAt: String(source.updatedAt ?? formatDate(new Date())),
  };
}

function createSubscriptionItem(order: RestockOrder): SubscriptionItem {
  return {
    itemId: `order_${order.customerId}_${order.productId}_${order.createdAt}`,
    productId: order.productId,
    quantity: Number.isFinite(order.quantity) && order.quantity > 0 ? order.quantity : 1,
    intervalCount: Number.isFinite(order.interval) && order.interval > 0 ? order.interval : 1,
  };
}

function createSubscriptionFromOrders(
  orders: RestockOrder[],
  customerId = FALLBACK_CUSTOMER_ID,
): Subscription {
  const customerOrders = orders.filter((order) => order.customerId === customerId);
  const firstOrder = customerOrders[0];
  const today = formatDate(new Date());

  return {
    subscriptionId: `sub_${customerId}`,
    customerId,
    status: "ACTIVE",
    startDate: firstOrder?.createdAt ?? today,
    endDate: null,
    items: customerOrders.map(createSubscriptionItem),
    createdAt: firstOrder?.createdAt ?? today,
    updatedAt: customerOrders[customerOrders.length - 1]?.updatedAt ?? today,
  };
}

function loadSubscriptionFromLocalStorage(customerId = FALLBACK_CUSTOMER_ID): Subscription {
  try {
    const rawValue = localStorage.getItem(`${STORAGE_KEY}-${customerId}`);

    if (!rawValue) {
      return createSubscription(customerId);
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    return isSubscription(parsedValue) ? parsedValue : createSubscription(customerId);
  } catch {
    return createSubscription(customerId);
  }
}

async function loadSubscriptionFromApi(customerId = FALLBACK_CUSTOMER_ID): Promise<Subscription> {
  const response = await fetch(
    `${ORDERS_API_URL}?customerId=${encodeURIComponent(customerId)}`,
  );

  if (!response.ok) {
    throw new Error("RestockOrders konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("RestockOrders haben ein unerwartetes Format.");
  }

  return createSubscriptionFromOrders(payload.map(normalizeRestockOrder), customerId);
}

export async function loadSubscription(customerId = FALLBACK_CUSTOMER_ID): Promise<Subscription> {
  if (!useAPI) {
    return loadSubscriptionFromLocalStorage(customerId);
  }

  try {
    return await loadSubscriptionFromApi(customerId);
  } catch (error) {
    console.error(error);
    return createSubscription(customerId);
  }
}

export function saveSubscription(subscription: Subscription) {
  if (useAPI) {
    return;
  }

  localStorage.setItem(`${STORAGE_KEY}-${subscription.customerId}`, JSON.stringify(subscription));
}

export function isOrdersApiEnabled() {
  return useAPI;
}

export function getOrdersApiUrl() {
  return ORDERS_API_URL;
}
