import { createDemoRestockOrders, getRestockerCustomerProfile } from "../mocks/restockerMarketplace";
import type {
  Product,
  RestockMarketplaceAssignment,
  RestockMarketplaceLoadResult,
  RestockMarketplaceOrder,
  RestockMarketplaceOrderItem,
  RestockOrderAssignmentStatus,
  RestockOrder,
  Subscription,
} from "../types/shop";
import {
  loadTodayTours,
  loadTourDetails,
  syncTodayOrders,
  type DeliveryDetail,
} from "./deliveries";
import { getProducts } from "./products";

const ORDERS_API_URL = "https://orders.restockoffice.de/orders";
const TEMPORARY_CUSTOMER_ID = "100";
const RESTOCKER_ASSIGNMENTS_STORAGE_KEY = "restockoffice-restocker-order-assignments-v1";
const RESTOCKER_LOOKAHEAD_DAYS = 28;
const DEMO_OPEN_TODAY_CUSTOMER_ID = "104";
const DEMO_COMPLETED_TODAY_CUSTOMER_ID = "105";

interface OrdersRequestContext {
  customerId?: string;
  token?: string;
}

interface RestockerOrdersRequestContext {
  token?: string;
  restockerName?: string;
}

interface RestockerOrderAssignment {
  orderKey: string;
  restockerId: string;
  acceptedAt: string;
  status: RestockOrderAssignmentStatus;
}

interface UpsertOrderPayload extends OrdersRequestContext {
  productId: string;
  quantity: number;
  intervalCount: number;
  existingItem?: Pick<RestockOrder, "createdAt" | "status">;
}

interface MarketplaceCustomerData {
  companyName: string;
  street: string;
  postalCode: string;
  city: string;
  deliveryTime: string;
  deliveryNotes: string;
  isPlaceholder: boolean;
}

const MISSING_MARKETPLACE_VALUE = "Fehlt noch";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildOrdersNetworkErrorMessage(action: "geladen" | "gespeichert") {
  return `Die Orders-API konnte nicht erreicht werden. Bitte pruefe Netzwerk, CORS oder Proxy-Konfiguration, falls Orders nicht ${action} werden konnten.`;
}

function resolveToken(token?: string) {
  if (!token) {
    throw new Error("Kein Keycloak-Token fuer Orders-Requests verfuegbar.");
  }

  return token;
}

function createHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function resolveCustomerId(customerId?: string) {
  return customerId ?? TEMPORARY_CUSTOMER_ID;
}

function parseIsoDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`);
}

function addDays(dateValue: Date, days: number) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDisplayDate(dateValue: Date) {
  return dateValue.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatIsoDateForDisplay(dateValue?: string | null) {
  if (!dateValue) {
    return formatDisplayDate(new Date());
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? formatDisplayDate(new Date())
    : formatDisplayDate(parsedDate);
}

function createProductLookup(products: Product[]) {
  return products.reduce<Record<string, Product>>((lookup, product) => {
    lookup[String(product.productId)] = product;
    return lookup;
  }, {});
}

function getNextDeliveryDate(order: RestockOrder, today: Date) {
  const initialDeliveryDate = parseIsoDate(order.createdAt);
  initialDeliveryDate.setHours(0, 0, 0, 0);

  const nextDeliveryDate = new Date(initialDeliveryDate);
  const intervalDays = Math.max(1, order.interval) * 7;

  while (nextDeliveryDate < today) {
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + intervalDays);
  }

  return nextDeliveryDate;
}

function buildOrderNumber(customerId: string, deliveryDateKey: string) {
  const hashValue = `${customerId}-${deliveryDateKey}`
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return String(1000 + (hashValue % 9000));
}

function buildQuantityLabel(product: Product | undefined, quantity: number) {
  if (!product) {
    return `${quantity} Einheit${quantity === 1 ? "" : "en"}`;
  }

  const unitCount = Number(product.unitCount);

  if (Number.isFinite(unitCount) && unitCount > 1) {
    return `${quantity} Karton${quantity === 1 ? "" : "s"} a ${product.unitCount} ${product.unit}`;
  }

  return `${quantity} x ${product.unit}`;
}

function normalizeMarketplaceText(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : MISSING_MARKETPLACE_VALUE;
}

function buildStreetLine(detail?: DeliveryDetail) {
  if (!detail) {
    return MISSING_MARKETPLACE_VALUE;
  }

  const streetParts = [detail.street, detail.houseNumber]
    .map((part) => part?.trim())
    .filter(Boolean);

  return streetParts.length > 0
    ? streetParts.join(" ")
    : MISSING_MARKETPLACE_VALUE;
}

async function loadDeliveryDetailsByCustomerId(
  token: string,
  restockerName?: string,
) {
  if (!restockerName?.trim()) {
    return new Map<string, DeliveryDetail>();
  }

  try {
    await syncTodayOrders({ restockerName, token });
    const todaysTours = await loadTodayTours({ restockerName, token });

    if (todaysTours.length === 0) {
      return new Map<string, DeliveryDetail>();
    }

    const deliveryDetailGroups = await Promise.all(
      todaysTours.map((tour) =>
        loadTourDetails({
          tourId: tour.id,
          token,
        }),
      ),
    );

    return deliveryDetailGroups.flat().reduce((lookup, detail) => {
      if (!lookup.has(detail.userId)) {
        lookup.set(detail.userId, detail);
      }

      return lookup;
    }, new Map<string, DeliveryDetail>());
  } catch {
    return new Map<string, DeliveryDetail>();
  }
}

async function loadDeliveryDetailsForRestocker(
  token: string,
  restockerName?: string,
) {
  if (!restockerName?.trim()) {
    return [];
  }

  try {
    await syncTodayOrders({ restockerName, token });
    const todaysTours = await loadTodayTours({ restockerName, token });

    if (todaysTours.length === 0) {
      return [];
    }

    const deliveryDetailGroups = await Promise.all(
      todaysTours.map((tour) =>
        loadTourDetails({
          tourId: tour.id,
          token,
        }),
      ),
    );

    return deliveryDetailGroups.flat();
  } catch {
    return [];
  }
}

function resolveMarketplaceCustomerData({
  customerId,
  deliveryDetail,
  useMockFallback,
}: {
  customerId: string;
  deliveryDetail?: DeliveryDetail;
  useMockFallback: boolean;
}): MarketplaceCustomerData {
  if (deliveryDetail) {
    // The delivery service does not expose a dedicated delivery window yet,
    // so we keep a visible placeholder until the backend provides that field.
    const customerData = {
      companyName: normalizeMarketplaceText(deliveryDetail.companyName),
      street: buildStreetLine(deliveryDetail),
      postalCode: normalizeMarketplaceText(deliveryDetail.postalCode),
      city: normalizeMarketplaceText(deliveryDetail.city),
      deliveryTime: MISSING_MARKETPLACE_VALUE,
      deliveryNotes: normalizeMarketplaceText(deliveryDetail.deliveryHint),
    };

    return {
      ...customerData,
      isPlaceholder: Object.values(customerData).some(
        (value) => value === MISSING_MARKETPLACE_VALUE,
      ),
    };
  }

  if (useMockFallback) {
    const mockProfile = getRestockerCustomerProfile(customerId);
    return {
      companyName: mockProfile.companyName,
      street: mockProfile.street,
      postalCode: mockProfile.postalCode,
      city: mockProfile.city,
      deliveryTime: mockProfile.deliveryTime,
      deliveryNotes: mockProfile.deliveryNotes,
      isPlaceholder: mockProfile.isPlaceholder,
    };
  }

  return {
    companyName: MISSING_MARKETPLACE_VALUE,
    street: MISSING_MARKETPLACE_VALUE,
    postalCode: MISSING_MARKETPLACE_VALUE,
    city: MISSING_MARKETPLACE_VALUE,
    deliveryTime: MISSING_MARKETPLACE_VALUE,
    deliveryNotes: MISSING_MARKETPLACE_VALUE,
    isPlaceholder: true,
  };
}

function deriveMarketplaceOrdersFromDeliveryDetails(
  deliveryDetails: DeliveryDetail[],
): RestockMarketplaceOrder[] {
  return deliveryDetails.map((detail) => {
    // The delivery service currently exposes today's routed stops, not the full
    // open-marketplace model for the next four weeks. We still render these
    // live stops here as a fallback instead of dropping to demo cards.
    const deliveryTime = MISSING_MARKETPLACE_VALUE;
    const deliveryNotes = normalizeMarketplaceText(detail.deliveryHint);
    const items = detail.items.map((item, index) => ({
      position: index + 1,
      articleNumber: item.articleNumber,
      productId: item.articleNumber,
      name: normalizeMarketplaceText(item.name),
      quantity: item.quantity,
      quantityLabel: `${item.quantity} ${normalizeMarketplaceText(item.unit)}`,
      interval: 1,
    }));

    return {
      orderId: detail.orderId,
      orderKey: `delivery__${detail.id}`,
      customerId: detail.userId,
      companyName: normalizeMarketplaceText(detail.companyName),
      addressLine1: buildStreetLine(detail),
      postalCode: normalizeMarketplaceText(detail.postalCode),
      city: normalizeMarketplaceText(detail.city),
      deliveryDate: formatIsoDateForDisplay(detail.deliveryDate),
      // TODO: Replace this placeholder once the delivery service exposes a delivery window.
      deliveryTime,
      deliveryNotes,
      articleCount: detail.items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      isPlaceholderCustomerData:
        deliveryTime === MISSING_MARKETPLACE_VALUE ||
        [detail.companyName, detail.street, detail.postalCode, detail.city].some(
          (value) => !value?.trim(),
        ),
    };
  });
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

function readRestockerAssignments(): RestockerOrderAssignment[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedAssignments = window.localStorage.getItem(
    RESTOCKER_ASSIGNMENTS_STORAGE_KEY,
  );

  if (!storedAssignments) {
    return [];
  }

  try {
    const parsedAssignments = JSON.parse(storedAssignments) as unknown;

    if (!Array.isArray(parsedAssignments)) {
      return [];
    }

    return parsedAssignments.filter((assignment): assignment is RestockerOrderAssignment => {
      if (!assignment || typeof assignment !== "object") {
        return false;
      }

      const source = assignment as Record<string, unknown>;
      const status = source.status;

      return (
        typeof source.orderKey === "string" &&
        typeof source.restockerId === "string" &&
        typeof source.acceptedAt === "string" &&
        (status === undefined ||
          status === "accepted" ||
          status === "in_delivery" ||
          status === "completed")
      );
    }).map((assignment) => ({
      ...assignment,
      status: assignment.status ?? "accepted",
    }));
  } catch {
    return [];
  }
}

function writeRestockerAssignments(assignments: RestockerOrderAssignment[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RESTOCKER_ASSIGNMENTS_STORAGE_KEY,
    JSON.stringify(assignments),
  );
}

function buildDemoTodayOrderKey(customerId: string, referenceDate = new Date()) {
  return `${customerId}__${formatDate(referenceDate)}`;
}

function createDemoAssignedOrders(restockerId: string): RestockerOrderAssignment[] {
  const today = formatDate(new Date());

  return [
    {
      orderKey: buildDemoTodayOrderKey(DEMO_OPEN_TODAY_CUSTOMER_ID),
      restockerId,
      acceptedAt: `${today}T08:15:00.000Z`,
      status: "accepted",
    },
    {
      orderKey: buildDemoTodayOrderKey(DEMO_COMPLETED_TODAY_CUSTOMER_ID),
      restockerId,
      acceptedAt: `${today}T08:45:00.000Z`,
      status: "completed",
    },
  ];
}

function mergeAssignments(
  storedAssignments: RestockerOrderAssignment[],
  demoAssignments: RestockerOrderAssignment[],
) {
  const assignmentsByOrderKey = new Map<string, RestockerOrderAssignment>();

  for (const assignment of demoAssignments) {
    assignmentsByOrderKey.set(assignment.orderKey, assignment);
  }

  for (const assignment of storedAssignments) {
    assignmentsByOrderKey.set(assignment.orderKey, assignment);
  }

  return Array.from(assignmentsByOrderKey.values());
}

function isAssignedDemoOrderKey(orderKey: string) {
  return (
    orderKey === buildDemoTodayOrderKey(DEMO_OPEN_TODAY_CUSTOMER_ID) ||
    orderKey === buildDemoTodayOrderKey(DEMO_COMPLETED_TODAY_CUSTOMER_ID)
  );
}

async function fetchAllOrders(token: string) {
  let response: Response;

  try {
    response = await fetch(ORDERS_API_URL, {
      method: "GET",
      headers: createHeaders(token),
    });
  } catch {
    throw new Error(buildOrdersNetworkErrorMessage("geladen"));
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Die Orders-API hat den Request abgelehnt. Bitte pruefe Keycloak-Token, Rollen oder Backend-Auth-Konfiguration.");
    }

    throw new Error(`RestockOrders konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("Die Orders-API hat ein unerwartetes Antwortformat geliefert.");
  }

  return payload.map(normalizeRestockOrder);
}

function deriveMarketplaceOrders(
  orders: RestockOrder[],
  productsById: Record<string, Product>,
  deliveryDetailsByCustomerId?: Map<string, DeliveryDetail>,
  useMockCustomerFallback = false,
  assignmentsByOrderKey?: Map<string, RestockMarketplaceAssignment>,
): RestockMarketplaceOrder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowEnd = addDays(today, RESTOCKER_LOOKAHEAD_DAYS);
  const groupedOrders = new Map<string, RestockMarketplaceOrder>();

  for (const order of orders) {
    if (order.status.toUpperCase() !== "ACTIVE") {
      continue;
    }

    const nextDeliveryDate = getNextDeliveryDate(order, today);

    if (nextDeliveryDate > windowEnd) {
      continue;
    }

    const deliveryDate = formatDisplayDate(nextDeliveryDate);
    const deliveryDateKey = nextDeliveryDate.toISOString().slice(0, 10);
    const groupKey = `${order.customerId}__${deliveryDateKey}`;
    const customerProfile = resolveMarketplaceCustomerData({
      customerId: order.customerId,
      deliveryDetail: deliveryDetailsByCustomerId?.get(order.customerId),
      useMockFallback: useMockCustomerFallback,
    });
    const product = productsById[order.productId];
    const currentOrder = groupedOrders.get(groupKey);
    const nextItem: RestockMarketplaceOrderItem = {
      position: currentOrder ? currentOrder.items.length + 1 : 1,
      articleNumber: order.productId,
      productId: order.productId,
      name: product?.name ?? `Artikel ${order.productId}`,
      quantity: order.quantity,
      quantityLabel: buildQuantityLabel(product, order.quantity),
      interval: order.interval,
    };

    if (!currentOrder) {
      const assignment = assignmentsByOrderKey?.get(groupKey);

      groupedOrders.set(groupKey, {
        orderId: buildOrderNumber(order.customerId, deliveryDateKey),
        orderKey: groupKey,
        customerId: order.customerId,
        companyName: customerProfile.companyName,
        addressLine1: customerProfile.street,
        postalCode: customerProfile.postalCode,
        city: customerProfile.city,
        deliveryDate,
        deliveryTime: customerProfile.deliveryTime,
        deliveryNotes: customerProfile.deliveryNotes,
        articleCount: order.quantity,
        items: [nextItem],
        isPlaceholderCustomerData: customerProfile.isPlaceholder,
        assignment,
      });
      continue;
    }

    currentOrder.items.push(nextItem);
    currentOrder.articleCount += order.quantity;
    currentOrder.isPlaceholderCustomerData =
      currentOrder.isPlaceholderCustomerData || customerProfile.isPlaceholder;
  }

  return Array.from(groupedOrders.values()).sort((firstOrder, secondOrder) => {
    const firstDate = parseIsoDate(
      firstOrder.deliveryDate.split(".").reverse().join("-"),
    ).getTime();
    const secondDate = parseIsoDate(
      secondOrder.deliveryDate.split(".").reverse().join("-"),
    ).getTime();

    if (firstDate !== secondDate) {
      return firstDate - secondDate;
    }

    return firstOrder.deliveryTime.localeCompare(secondOrder.deliveryTime, "de");
  });
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

export async function loadSubscription({
  customerId,
  token,
}: OrdersRequestContext): Promise<Subscription> {
  const resolvedToken = resolveToken(token);
  const resolvedCustomerId = resolveCustomerId(customerId);
  const normalizedOrders = await fetchAllOrders(resolvedToken);

  return createSubscriptionFromOrders(normalizedOrders, resolvedCustomerId);
}

export async function upsertSubscriptionOrder({
  token,
  productId,
  quantity,
  intervalCount,
  existingItem,
}: UpsertOrderPayload): Promise<{ productId: string; status: string; quantity: number; interval: number }> {
  const resolvedToken = resolveToken(token);

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
      throw new Error("Die Orders-API hat das Speichern abgelehnt. Bitte pruefe Keycloak-Token, Rollen oder Backend-Auth-Konfiguration.");
    }

    throw new Error(`RestockOrder konnte nicht gespeichert werden (HTTP ${response.status}).`);
  }

  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!responseBody || typeof responseBody !== "object") {
    return orderPayload;
  }

  return normalizeRestockOrder(responseBody);
}

export async function loadOpenRestockOrders({
  token,
  restockerName,
}: RestockerOrdersRequestContext): Promise<RestockMarketplaceLoadResult> {
  const resolvedToken = resolveToken(token);
  const assignments = readRestockerAssignments();
  const products = await getProducts().catch(() => []);
  const productsById = createProductLookup(products);

  try {
    const deliveryDetailsByCustomerId = await loadDeliveryDetailsByCustomerId(
      resolvedToken,
      restockerName,
    );
    const orders = await fetchAllOrders(resolvedToken);
    const marketplaceOrders = deriveMarketplaceOrders(
      orders,
      productsById,
      deliveryDetailsByCustomerId,
    ).filter(
      (order) =>
        !assignments.some((assignment) => assignment.orderKey === order.orderKey) &&
        !isAssignedDemoOrderKey(order.orderKey),
    );

    return {
      orders: marketplaceOrders,
      source: "live",
      hasPlaceholderCustomerData: marketplaceOrders.some(
        (order) => order.isPlaceholderCustomerData,
      ),
    };
  } catch {
    const deliveryBackedOrders = deriveMarketplaceOrdersFromDeliveryDetails(
      await loadDeliveryDetailsForRestocker(resolvedToken, restockerName),
    ).filter(
      (order) =>
        !assignments.some((assignment) => assignment.orderKey === order.orderKey) &&
        !isAssignedDemoOrderKey(order.orderKey),
    );

    if (deliveryBackedOrders.length > 0) {
      return {
        orders: deliveryBackedOrders,
        source: "live",
        hasPlaceholderCustomerData: true,
      };
    }

    const demoOrders = deriveMarketplaceOrders(
      createDemoRestockOrders(),
      productsById,
      undefined,
      true,
    ).filter(
      (order) =>
        !assignments.some((assignment) => assignment.orderKey === order.orderKey) &&
        !isAssignedDemoOrderKey(order.orderKey),
    );

    return {
      orders: demoOrders,
      source: "demo",
      hasPlaceholderCustomerData: true,
    };
  }
}

export async function loadAssignedRestockOrders({
  token,
  restockerId,
  restockerName,
}: RestockerOrdersRequestContext & { restockerId: string }): Promise<RestockMarketplaceLoadResult> {
  const resolvedToken = resolveToken(token);
  const assignments = mergeAssignments(
    readRestockerAssignments().filter(
      (assignment) => assignment.restockerId === restockerId,
    ),
    createDemoAssignedOrders(restockerId),
  );
  const assignmentsByOrderKey = new Map(
    assignments.map((assignment) => [
      assignment.orderKey,
      {
        restockerId: assignment.restockerId,
        acceptedAt: assignment.acceptedAt,
        status: assignment.status,
      },
    ]),
  );
  const products = await getProducts().catch(() => []);
  const productsById = createProductLookup(products);

  try {
    const deliveryDetailsByCustomerId = await loadDeliveryDetailsByCustomerId(
      resolvedToken,
      restockerName,
    );
    const orders = await fetchAllOrders(resolvedToken);
    const marketplaceOrders = deriveMarketplaceOrders(
      orders,
      productsById,
      deliveryDetailsByCustomerId,
      false,
      assignmentsByOrderKey,
    ).filter((order) => assignmentsByOrderKey.has(order.orderKey));

    return {
      orders: marketplaceOrders,
      source: "live",
      hasPlaceholderCustomerData: marketplaceOrders.some(
        (order) => order.isPlaceholderCustomerData,
      ),
    };
  } catch {
    const demoOrders = deriveMarketplaceOrders(
      createDemoRestockOrders(),
      productsById,
      undefined,
      true,
      assignmentsByOrderKey,
    ).filter((order) => assignmentsByOrderKey.has(order.orderKey));

    return {
      orders: demoOrders,
      source: "demo",
      hasPlaceholderCustomerData: true,
    };
  }
}

export function acceptRestockOrder({
  orderKey,
  restockerId,
}: {
  orderKey: string;
  restockerId: string;
}) {
  const assignments = readRestockerAssignments();
  const existingAssignment = assignments.find(
    (assignment) => assignment.orderKey === orderKey,
  );

  if (existingAssignment && existingAssignment.restockerId !== restockerId) {
    throw new Error("Dieser Auftrag wurde bereits von einem anderen Restocker übernommen.");
  }

  if (existingAssignment) {
    return;
  }

  assignments.push({
    orderKey,
    restockerId,
    acceptedAt: new Date().toISOString(),
    status: "accepted",
  });

  writeRestockerAssignments(assignments);
}
