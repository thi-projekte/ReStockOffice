import keycloak from "../auth/keycloak";
import type { RestockOrder } from "../types/shop";

const USER_API_URL = "https://users.restockoffice.de/user";
const CREATE_USER_API_URL = "https://users.restockoffice.de/user/create";
const UPDATE_USER_API_URL = "https://users.restockoffice.de/user/update";

export interface User {
  userId: string;
  postalCode: string;
  city: string;
  street: string;
  houseNumber: string;
  country: string;
  companyName: string;
  phoneNumber: string;
  roleInCompany?: string;
  birthDate?: string;
  deliveryHint?: string;
  deliveryDay?: string;
  deliveryTime: number;
  iban?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CreateUserPayload = Omit<User, "createdAt" | "updatedAt"> &
  Partial<Pick<User, "createdAt" | "updatedAt">>;

export type UpdateUserPayload = Partial<Omit<User, "userId">> & Pick<User, "userId">;

export interface UserRequestContext {
  token?: string;
}

export interface UserRestockOrdersRequestContext extends UserRequestContext {
  userId: string;
}

function buildUsersNetworkErrorMessage(action: "geladen" | "erstellt" | "gespeichert") {
  return `Die Users-API konnte nicht erreicht werden. Bitte prüfe Netzwerk, CORS oder Proxy-Konfiguration, falls Benutzerdaten nicht ${action} werden konnten.`;
}

async function resolveToken(token?: string) {
  if (token) {
    return token;
  }

  if (!keycloak.authenticated) {
    throw new Error("Kein Keycloak-Token für Benutzer-Requests verfügbar.");
  }

  try {
    await keycloak.updateToken(30);
  } catch {
    throw new Error("Das Keycloak-Token für Benutzer-Requests konnte nicht aktualisiert werden.");
  }

  if (!keycloak.token) {
    throw new Error("Kein Keycloak-Token für Benutzer-Requests verfügbar.");
  }

  return keycloak.token;
}

function createHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value);
}

function normalizeUser(rawUser: unknown): User {
  const payload = rawUser as Record<string, unknown>;
  const source = (
    payload.user && typeof payload.user === "object" ? payload.user : payload
  ) as Record<string, unknown>;

  return {
    userId: String(source.userId ?? source.id ?? source.keycloakId ?? ""),
    postalCode: String(source.postalCode ?? source.zipCode ?? ""),
    city: String(source.city ?? ""),
    street: String(source.street ?? ""),
    houseNumber: String(source.houseNumber ?? ""),
    country: String(source.country ?? ""),
    companyName: String(source.companyName ?? source.company ?? ""),
    phoneNumber: String(source.phoneNumber ?? source.phone ?? ""),
    roleInCompany: optionalString(source.roleInCompany ?? source.role),
    birthDate: optionalString(source.birthDate),
    deliveryHint: optionalString(source.deliveryHint ?? source.deliveryNote),
    deliveryDay: optionalString(source.deliveryDay),
    deliveryTime: Number(source.deliveryTime ?? 0),
    iban: optionalString(source.iban),
    profilePictureUrl: optionalString(source.profilePictureUrl ?? source.profileImageUrl),
    createdAt: String(source.createdAt ?? ""),
    updatedAt: optionalString(source.updatedAt),
  };
}

function normalizeRestockOrder(rawOrder: unknown): RestockOrder {
  const source = rawOrder as Record<string, unknown>;

  return {
    customerId: String(source.customerId ?? source.userId ?? ""),
    productId: String(source.productId ?? ""),
    status: String(source.status ?? "ACTIVE"),
    quantity: Number(source.quantity ?? 1),
    interval: Number(source.interval ?? 1),
    createdAt: String(source.createdAt ?? ""),
    updatedAt: String(source.updatedAt ?? ""),
  };
}

function normalizeUserRestockOrders(payload: unknown): RestockOrder[] {
  const source = payload as Record<string, unknown>;
  const rawOrders = Array.isArray(payload)
    ? payload
    : Array.isArray(source.restockOrders)
      ? source.restockOrders
      : Array.isArray(source.orders)
        ? source.orders
        : [];

  return rawOrders.map(normalizeRestockOrder);
}

async function readJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function assertSuccessfulResponse(response: Response, action: "geladen" | "erstellt" | "gespeichert") {
  if (response.ok) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Die Users-API hat den Request abgelehnt. Bitte prüfe Keycloak-Token, Rollen oder Backend-Auth-Konfiguration.");
  }

  throw new Error(`Benutzerdaten konnten nicht ${action} werden (HTTP ${response.status}).`);
}

async function fetchUserPayload(
  userId: string,
  context: UserRequestContext = {},
): Promise<unknown> {
  const resolvedToken = await resolveToken(context.token);
  let response: Response;

  try {
    response = await fetch(`${USER_API_URL}?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: createHeaders(resolvedToken),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage("geladen"));
  }

  assertSuccessfulResponse(response, "geladen");

  const payload = await readJsonResponse(response);

  if (!payload || typeof payload !== "object") {
    throw new Error("Die Users-API hat ein unerwartetes Antwortformat geliefert.");
  }

  return payload;
}

export async function getUserbyId(
  userId: string,
  context: UserRequestContext = {},
): Promise<User> {
  const payload = await fetchUserPayload(userId, context);

  return normalizeUser(payload);
}

export const getUserById = getUserbyId;

export async function createUser(
  user: CreateUserPayload,
  context: UserRequestContext = {},
): Promise<User> {
  const resolvedToken = await resolveToken(context.token);
  let response: Response;

  try {
    response = await fetch(CREATE_USER_API_URL, {
      method: "POST",
      headers: createHeaders(resolvedToken),
      body: JSON.stringify(user),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage("erstellt"));
  }

  assertSuccessfulResponse(response, "erstellt");

  const payload = await readJsonResponse(response);
  return normalizeUser(payload ?? user);
}

export async function updateUser(
  user: UpdateUserPayload,
  context: UserRequestContext = {},
): Promise<User> {
  const resolvedToken = await resolveToken(context.token);
  let response: Response;

  try {
    response = await fetch(UPDATE_USER_API_URL, {
      method: "POST",
      headers: createHeaders(resolvedToken),
      body: JSON.stringify(user),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage("gespeichert"));
  }

  assertSuccessfulResponse(response, "gespeichert");

  const payload = await readJsonResponse(response);
  return normalizeUser(payload ?? user);
}

export async function getUserRestockOrders({
  userId,
  token,
}: UserRestockOrdersRequestContext): Promise<RestockOrder[]> {
  const payload = await fetchUserPayload(userId, { token });

  return normalizeUserRestockOrders(payload);
}
