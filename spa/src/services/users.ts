import keycloak from "../auth/keycloak";
import mockRestockOrderTemplates from "../mocks/restockOrders.json";
import customerTemplate from "../mocks/customer.json";
import restockerTemplate from "../mocks/restocker.json";
import type { RestockOrder } from "../types/shop";
import { useAPIs } from "./products";

const USERS_API_URL = import.meta.env.VITE_USERS_API_URL ?? "https://users.restockoffice.de";
const CUSTOMER_ME_API_URL = `${USERS_API_URL}/customer/me`;
const RESTOCKER_ME_API_URL = `${USERS_API_URL}/restocker/me`;

export const CUSTOMERS_API_URL = `${USERS_API_URL}/customers`;
export const RESTOCKERS_API_URL = `${USERS_API_URL}/restockers`;

export type UserKind = "customer" | "restocker";

interface BaseUser {
  userId: string;
  postalCode: string;
  city: string;
  street: string;
  houseNumber: string;
  country: string;
  phoneNumber: string;
  birthDate?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerUser extends BaseUser {
  kind: "customer";
  companyName: string;
  roleInCompany?: string;
  deliveryHint?: string;
  deliveryDay?: string;
  deliveryTime: number;
  iban?: string;
}

export interface RestockerUser extends BaseUser {
  kind: "restocker";
  iban: string;
  bic: string;
  accountHolder: string;
}

export type UserProfile = CustomerUser | RestockerUser;
export type User = UserProfile;

type CreatePayloadFor<T extends UserProfile> = Omit<T, "createdAt" | "updatedAt"> &
  Partial<Pick<T, "createdAt" | "updatedAt">>;

type UpdatePayloadFor<T extends UserProfile> = Partial<Omit<T, "userId" | "kind">> &
  Pick<T, "userId" | "kind">;

export type CreateUserPayload =
  | CreatePayloadFor<CustomerUser>
  | CreatePayloadFor<RestockerUser>;

export type UpdateUserPayload =
  | UpdatePayloadFor<CustomerUser>
  | UpdatePayloadFor<RestockerUser>;

export interface UserRequestContext {
  token?: string;
  userId?: string;
  kind?: UserKind;
}

export interface UserRestockOrdersRequestContext extends UserRequestContext {
  userId: string;
}

const LEGACY_MOCK_IMAGE_PREFIX = "../assets/";
const mockAssetModules = import.meta.glob("../assets/**/*.{png,jpg,jpeg,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const mockUsers = new Map<string, UserProfile>();
const mockUserRestockOrders: Record<string, RestockOrder[]> = {};

function buildUsersNetworkErrorMessage(action: "geladen" | "gespeichert") {
  return "Die Users-API konnte nicht erreicht werden.";
}

async function resolveToken(token?: string) {
  if (!useAPIs) {
    return "";
  }

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

function createJsonHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function createAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value);
}

function resolveProfileImageUrl(value: unknown) {
  const imageUrl = optionalString(value);

  if (!imageUrl) {
    return undefined;
  }

  if (imageUrl.startsWith(LEGACY_MOCK_IMAGE_PREFIX)) {
    return mockAssetModules[imageUrl] ?? undefined;
  }

  return imageUrl;
}

function isRestockerRole(value: unknown) {
  return String(value ?? "").toLowerCase() === "restocker";
}

function resolveUserKind(context: UserRequestContext = {}): UserKind {
  if (context.kind) {
    return context.kind;
  }

  const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const clientRoles = Object.values(keycloak.tokenParsed?.resource_access ?? {}).flatMap(
    (entry) => entry.roles ?? [],
  );

  return [...realmRoles, ...clientRoles].some(isRestockerRole) ? "restocker" : "customer";
}

function getMeApiUrl(kind: UserKind) {
  return kind === "restocker" ? RESTOCKER_ME_API_URL : CUSTOMER_ME_API_URL;
}

export function getAdminUsersApiUrl(kind: UserKind, userId?: string) {
  const baseUrl = kind === "restocker" ? RESTOCKERS_API_URL : CUSTOMERS_API_URL;

  if (!userId) {
    return baseUrl;
  }

  return `${baseUrl}?userid=${encodeURIComponent(userId)}`;
}

function normalizeCustomer(rawUser: unknown): CustomerUser {
  const payload = rawUser as Record<string, unknown>;
  const source = (
    payload.customer && typeof payload.customer === "object" ? payload.customer : payload
  ) as Record<string, unknown>;

  return {
    kind: "customer",
    userId: String(source.userId ?? source.id ?? source.keycloakId ?? keycloak.tokenParsed?.sub ?? ""),
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
    iban: optionalString(source.iban ?? source.IBAN),
    profilePictureUrl: resolveProfileImageUrl(source.profilePictureUrl ?? source.profileImageUrl),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: optionalString(source.updatedAt),
  };
}

function normalizeRestocker(rawUser: unknown): RestockerUser {
  const payload = rawUser as Record<string, unknown>;
  const source = (
    payload.restocker && typeof payload.restocker === "object" ? payload.restocker : payload
  ) as Record<string, unknown>;

  return {
    kind: "restocker",
    userId: String(source.userId ?? source.id ?? source.keycloakId ?? keycloak.tokenParsed?.sub ?? ""),
    postalCode: String(source.postalCode ?? source.zipCode ?? ""),
    city: String(source.city ?? ""),
    street: String(source.street ?? ""),
    houseNumber: String(source.houseNumber ?? ""),
    country: String(source.country ?? ""),
    phoneNumber: String(source.phoneNumber ?? source.phone ?? ""),
    iban: String(source.iban ?? source.IBAN ?? ""),
    bic: String(source.bic ?? source.BIC ?? ""),
    accountHolder: String(source.accountHolder ?? ""),
    birthDate: optionalString(source.birthDate),
    profilePictureUrl: resolveProfileImageUrl(source.profilePictureUrl ?? source.profileImageUrl),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: optionalString(source.updatedAt),
  };
}

function normalizeUser(rawUser: unknown, kind: UserKind): UserProfile {
  return kind === "restocker" ? normalizeRestocker(rawUser) : normalizeCustomer(rawUser);
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

function createMockUser(userId: string, kind: UserKind): UserProfile {
  return normalizeUser(
    {
      ...(kind === "restocker" ? restockerTemplate : customerTemplate),
      userId,
    },
    kind,
  );
}

function getMockUser(userId: string, kind: UserKind) {
  const cacheKey = `${kind}:${userId}`;
  let mockUser = mockUsers.get(cacheKey);

  if (!mockUser) {
    mockUser = createMockUser(userId, kind);
    mockUsers.set(cacheKey, mockUser);
  }

  if (kind === "customer" && !mockUserRestockOrders[userId]) {
    mockUserRestockOrders[userId] = mockRestockOrderTemplates.map((order) => ({
      ...order,
      customerId: userId,
    }));
  }

  return mockUser;
}

async function readJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function assertSuccessfulResponse(response: Response, action: "geladen" | "gespeichert") {
  if (response.ok) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Die Users-API hat den Request abgelehnt. Bitte prüfe Keycloak-Token, Rollen oder Backend-Auth-Konfiguration.");
  }

  throw new Error(`Benutzerdaten konnten nicht ${action} werden (HTTP ${response.status}).`);
}

async function fetchCurrentUserPayload(context: UserRequestContext = {}): Promise<{
  payload: unknown;
  kind: UserKind;
}> {
  const kind = resolveUserKind(context);

  if (!useAPIs) {
    const userId = context.userId ?? keycloak.tokenParsed?.sub ?? "mock-user";
    return {
      payload: getMockUser(userId, kind),
      kind,
    };
  }

  const resolvedToken = await resolveToken(context.token);
  let response: Response;

  try {
    response = await fetch(getMeApiUrl(kind), {
      method: "GET",
      headers: createAuthHeaders(resolvedToken),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage("geladen"));
  }

  assertSuccessfulResponse(response, "geladen");

  const payload = await readJsonResponse(response);

  if (!payload || typeof payload !== "object") {
    throw new Error("Die Users-API hat ein unerwartetes Antwortformat geliefert.");
  }

  return { payload, kind };
}

export async function getMyUser(context: UserRequestContext = {}): Promise<UserProfile> {
  const { payload, kind } = await fetchCurrentUserPayload(context);
  return normalizeUser(payload, kind);
}

export async function saveMyUser(
  user: CreateUserPayload | UpdateUserPayload,
  context: UserRequestContext = {},
): Promise<UserProfile> {
  const kind = user.kind ?? resolveUserKind(context);

  if (!useAPIs) {
    const currentUserId = user.userId ?? context.userId ?? keycloak.tokenParsed?.sub ?? "mock-user";
    const existingUser = getMockUser(currentUserId, kind);
    const updatedUser = normalizeUser(
      {
        ...existingUser,
        ...user,
        userId: currentUserId,
        updatedAt: new Date().toISOString(),
      },
      kind,
    );

    mockUsers.set(`${kind}:${currentUserId}`, updatedUser);
    return updatedUser;
  }

  const resolvedToken = await resolveToken(context.token);
  let response: Response;

  try {
    response = await fetch(getMeApiUrl(kind), {
      method: "POST",
      headers: createJsonHeaders(resolvedToken),
      body: JSON.stringify(user),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage("gespeichert"));
  }

  assertSuccessfulResponse(response, "gespeichert");

  const payload = await readJsonResponse(response);
  return normalizeUser(payload ?? user, kind);
}

export async function getUserbyId(
  userId: string,
  context: UserRequestContext = {},
): Promise<UserProfile> {
  if (useAPIs) {
    return getMyUser(context);
  }

  const kind = resolveUserKind(context);
  return getMockUser(userId, kind);
}

export const getUserById = getUserbyId;
export const createUser = saveMyUser;
export const updateUser = saveMyUser;

export async function getUserRestockOrders({
  userId,
  token,
  kind,
}: UserRestockOrdersRequestContext): Promise<RestockOrder[]> {
  if (!useAPIs) {
    getMockUser(userId, "customer");
    return mockUserRestockOrders[userId] ?? [];
  }

  const resolvedKind = kind ?? "customer";
  const { payload } = await fetchCurrentUserPayload({ token, userId, kind: resolvedKind });

  return normalizeUserRestockOrders(payload);
}


// Lädt Infos vom belieferte Kunden
export async function loadCustomerProfile({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<CustomerUser> {
  const response = await fetch(
      `${USERS_API_URL}/customerForRestocker?userId=${userId}`,
      {
        method: "GET",
        headers: createAuthHeaders(token),
      },
  );

  if (!response.ok) {
    throw new Error("Customer konnte nicht geladen werden");
  }

  return normalizeCustomer(await response.json());
}
