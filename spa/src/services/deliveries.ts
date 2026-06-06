const DELIVERIES_API_URL =
  import.meta.env.VITE_DELIVERIES_API_URL ??
  "https://restocker-deliveries.restockoffice.de/api/deliveries";

export interface DeliveryItemDetail {
  id: string;
  articleNumber: string;
  name: string;
  quantity: number;
  unit: string;
  delivered: boolean;
}

export interface DeliveryDetail {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  stopOrder: number;
  collected: boolean;
  collectedAt: string | null;
  acceptedAt: string | null;
  deliveredAt: string | null;
  restockerName?: string | null;
  recipientEmail: string;
  companyName: string;
  street: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  country: string;
  phoneNumber: string;
  contactPerson: string;
  deliveryHint: string;
  deliveryDay: string;
  deliveryTime: number | string | null;
  deliveryDate: string | null;
  items: DeliveryItemDetail[];
}

export interface Tour {
  id: string;
  restockerName: string;
  startTime: string | null;
  endTime: string | null;
  earnings: number;
  tourDate: string;
  deliveries?: Array<{
    id: string;
    collected: boolean;
    deliveredAt: string | null;
    stopOrder: number;
  }>;
}

export interface DeliveryOverviewEntry {
  id: string;
  deliveryDate: string;
  status: string;
}

export interface CustomerDeliveryOverview {
  lastDelivery: DeliveryOverviewEntry | null;
  nextDelivery: DeliveryOverviewEntry | null;
}

function stringifyPrimitive(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "";
}

function readStringValue(value: unknown) {
  return stringifyPrimitive(value).trim();
}

function readBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

function readString(
  source: Record<string, unknown> | undefined,
  keys: string[],
) {
  if (!source) {
    return "";
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        return trimmedValue;
      }
    }
  }

  return "";
}

function readNumber(
  source: Record<string, unknown> | undefined,
  keys: string[],
): number | string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        return trimmedValue;
      }
    }
  }

  return null;
}

function normalizeDeliveryItem(rawItem: unknown): DeliveryItemDetail {
  const item = rawItem as Record<string, unknown>;

  return {
    id: readStringValue(item.id),
    articleNumber: readStringValue(item.articleNumber) || readStringValue(item.productId),
    name: readStringValue(item.name),
    quantity:
      typeof item.quantity === "number" && Number.isFinite(item.quantity)
        ? item.quantity
        : Number(item.quantity ?? 0),
    unit: readStringValue(item.unit),
    delivered: readBooleanValue(item.delivered),
  };
}

function normalizeDeliveryDetail(rawDetail: unknown): DeliveryDetail {
  const detail = rawDetail as Record<string, unknown>;
  const customer = (
    detail.customer ??
    detail.customerData ??
    detail.customerProfile ??
    detail.user
  ) as Record<string, unknown> | undefined;

  return {
    id: readStringValue(detail.id),
    orderId: readStringValue(detail.orderId),
    userId: readStringValue(detail.userId) || readStringValue(detail.customerId),
    status: readStringValue(detail.status) || deriveDeliveryStatus(detail),
    stopOrder:
      typeof detail.stopOrder === "number" && Number.isFinite(detail.stopOrder)
        ? detail.stopOrder
        : Number(detail.stopOrder ?? 0),
    collected: readBooleanValue(detail.collected),
    collectedAt:
      typeof detail.collectedAt === "string" ? detail.collectedAt : null,
    acceptedAt:
      typeof detail.acceptedAt === "string" ? detail.acceptedAt : null,
    deliveredAt:
      typeof detail.deliveredAt === "string" ? detail.deliveredAt : null,
    restockerName:
      typeof detail.restockerName === "string" ? detail.restockerName : null,
    recipientEmail: readString(detail, ["recipientEmail", "customerEmail", "email"]) ||
      readString(customer, ["recipientEmail", "customerEmail", "email"]),
    companyName: readString(detail, ["companyName", "customerName", "name"]) ||
      readString(customer, ["companyName", "customerName", "name"]),
    street: readString(detail, ["street", "addressLine1"]) ||
      readString(customer, ["street", "addressLine1"]),
    houseNumber: readString(detail, ["houseNumber"]) ||
      readString(customer, ["houseNumber"]),
    postalCode: readString(detail, ["postalCode", "zipCode"]) ||
      readString(customer, ["postalCode", "zipCode"]),
    city: readString(detail, ["city"]) ||
      readString(customer, ["city"]),
    country: readString(detail, ["country"]) ||
      readString(customer, ["country"]),
    phoneNumber: readString(detail, ["phoneNumber", "phone"]) ||
      readString(customer, ["phoneNumber", "phone"]),
    contactPerson: readString(detail, ["contactPerson", "roleInCompany"]) ||
      readString(customer, ["contactPerson", "roleInCompany"]),
    deliveryHint: readString(detail, ["deliveryHint", "deliveryNotes", "notes"]) ||
      readString(customer, ["deliveryHint", "deliveryNotes", "notes"]),
    deliveryDay: readString(detail, ["deliveryDay"]) ||
      readString(customer, ["deliveryDay"]),
    deliveryTime:
      readNumber(detail, ["deliveryTime"]) ??
      readNumber(customer, ["deliveryTime"]),
    deliveryDate: typeof detail.deliveryDate === "string" ? detail.deliveryDate : null,
    items: Array.isArray(detail.items) ? detail.items.map(normalizeDeliveryItem) : [],
  };
}

function deriveDeliveryStatus(detail: Record<string, unknown>) {
  if (typeof detail.deliveredAt === "string" && detail.deliveredAt) {
    return "DELIVERED";
  }

  if (readBooleanValue(detail.collected)) {
    return "COLLECTED";
  }

  if (
    (typeof detail.acceptedAt === "string" && detail.acceptedAt) ||
    (typeof detail.restockerName === "string" && detail.restockerName)
  ) {
    return "ACCEPTED";
  }

  return "OPEN";
}

function resolveToken(token?: string) {
  if (!token) {
    throw new Error("Kein Keycloak-Token für Lieferungen verfügbar.");
  }

  return token;
}

function createHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    if (responseText) {
      try {
        const parsedError = JSON.parse(responseText) as {
          details?: string;
          message?: string;
          error?: string;
        };
        const normalizedMessage =
          parsedError.details || parsedError.message || parsedError.error;
        if (normalizedMessage) {
          throw new Error(normalizedMessage);
        }
      } catch (parseError) {
        if (parseError instanceof Error) {
          throw parseError;
        }
      }
    }

    throw new Error(responseText || `${fallbackMessage} (HTTP ${response.status}).`);
  }

  return (await response.json()) as T;
}

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      `Die Delivery-API konnte nicht erreicht werden: ${url}. Bitte prüfe, ob der Deliveries-Service läuft und ob CORS/HTTPS für die SPA-Origin erlaubt ist.`,
    );
  }

  return parseJsonResponse<T>(response, fallbackMessage);
}

export async function loadTodayTours({
  restockerName,
  token,
}: {
  restockerName: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);
  const query = new URLSearchParams({ restocker: restockerName });

  const url = `${DELIVERIES_API_URL}/tours/today?${query.toString()}`;

  return requestJson<Tour[]>(
    url,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Heutige Touren konnten nicht geladen werden",
  );
}

export async function syncTodayOrders({
  restockerName,
  token,
}: {
  restockerName: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);
  const query = new URLSearchParams({ restocker: restockerName });
  const url = `${DELIVERIES_API_URL}/tours/today/sync?${query.toString()}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: createHeaders(resolvedToken),
    });
  } catch {
    throw new Error(
      `Die Delivery-API konnte nicht erreicht werden: ${url}. Bitte prüfe, ob der Deliveries-Service läuft und ob CORS/HTTPS für die SPA-Origin erlaubt ist.`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return parseJsonResponse<Tour>(response, "Heutige Orders konnten nicht synchronisiert werden");
}

export async function loadOpenDeliveries({
  token,
}: {
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  const rawDetails = await requestJson<unknown[]>(
    `${DELIVERIES_API_URL}/open`,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Offene Lieferungen konnten nicht geladen werden",
  );

  return Array.isArray(rawDetails) ? rawDetails.map(normalizeDeliveryDetail) : [];
}

export async function loadAllDeliveries({
  token,
}: {
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  const rawDetails = await requestJson<unknown[]>(
    `${DELIVERIES_API_URL}/admin/all-deliveries`,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Alle Lieferungen konnten nicht geladen werden",
  );

  return Array.isArray(rawDetails) ? rawDetails.map(normalizeDeliveryDetail) : [];
}

export async function loadAssignedDeliveries({
  restockerName,
  token,
}: {
  restockerName: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);
  const query = new URLSearchParams({ restocker: restockerName });

  const rawDetails = await requestJson<unknown[]>(
    `${DELIVERIES_API_URL}/assigned?${query.toString()}`,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Angenommene Lieferungen konnten nicht geladen werden",
  );

  return Array.isArray(rawDetails) ? rawDetails.map(normalizeDeliveryDetail) : [];
}

export async function acceptDelivery({
  deliveryId,
  restockerName,
  token,
}: {
  deliveryId: string;
  restockerName: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);
  const query = new URLSearchParams({ restocker: restockerName });

  const rawDetail = await requestJson<unknown>(
    `${DELIVERIES_API_URL}/${deliveryId}/accept?${query.toString()}`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
    },
    "Lieferung konnte nicht angenommen werden",
  );

  return normalizeDeliveryDetail(rawDetail);
}

export async function loadTourDetails({
  tourId,
  token,
}: {
  tourId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  const rawDetails = await requestJson<unknown[]>(
    `${DELIVERIES_API_URL}/tours/${tourId}/details`,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Tourdetails konnten nicht geladen werden",
  );

  return Array.isArray(rawDetails) ? rawDetails.map(normalizeDeliveryDetail) : [];
}

export async function collectDelivery({
  deliveryId,
  token,
}: {
  deliveryId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson(
    `${DELIVERIES_API_URL}/${deliveryId}/collect`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
    },
    "Paket konnte nicht eingesammelt werden",
  );
}

export async function markDeliveryItemDelivered({
  deliveryId,
  itemId,
  token,
}: {
  deliveryId: string;
  itemId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson(
    `${DELIVERIES_API_URL}/${deliveryId}/items/${itemId}/delivered`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
    },
    "Artikel konnte nicht abgehakt werden",
  );
}

export async function confirmDelivery({
  deliveryId,
  token,
}: {
  deliveryId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson(
    `${DELIVERIES_API_URL}/${deliveryId}/confirm`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
    },
    "Zustellung konnte nicht bestätigt werden",
  );
}

export async function startTour({
  tourId,
  token,
}: {
  tourId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson<Tour>(
    `${DELIVERIES_API_URL}/tours/${tourId}/start`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
    },
    "Tour konnte nicht gestartet werden",
  );
}

export async function endTour({
  tourId,
  earnings,
  token,
}: {
  tourId: string;
  earnings: number;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson<Tour>(
    `${DELIVERIES_API_URL}/tours/${tourId}/end`,
    {
      method: "POST",
      headers: createHeaders(resolvedToken),
      body: JSON.stringify({ earnings }),
    },
    "Tour konnte nicht beendet werden",
  );
}

export async function loadCustomerDeliveryOverview({
   customerId,
   token,
 }: {
  customerId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  const url = `${DELIVERIES_API_URL}/customers/${customerId}/delivery-overview`;

  return await requestJson<CustomerDeliveryOverview>(
      url,
      {
        method: "GET",
        headers: createHeaders(resolvedToken),
      },
      "Lieferübersicht konnte nicht geladen werden",
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
