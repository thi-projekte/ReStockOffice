import keycloak from "../auth/keycloak";
import mockRestockOrderTemplates from "../mocks/restockOrders.json";
import customerTemplate from "../mocks/customer.json";
import restockerTemplate from "../mocks/restocker.json";
import type {RestockOrder} from "../types/shop";
import {useAPIs} from "./products";
import {keycloakConfig} from "../auth/keycloakConfig";

const USERS_API_URL = import.meta.env.VITE_USERS_API_URL ?? "https://users.restockoffice.de";
const CUSTOMER_ME_API_URL = `${USERS_API_URL}/customer/me`;
const RESTOCKER_ME_API_URL = `${USERS_API_URL}/restocker/me`;
const CUSTOMER_CREATE_API_URL = `${USERS_API_URL}/customer/create`;
const RESTOCKER_CREATE_API_URL = `${USERS_API_URL}/restocker/create`;
const CUSTOMER_UPDATE_API_URL = `${USERS_API_URL}/customer/update`;
const RESTOCKER_UPDATE_API_URL = `${USERS_API_URL}/restocker/update`;

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
  existsInUserService?: boolean;
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

export type SaveUserPayload = (CreateUserPayload | UpdateUserPayload) & {
  profilePictureFile?: File;
};

export interface UserRequestContext {
  token?: string;
  userId?: string;
  kind?: UserKind;
}

export interface UserRestockOrdersRequestContext extends UserRequestContext {
  userId: string;
}

const mockUsers = new Map<string, UserProfile>();
const mockUserRestockOrders: Record<string, RestockOrder[]> = {};
const PROFILE_IMAGE_BASE_URL = "https://hel1.your-objectstorage.com/restockoffice/users";

function buildUsersNetworkErrorMessage(): string {
  return "Die Users-API konnte nicht erreicht werden.";
}

class UserProfileNotFoundError extends Error {
  constructor() {
    super("Für diesen Keycloak-Nutzer existiert noch kein Profil im User-Service.");
  }
}

async function resolveToken(token?: string): Promise<string> {
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

function createJsonHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function stringifyUserValue(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value.toString();
  }

  return fallback;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const stringValue = stringifyUserValue(value, "");
  return stringValue || undefined;
}

function parseDeliveryTimeHour(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const stringValue = stringifyUserValue(value, "").trim();
  if (!stringValue) {
    return 0;
  }

  const hour = Number(stringValue.split(":")[0]);
  return Number.isFinite(hour) ? hour : 0;
}

function buildProfileImageUrl(): string | undefined {
  const normalizedUserId = stringifyUserValue(keycloak.tokenParsed?.sub, "").trim();

  if (!normalizedUserId) {
    return undefined;
  }

  return `${PROFILE_IMAGE_BASE_URL}/${encodeURIComponent(normalizedUserId)}.jpg`;
}

function collectKeycloakRoles(): string[] {
  const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const clientRoles =
    keycloak.tokenParsed?.resource_access?.[keycloakConfig.clientId]?.roles ?? [];

  return [...realmRoles, ...clientRoles];
}

function resolveKeycloakUserKind(): UserKind | undefined {
  const roles = collectKeycloakRoles();
  const hasRestockerRole = roles.some(
    (role) => role.trim().toLowerCase() === "restocker"
  );

  if (hasRestockerRole) {
    return "restocker";
  }

  if (keycloak.authenticated || roles.length > 0) {
    return "customer";
  }

  return undefined;
}

function resolveUserKind(
  context: UserRequestContext = {},
  fallbackKind?: UserKind,
): UserKind {
  if (context.kind) {
    return context.kind;
  }

  return resolveKeycloakUserKind() ?? fallbackKind ?? "customer";
}

function getMeApiUrl(kind: UserKind): string {
  return kind === "restocker" ? RESTOCKER_ME_API_URL : CUSTOMER_ME_API_URL;
}

function getCreateApiUrl(kind: UserKind): string {
  return kind === "restocker" ? RESTOCKER_CREATE_API_URL : CUSTOMER_CREATE_API_URL;
}

function getUpdateApiUrl(kind: UserKind): string {
  return kind === "restocker" ? RESTOCKER_UPDATE_API_URL : CUSTOMER_UPDATE_API_URL;
}

export function getAdminUsersApiUrl(kind: UserKind, userId?: string): string {
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
  const userId = stringifyUserValue(source.userId ?? source.id ?? source.keycloakId ?? keycloak.tokenParsed?.sub, "");

  return {
    kind: "customer",
    userId,
    postalCode: stringifyUserValue(source.postalCode ?? source.zipCode, ""),
    city: stringifyUserValue(source.city, ""),
    street: stringifyUserValue(source.street, ""),
    houseNumber: stringifyUserValue(source.houseNumber, ""),
    country: stringifyUserValue(source.country, ""),
    companyName: stringifyUserValue(source.companyName ?? source.company, ""),
    phoneNumber: stringifyUserValue(source.phoneNumber ?? source.phone, ""),
    roleInCompany: optionalString(source.roleInCompany ?? source.role),
    birthDate: optionalString(source.birthDate),
    deliveryHint: optionalString(source.deliveryHint ?? source.deliveryNote),
    deliveryDay: optionalString(source.deliveryDay),
    deliveryTime: parseDeliveryTimeHour(source.deliveryTime),
    iban: optionalString(source.iban ?? source.IBAN),
    profilePictureUrl: buildProfileImageUrl(),
    createdAt: stringifyUserValue(source.createdAt, new Date().toISOString()),
    updatedAt: optionalString(source.updatedAt),
    existsInUserService: source.existsInUserService !== false,
  };
}

function normalizeRestocker(rawUser: unknown): RestockerUser {
  const payload = rawUser as Record<string, unknown>;
  const source = (
    payload.restocker && typeof payload.restocker === "object" ? payload.restocker : payload
  ) as Record<string, unknown>;
  const userId = stringifyUserValue(source.userId ?? source.id ?? source.keycloakId ?? keycloak.tokenParsed?.sub, "");

  return {
    kind: "restocker",
    userId,
    postalCode: stringifyUserValue(source.postalCode ?? source.zipCode, ""),
    city: stringifyUserValue(source.city, ""),
    street: stringifyUserValue(source.street, ""),
    houseNumber: stringifyUserValue(source.houseNumber, ""),
    country: stringifyUserValue(source.country, ""),
    phoneNumber: stringifyUserValue(source.phoneNumber ?? source.phone, ""),
    iban: stringifyUserValue(source.iban ?? source.IBAN, ""),
    bic: stringifyUserValue(source.bic ?? source.BIC, ""),
    accountHolder: stringifyUserValue(source.accountHolder, ""),
    birthDate: optionalString(source.birthDate),
    profilePictureUrl: buildProfileImageUrl(),
    createdAt: stringifyUserValue(source.createdAt, new Date().toISOString()),
    updatedAt: optionalString(source.updatedAt),
    existsInUserService: source.existsInUserService !== false,
  };
}

function normalizeUser(rawUser: unknown, kind: UserKind): UserProfile {
  return kind === "restocker" ? normalizeRestocker(rawUser) : normalizeCustomer(rawUser);
}

function normalizeRestockOrder(rawOrder: unknown): RestockOrder {
  const source = rawOrder as Record<string, unknown>;

  return {
    customerId: stringifyUserValue(source.customerId ?? source.userId, ""),
    productId: stringifyUserValue(source.productId, ""),
    status: stringifyUserValue(source.status, "ACTIVE"),
    quantity: Number(source.quantity ?? 1),
    interval: Number(source.interval ?? 1),
    createdAt: stringifyUserValue(source.createdAt, ""),
    updatedAt: stringifyUserValue(source.updatedAt, ""),
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

function createEmptyUserProfile(kind: UserKind): UserProfile {
  return normalizeUser(
    {
      userId: keycloak.tokenParsed?.sub ?? "",
      postalCode: "",
      city: "",
      street: "",
      houseNumber: "",
      country: "",
      companyName: "",
      phoneNumber: "",
      roleInCompany: "",
      birthDate: "",
      deliveryHint: "",
      deliveryDay: "",
      deliveryTime: 0,
      iban: "",
      bic: "",
      accountHolder: "",
      createdAt: "",
      existsInUserService: false,
    },
    kind,
  );
}

function getMockUser(userId: string, kind: UserKind): UserProfile {
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

async function readJsonResponse(response: Response): Promise<unknown> {
  return (await response.json().catch(() => null)) as unknown;
}

function assertSuccessfulResponse(response: Response, action: "geladen" | "gespeichert"): void {
  if (response.ok) {
    return;
  }

  if (response.status === 404 && action === "geladen") {
    throw new UserProfileNotFoundError();
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
    throw new Error(buildUsersNetworkErrorMessage());
  }

  assertSuccessfulResponse(response, "geladen");

  const payload = await readJsonResponse(response);

  if (!payload || typeof payload !== "object") {
    throw new Error("Die Users-API hat ein unerwartetes Antwortformat geliefert.");
  }

  return {payload, kind};
}

export async function getMyUser(context: UserRequestContext = {}): Promise<UserProfile> {
  try {
    const {payload, kind} = await fetchCurrentUserPayload(context);
    return normalizeUser(payload, kind);
  } catch (error) {
    if (error instanceof UserProfileNotFoundError) {
      return createEmptyUserProfile(resolveUserKind(context));
    }

    throw error;
  }
}

function createUserData(user: SaveUserPayload, isCreateRequest: boolean): Record<string, unknown> {
  const userData = {...user} as Record<string, unknown>;
  const iban = userData.iban ?? userData.IBAN;
  const bic = userData.bic ?? userData.BIC;
  const hasIban = Object.prototype.hasOwnProperty.call(userData, "iban")
    || Object.prototype.hasOwnProperty.call(userData, "IBAN");
  const hasBic = Object.prototype.hasOwnProperty.call(userData, "bic")
    || Object.prototype.hasOwnProperty.call(userData, "BIC");

  if (hasIban) {
    userData.iban = stringifyUserValue(iban, "");
  }
  delete userData.IBAN;

  if (hasBic) {
    userData.bic = stringifyUserValue(bic, "");
  }
  delete userData.BIC;

  delete userData.kind;
  delete userData.profilePictureFile;
  delete userData.existsInUserService;
  delete userData.createdAt;
  delete userData.updatedAt;

  if (isCreateRequest) {
    delete userData.userId;
    delete userData.profilePictureUrl;
  }

  return userData;
}

function createMultipartUserBody(user: SaveUserPayload): FormData {
  const formData = new FormData();
  formData.append(
    "userData",
    new Blob([JSON.stringify(createUserData(user, false))], {
      type: "application/json",
    }),
  );

  if (user.profilePictureFile) {
    formData.append("file", user.profilePictureFile);
  }

  return formData;
}

export async function saveMyUser(
  user: SaveUserPayload,
  context: UserRequestContext = {},
): Promise<UserProfile> {
  const kind = resolveUserKind(context, user.kind);
  const isCreateRequest = user.existsInUserService === false;

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
    response = await fetch(isCreateRequest ? getCreateApiUrl(kind) : getUpdateApiUrl(kind), {
      method: "POST",
      headers: isCreateRequest ? createJsonHeaders(resolvedToken) : createAuthHeaders(resolvedToken),
      body: isCreateRequest
        ? JSON.stringify(createUserData(user, true))
        : createMultipartUserBody(user),
    });
  } catch {
    throw new Error(buildUsersNetworkErrorMessage());
  }

  assertSuccessfulResponse(response, "gespeichert");

  const payload = await readJsonResponse(response);
  return normalizeUser(payload ?? {...user, existsInUserService: true}, kind);
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
  const {payload} = await fetchCurrentUserPayload({token, userId, kind: resolvedKind});

  return normalizeUserRestockOrders(payload);
}

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
