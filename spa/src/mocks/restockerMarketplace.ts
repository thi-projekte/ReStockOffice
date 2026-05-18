import type { RestockOrder, RestockerCustomerProfile } from "../types/shop";

const predefinedProfiles: Record<string, Omit<RestockerCustomerProfile, "isPlaceholder">> = {
  "100": {
    companyName: "Technische Hochschule Ingolstadt",
    street: "Esplanade 138",
    postalCode: "85049",
    city: "Ingolstadt",
    deliveryTime: "11:00 Uhr",
    deliveryNotes: "Bitte an der Warenannahme anmelden und am Empfang kurz Bescheid geben.",
  },
  "101": {
    companyName: "AUDI AG",
    street: "Auto-Union-Strasse 1",
    postalCode: "85057",
    city: "Ingolstadt",
    deliveryTime: "11:20 Uhr",
    deliveryNotes: "Anlieferung über Tor 3. Sicherheitsfreigabe am Empfang einholen.",
  },
  "102": {
    companyName: "COM-IN Telekommunikations GmbH",
    street: "Mauthstrasse 4",
    postalCode: "85049",
    city: "Ingolstadt",
    deliveryTime: "11:30 Uhr",
    deliveryNotes: "Bitte bei Ankunft den Wareneingang im 1. OG telefonisch informieren.",
  },
  "103": {
    companyName: "AUMOVIO Microelectronic GmbH",
    street: "Ringlerstrasse 7",
    postalCode: "85055",
    city: "Ingolstadt",
    deliveryTime: "12:00 Uhr",
    deliveryNotes: "Lieferung am Seiteneingang abgeben. Zugang über Halle B.",
  },
};

const companyFallbacks = [
  "Bavaria Office Hub",
  "Workspace Solutions GmbH",
  "Danube Digital Campus",
  "Altmuehl Bueroservice",
];

const streetFallbacks = [
  "Musterstrasse 12",
  "Ludwigstrasse 8",
  "Am Nordpark 21",
  "Am Westbahnhof 5",
];

const cityFallbacks = [
  { postalCode: "85049", city: "Ingolstadt" },
  { postalCode: "80331", city: "Muenchen" },
  { postalCode: "86150", city: "Augsburg" },
  { postalCode: "93047", city: "Regensburg" },
];

const timeFallbacks = ["08:30 Uhr", "09:15 Uhr", "10:45 Uhr", "13:30 Uhr"];

const deliveryNoteFallbacks = [
  "Bitte die Lieferung an der Rezeption anmelden.",
  "Warenannahme befindet sich im Innenhof auf der Rueckseite.",
  "Empfang informieren und Lieferung im Besprechungsbereich abstellen.",
  "Bei Rueckfragen bitte den Kontakt vor Ort anrufen.",
];

function hashString(value: string) {
  return value.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

export function getRestockerCustomerProfile(customerId: string): RestockerCustomerProfile {
  const predefinedProfile = predefinedProfiles[customerId];

  if (predefinedProfile) {
    return {
      ...predefinedProfile,
      isPlaceholder: false,
    };
  }

  const hash = hashString(customerId || "restock");
  const cityEntry = cityFallbacks[hash % cityFallbacks.length];

  return {
    companyName: `${companyFallbacks[hash % companyFallbacks.length]} ${customerId}`,
    street: streetFallbacks[hash % streetFallbacks.length],
    postalCode: cityEntry.postalCode,
    city: cityEntry.city,
    deliveryTime: timeFallbacks[hash % timeFallbacks.length],
    deliveryNotes: deliveryNoteFallbacks[hash % deliveryNoteFallbacks.length],
    isPlaceholder: true,
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function createDemoRestockOrders(referenceDate = new Date()): RestockOrder[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return [
    {
      customerId: "100",
      productId: "10001",
      status: "ACTIVE",
      quantity: 2,
      interval: 4,
      createdAt: toIsoDate(addDays(today, -28)),
      updatedAt: toIsoDate(addDays(today, -28)),
    },
    {
      customerId: "100",
      productId: "10003",
      status: "ACTIVE",
      quantity: 1,
      interval: 4,
      createdAt: toIsoDate(addDays(today, -28)),
      updatedAt: toIsoDate(addDays(today, -28)),
    },
    {
      customerId: "101",
      productId: "10004",
      status: "ACTIVE",
      quantity: 4,
      interval: 2,
      createdAt: toIsoDate(addDays(today, -14)),
      updatedAt: toIsoDate(addDays(today, -14)),
    },
    {
      customerId: "102",
      productId: "10005",
      status: "ACTIVE",
      quantity: 6,
      interval: 3,
      createdAt: toIsoDate(addDays(today, -21)),
      updatedAt: toIsoDate(addDays(today, -21)),
    },
    {
      customerId: "103",
      productId: "10006",
      status: "ACTIVE",
      quantity: 3,
      interval: 1,
      createdAt: toIsoDate(addDays(today, -7)),
      updatedAt: toIsoDate(addDays(today, -7)),
    },
  ];
}
