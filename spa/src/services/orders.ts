import type { RestockOrder, Subscription } from "../types/shop";

const ORDERS_API_URL = "https://orders.restockoffice.de/orders";

interface OrdersRequestContext {
  customerId?: string;
  token?: string;
}

interface UpsertOrderPayload extends OrdersRequestContext {
  productId: string;
  quantity: number;
  intervalCount: number;
  existingItem?: Pick<RestockOrder, "createdAt" | "status">;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveToken(token?: string) {
  if (!token) {
    throw new Error("Kein Keycloak-Token fuer Orders-Requests verfuegbar.");
  }

  return token;
}

function resolveOrdersContext({ customerId, token }: OrdersRequestContext) {
  if (!customerId) {
    throw new Error("Keine Customer-ID im Keycloak-Token gefunden.");
  }

  if (!token) {
    throw new Error("Kein Keycloak-Token für Orders-Requests verfügbar.");
  }

  return { customerId, token };
}

function createHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function createSubscription(customerId = ""): Subscription {
  const today = formatDate(new Date());

  return {
    subscriptionId: customerId ? `sub_${customerId}` : `sub_${crypto.randomUUID()}`,
    customerId,
    status: "ACTIVE",
    startDate: today,
    endDate: null,
    items: [],
    createdAt: today,
    updatedAt: today,
  };
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

function normalizeSubscriptionOrder(order: RestockOrder): RestockOrder {
  return {
    ...order,
    quantity: Number.isFinite(order.quantity) && order.quantity > 0 ? order.quantity : 1,
    interval: Number.isFinite(order.interval) && order.interval > 0 ? order.interval : 1,
  };
}

function createSubscriptionFromOrders(
  orders: RestockOrder[],
  customerId: string,
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
    items: customerOrders.map(normalizeSubscriptionOrder),
    createdAt: firstOrder?.createdAt ?? today,
    updatedAt: customerOrders[customerOrders.length - 1]?.updatedAt ?? today,
  };
}

export async function loadSubscription({
  customerId,
  token,
}: OrdersRequestContext): Promise<Subscription> {
  const resolvedToken = resolveToken(token);

  const response = await fetch(ORDERS_API_URL, {
    method: "GET",
    headers: createHeaders(resolvedToken),
  });

  if (!response.ok) {
    throw new Error("RestockOrders konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("RestockOrders haben ein unerwartetes Format.");
  }

  const normalizedOrders = payload.map(normalizeRestockOrder);

  return createSubscriptionFromOrders(
    normalizedOrders,
    customerId ?? normalizedOrders[0]?.customerId ?? "",
  );
}

export async function upsertSubscriptionOrder({
  customerId,
  token,
  productId,
  quantity,
  intervalCount,
  existingItem,
}: UpsertOrderPayload): Promise<RestockOrder> {
  const resolvedContext = resolveOrdersContext({ customerId, token });

  const today = formatDate(new Date());
  const orderPayload: RestockOrder = {
    customerId: resolvedContext.customerId,
    productId,
    status: existingItem?.status ?? "ACTIVE",
    quantity,
    interval: intervalCount,
    createdAt: existingItem?.createdAt ?? today,
    updatedAt: today,
  };

  const response = await fetch(ORDERS_API_URL, {
    method: "POST",
    headers: createHeaders(resolvedContext.token),
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    throw new Error("RestockOrder konnte nicht gespeichert werden.");
  }

  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!responseBody || typeof responseBody !== "object") {
    return orderPayload;
  }

  return normalizeRestockOrder(responseBody);
}
