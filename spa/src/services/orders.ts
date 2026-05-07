import type { RestockOrder, Subscription, SubscriptionItem } from "../types/shop";

export const useAPI = false;

const CUSTOMER_ID = "123";
const ORDERS_API_URL = "https://orders.restockoffice.de/orders";
const STORAGE_KEY = "restockoffice-subscription";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createSubscription(): Subscription {
  const today = formatDate(new Date());

  return {
    subscriptionId: `sub_${crypto.randomUUID()}`,
    customerId: CUSTOMER_ID,
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

function createSubscriptionFromOrders(orders: RestockOrder[]): Subscription {
  const customerOrders = orders.filter((order) => order.customerId === CUSTOMER_ID);
  const firstOrder = customerOrders[0];
  const today = formatDate(new Date());

  return {
    subscriptionId: `sub_${CUSTOMER_ID}`,
    customerId: CUSTOMER_ID,
    status: "ACTIVE",
    startDate: firstOrder?.createdAt ?? today,
    endDate: null,
    items: customerOrders.map(createSubscriptionItem),
    createdAt: firstOrder?.createdAt ?? today,
    updatedAt: customerOrders[customerOrders.length - 1]?.updatedAt ?? today,
  };
}

function loadSubscriptionFromLocalStorage(): Subscription {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createSubscription();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    return isSubscription(parsedValue) ? parsedValue : createSubscription();
  } catch {
    return createSubscription();
  }
}

async function loadSubscriptionFromApi(): Promise<Subscription> {
  const response = await fetch(
    `${ORDERS_API_URL}?customerId=${encodeURIComponent(CUSTOMER_ID)}`,
  );

  if (!response.ok) {
    throw new Error("RestockOrders konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("RestockOrders haben ein unerwartetes Format.");
  }

  return createSubscriptionFromOrders(payload.map(normalizeRestockOrder));
}

export async function loadSubscription(): Promise<Subscription> {
  if (!useAPI) {
    return loadSubscriptionFromLocalStorage();
  }

  try {
    return await loadSubscriptionFromApi();
  } catch (error) {
    console.error(error);
    return createSubscription();
  }
}

export function saveSubscription(subscription: Subscription) {
  if (useAPI) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
}

export function isOrdersApiEnabled() {
  return useAPI;
}

export function getOrdersApiUrl() {
  return ORDERS_API_URL;
}
