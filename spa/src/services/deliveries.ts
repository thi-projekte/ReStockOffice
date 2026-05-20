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
  stopOrder: number;
  collected: boolean;
  collectedAt: string | null;
  deliveredAt: string | null;
  companyName: string;
  street: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  phoneNumber: string;
  contactPerson: string;
  deliveryHint: string;
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

function resolveToken(token?: string) {
  if (!token) {
    throw new Error("Kein Keycloak-Token fuer Lieferungen verfuegbar.");
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
      `Die Delivery-API konnte nicht erreicht werden: ${url}. Bitte pruefe, ob der Deliveries-Service laeuft und ob CORS/HTTPS fuer die SPA-Origin erlaubt ist.`,
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
      `Die Delivery-API konnte nicht erreicht werden: ${url}. Bitte pruefe, ob der Deliveries-Service laeuft und ob CORS/HTTPS fuer die SPA-Origin erlaubt ist.`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return parseJsonResponse<Tour>(response, "Heutige Orders konnten nicht synchronisiert werden");
}

export async function loadTourDetails({
  tourId,
  token,
}: {
  tourId: string;
  token?: string;
}) {
  const resolvedToken = resolveToken(token);

  return requestJson<DeliveryDetail[]>(
    `${DELIVERIES_API_URL}/tours/${tourId}/details`,
    {
      method: "GET",
      headers: createHeaders(resolvedToken),
    },
    "Tourdetails konnten nicht geladen werden",
  );
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
    "Zustellung konnte nicht bestaetigt werden",
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
