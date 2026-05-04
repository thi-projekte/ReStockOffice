import credentials from "../mocks/users.json";
import type { LoginCredentials, LoginFormData } from "../types/shop";

const USERS_API_URL = "";

const mockCredentials = credentials as LoginCredentials[];

async function authenticateAgainstMock(formData: LoginFormData): Promise<LoginCredentials | undefined> {
  return mockCredentials.find(
    (entry) =>
      entry.username === formData.username &&
      entry.password === formData.password,
  );
}

async function authenticateAgainstApi(formData: LoginFormData): Promise<LoginCredentials | undefined> {
  const response = await fetch(USERS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (response.status === 401) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Benutzer konnten nicht authentifiziert werden.");
  }

  return (await response.json()) as LoginCredentials;
}

export async function authenticateUser(formData: LoginFormData): Promise<LoginCredentials | undefined> {
  if (USERS_API_URL) {
    return authenticateAgainstApi(formData);
  }

  return authenticateAgainstMock(formData);
}

export function getUsersApiUrl() {
  return USERS_API_URL;
}
