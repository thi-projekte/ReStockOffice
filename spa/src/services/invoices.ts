import invoices from "../mocks/invoices.json";
import keycloak from "../auth/keycloak";
import {useAPIs} from "./products";
import type {UserKind} from "./users";

const INVOICES_API_URL = "https://invoice.restockoffice.de/invoices";
const INVOICE_PDF_API_URL = "https://invoice.restockoffice.de/invoices/download";

export interface InvoiceSummary {
  invoiceId: string;
  issuedAt: string;
  totalAmount: number;
  currency: string;
  monthLabel: string;
  title: string;
}

export interface InvoiceRequestContext {
  token?: string;
  kind?: UserKind;
}

async function resolveToken(token?: string) {
  if (!useAPIs) {
    return "";
  }

  if (token) {
    return token;
  }

  if (!keycloak.authenticated) {
    throw new Error("Kein Keycloak-Token für Rechnungs-Requests verfügbar.");
  }

  try {
    await keycloak.updateToken(30);
  } catch {
    throw new Error("Das Keycloak-Token für Rechnungs-Requests konnte nicht aktualisiert werden.");
  }

  if (!keycloak.token) {
    throw new Error("Kein Keycloak-Token für Rechnungs-Requests verfügbar.");
  }

  return keycloak.token;
}

function createHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function normalizeInvoice(rawInvoice: unknown): InvoiceSummary {
  const source = rawInvoice as Record<string, unknown>;

  // API fields: issueDate, invoiceNumber, grossAmount
  const issuedAt = String(source.issueDate ?? "");
  const issuedDate = new Date(issuedAt);
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(issuedDate);
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return {
    invoiceId: String(source.invoiceNumber ?? ""),
    issuedAt,
    totalAmount: Number(source.grossAmount ?? 0),
    currency: "EUR",
    monthLabel: capitalizedMonthLabel,
    title: `Rechnung ${source.invoiceNumber ?? ""}`,
  };
}

function sortInvoicesDescending(left: InvoiceSummary, right: InvoiceSummary) {
  return new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime();
}

function resolveUserId(): string {
  return keycloak.tokenParsed?.sub ?? "";
}

async function loadInvoicesFromApi(context: InvoiceRequestContext = {}) {
  const token = await resolveToken(context.token);
  const userId = resolveUserId();
  const query = new URLSearchParams({userId});

  let response: Response;

  try {
    response = await fetch(`${INVOICES_API_URL}?${query.toString()}`, {
      headers: createHeaders(token),
    });
  } catch {
    throw new Error("Die Rechnungen konnten nicht geladen werden.");
  }

  if (!response.ok) {
    throw new Error(`Die Rechnungen konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown[];
  return payload.map(normalizeInvoice).sort(sortInvoicesDescending);
}

async function loadInvoicesFromMock() {
  return (invoices as unknown[]).map(normalizeInvoice).sort(sortInvoicesDescending);
}

export async function getInvoices(context: InvoiceRequestContext = {}) {
  if (useAPIs) {
    return loadInvoicesFromApi(context);
  }

  return loadInvoicesFromMock();
}

export async function requestInvoicePdf(
  invoiceId: string,
  context: InvoiceRequestContext = {},
): Promise<void> {
  if (!useAPIs) {
    return;
  }

  const token = await resolveToken(context.token);
  const userId = resolveUserId();
  const query = new URLSearchParams({userId, invoiceNumber: invoiceId});

  const response = await fetch(`${INVOICE_PDF_API_URL}?${query.toString()}`, {
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Die Rechnung konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  // Open PDF in new tab
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}