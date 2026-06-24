import { isValidIBAN, isValidBIC, electronicFormatIBAN } from "ibantools";
import { isValidPhoneNumber } from "libphonenumber-js";

// ── Telefon ──────────────────────────────────────────────────────────────────
export function validatePhone(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    // Versuche mit DE als Fallback-Land
    const cleaned = value.startsWith("+") ? value : `+49${value.replace(/^0/, "")}`;
    if (!isValidPhoneNumber(cleaned)) {
      return "Ungültige Telefonnummer";
    }
    return null;
  } catch {
    return "Ungültige Telefonnummer";
  }
}

export function formatPhone(value: string): string {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 20);
}

// ── PLZ ──────────────────────────────────────────────────────────────────────
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  Deutschland: /^\d{5}$/,
  Österreich: /^\d{4}$/,
  Schweiz: /^\d{4}$/,
};

export function validatePostalCode(value: string, country: string): string | null {
  const pattern = POSTAL_CODE_PATTERNS[country];
  if (!pattern) {
    return null;
  }

  if (!pattern.test(value)) {
    const len = country === "Deutschland" ? "5" : "4";
    return `PLZ muss ${len} Ziffern haben`;
  }
  return null;
}

// ── IBAN ─────────────────────────────────────────────────────────────────────
export function validateIBAN(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const formatted = electronicFormatIBAN(value);
  if (!formatted || !isValidIBAN(formatted)) {
    return "Ungültige IBAN";
  }
  return null;
}

export function formatIBAN(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
}

// ── BIC ──────────────────────────────────────────────────────────────────────
export function validateBIC(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  if (!isValidBIC(value)) {
    return "Ungültiger BIC/SWIFT-Code";
  }
  return null;
}

export function formatBIC(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

// ── Lieferzeit ───────────────────────────────────────────────────────────────
export function validateDeliveryTime(value: string): string | null {
  if (!value) {
    return null;
  }

  const [h, m] = value.split(":").map(Number);
  const minutes = h * 60 + (m ?? 0);
  if (minutes < 7 * 60 || minutes > 18 * 60) {
    return "Lieferzeit: 07:00 - 18:00";
  }
  return null;
}

// ── Alle Fehler auf einmal berechnen ─────────────────────────────────────────
export interface ProfileFormState {
  phone: string;
  birthDate: string;
  role: string;
  company: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  note: string;
  deliveryDay: string;
  deliveryTime: string;
  iban: string;
  bic: string;
  accountHolder: string;
}

export type FormErrors = Partial<Record<keyof ProfileFormState, string>>;

export function computeErrors(form: ProfileFormState): FormErrors {
  const errors: FormErrors = {};

  const phoneErr = validatePhone(form.phone);
  if (phoneErr) {
    errors.phone = phoneErr;
  }

  const ibanErr = validateIBAN(form.iban);
  if (ibanErr) {
    errors.iban = ibanErr;
  }

  const bicErr = validateBIC(form.bic);
  if (bicErr) {
    errors.bic = bicErr;
  }

  const postalErr = validatePostalCode(form.postalCode, form.country);
  if (postalErr) {
    errors.postalCode = postalErr;
  }

  const timeErr = validateDeliveryTime(form.deliveryTime);
  if (timeErr) {
    errors.deliveryTime = timeErr;
  }

  if (form.note.length > 300) {
    errors.note = "Maximal 300 Zeichen";
  }

  return errors;
}
