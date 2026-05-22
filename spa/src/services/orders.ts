import type { RestockOrder, Subscription } from "../types/shop";
import mockRestockOrderTemplates from "../mocks/restockOrders.json";
import { useAPIs } from "./products";
import keycloak from "../auth/keycloak";


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

function buildOrdersNetworkErrorMessage(action: "geladen" | "gespeichert") {
  return `Die Orders-API konnte nicht erreicht werden. Bitte prüfe Netzwerk, CORS oder Proxy-Konfiguration, falls Orders nicht ${action} werden konnten.`;
}

async function resolveToken(token?: string) {
  console.log("[Orders] resolveToken called, token present:", !!token);

  if (token) {
    console.log("[Orders] Token prefix:", token.slice(0, 20));
    console.log("[Orders] Token length:", token.length);
    return token;
  }

  // Fallback: direkt aus Keycloak holen + refreshen
  if (!keycloak.authenticated) {
    throw new Error("Kein Keycloak-Token für Orders-Requests verfügbar.");
  }

  try {
    await keycloak.updateToken(30);
  } catch {
    throw new Error("Das Keycloak-Token konnte nicht aktualisiert werden.");
  }

  if (!keycloak.token) {
    throw new Error("Kein Keycloak-Token verfügbar.");
  }

  console.log("[Orders] Token prefix:", keycloak.token.slice(0, 50));
  return keycloak.token;
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

const mockRestockOrders: RestockOrder[] = [];

function getMockOrdersForCustomer(customerId: string) {
  const customerOrders = mockRestockOrders.filter((order) => order.customerId === customerId);

  if (customerOrders.length > 0) {
    return mockRestockOrders;
  }

  const seededOrders = mockRestockOrderTemplates.map((order) => ({
    ...order,
    customerId,
  }));

  mockRestockOrders.push(...seededOrders);
  return mockRestockOrders;
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
  if (!customerId) {
    return createSubscription();
  }

  if (!useAPIs) {
    return createSubscriptionFromOrders(getMockOrdersForCustomer(customerId), customerId);
  }

  const resolvedToken = await resolveToken(token);

  let response: Response;

  try {
    response = await fetch(ORDERS_API_URL, {
      method: "GET",
      headers: createHeaders(resolvedToken),
    });
  } catch {
    throw new Error(buildOrdersNetworkErrorMessage("geladen"));
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Orders-API hat den Request abgelehnt.");
    }

    throw new Error(`RestockOrders konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("Die Orders-API hat ein unerwartetes Antwortformat geliefert.");
  }

  const normalizedOrders = payload.map(normalizeRestockOrder);

  return createSubscriptionFromOrders(normalizedOrders, customerId);
}

export async function upsertSubscriptionOrder({
  customerId,
  token,
  productId,
  quantity,
  intervalCount,
  existingItem,
}: UpsertOrderPayload): Promise<{ productId: string; status: string; quantity: number; interval: number }> {
  if (!useAPIs) {
    if (!customerId) {
      throw new Error("Abo kann ohne UserID nicht gespeichert werden.");
    }

    const existingMockOrder = mockRestockOrders.find(
      (order) => order.customerId === customerId && order.productId === productId,
    );
    const updatedAt = formatDate(new Date());
    const mockOrder: RestockOrder = {
      customerId,
      productId,
      status: existingItem?.status ?? existingMockOrder?.status ?? "ACTIVE",
      quantity,
      interval: intervalCount,
      createdAt: existingItem?.createdAt ?? existingMockOrder?.createdAt ?? updatedAt,
      updatedAt,
    };

    if (existingMockOrder) {
      Object.assign(existingMockOrder, mockOrder);
    } else {
      mockRestockOrders.push(mockOrder);
    }

    return mockOrder;
  }

  const resolvedToken = await resolveToken(token);

  const orderPayload = {
    productId,
    status: existingItem?.status ?? "ACTIVE",
    quantity,
    interval: intervalCount,
  };

  let response: Response;

  try {
    response = await fetch(ORDERS_API_URL, {
      method: "POST",
      headers: createHeaders(resolvedToken),
      body: JSON.stringify(orderPayload),
    });
  } catch {
    throw new Error(buildOrdersNetworkErrorMessage("gespeichert"));
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Die Orders-API hat das Speichern abgelehnt. Bitte prüfe Keycloak-Token, Rollen oder Backend-Auth-Konfiguration.");
    }

    throw new Error(`RestockOrder konnte nicht gespeichert werden (HTTP ${response.status}).`);
  }

  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!responseBody || typeof responseBody !== "object") {
    return orderPayload;
  }

  return normalizeRestockOrder(responseBody);
}
