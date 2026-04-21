import credentials from "../mocks/auth.json";
import type { LoginCredentials, LoginFormData } from "../types/shop";

const mockCredentials = credentials as LoginCredentials[];

export function authenticateUser(formData: LoginFormData) {
  return mockCredentials.find(
    (entry) =>
      entry.username === formData.username &&
      entry.password === formData.password,
  );
}

export function getMockCredentials() {
  return mockCredentials;
}
