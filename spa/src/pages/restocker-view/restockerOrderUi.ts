import type { RestockMarketplaceOrder } from "../../types/shop";

export type SortOption = "delivery-desc" | "delivery-asc" | "company-asc";
export type DeliveryWindowOption = "week-1" | "week-2" | "week-3" | "week-4";
export type RelativeDayOption = "today" | "tomorrow";

export function parseDisplayDate(dateValue: string) {
  const [day, month, year] = dateValue.split(".");
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

export function getDaysUntilDelivery(dateValue: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deliveryDate = parseDisplayDate(dateValue);
  deliveryDate.setHours(0, 0, 0, 0);

  return Math.round((deliveryDate.getTime() - today.getTime()) / 86400000);
}

export function formatRelativeDelivery(dateValue: string) {
  const daysUntilDelivery = getDaysUntilDelivery(dateValue);

  if (daysUntilDelivery === 0) {
    return "heute";
  }

  if (daysUntilDelivery === 1) {
    return "morgen";
  }

  if (daysUntilDelivery > 1) {
    return `in ${daysUntilDelivery} Tagen`;
  }

  if (daysUntilDelivery === -1) {
    return "gestern";
  }

  return `vor ${Math.abs(daysUntilDelivery)} Tagen`;
}

export function formatDeliveryEta(dateValue: string) {
  const relativeDelivery = formatRelativeDelivery(dateValue);

  if (relativeDelivery === "heute") {
    return "Auslieferung heute";
  }

  if (relativeDelivery === "morgen") {
    return "Auslieferung morgen";
  }

  return `Auslieferung ${relativeDelivery}`;
}

export function formatDeliveryBanner(dateValue: string) {
  const daysUntilDelivery = getDaysUntilDelivery(dateValue);

  if (daysUntilDelivery === 0) {
    return `Lieferung heute - ${dateValue}`;
  }

  if (daysUntilDelivery === 1) {
    return `Lieferung morgen - ${dateValue}`;
  }

  if (daysUntilDelivery > 1) {
    return `Lieferung in ${daysUntilDelivery} Tagen - ${dateValue}`;
  }

  if (daysUntilDelivery === -1) {
    return `Lieferung gestern - ${dateValue}`;
  }

  return `Lieferung vor ${Math.abs(daysUntilDelivery)} Tagen - ${dateValue}`;
}

export function matchesRelativeDayFilter(
  dateValue: string,
  relativeDayFilter: RelativeDayOption | "",
) {
  if (!relativeDayFilter) {
    return true;
  }

  const daysUntilDelivery = getDaysUntilDelivery(dateValue);

  if (relativeDayFilter === "today") {
    return daysUntilDelivery === 0;
  }

  return daysUntilDelivery === 1;
}

export function formatRelativeDayOption(option: RelativeDayOption) {
  return option === "today" ? "Heute" : "Morgen";
}

export function getDeliveryWindowKey(dateValue: string): DeliveryWindowOption | null {
  const daysUntilDelivery = getDaysUntilDelivery(dateValue);

  if (daysUntilDelivery < 0 || daysUntilDelivery > 28) {
    return null;
  }

  if (daysUntilDelivery <= 7) {
    return "week-1";
  }

  if (daysUntilDelivery <= 14) {
    return "week-2";
  }

  if (daysUntilDelivery <= 21) {
    return "week-3";
  }

  return "week-4";
}

export function formatDeliveryWindowOption(option: DeliveryWindowOption) {
  switch (option) {
    case "week-1":
      return "In 1 Woche";
    case "week-2":
      return "In 2 Wochen";
    case "week-3":
      return "In 3 Wochen";
    case "week-4":
      return "In 4 Wochen";
  }
}

export function formatDeliveryWindow(timeValue: string) {
  if (timeValue.includes("-") || timeValue.toLowerCase().includes("bis")) {
    return timeValue;
  }

  const normalizedValue = timeValue.replace(" Uhr", "").trim();
  const [hoursPart, minutesPart = "00"] = normalizedValue.split(":");
  const startHours = Number(hoursPart);
  const startMinutes = Number(minutesPart);

  if (!Number.isFinite(startHours) || !Number.isFinite(startMinutes)) {
    return timeValue;
  }

  const endDate = new Date();
  endDate.setHours(startHours, startMinutes, 0, 0);
  endDate.setHours(endDate.getHours() + 1);

  const endHours = String(endDate.getHours()).padStart(2, "0");
  const endMinutes = String(endDate.getMinutes()).padStart(2, "0");

  return `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")} - ${endHours}:${endMinutes} Uhr`;
}

export function formatAcceptedAtDate(acceptedAt?: string) {
  if (!acceptedAt) {
    return "Nicht verfügbar";
  }

  const acceptedDate = new Date(acceptedAt);

  if (Number.isNaN(acceptedDate.getTime())) {
    return "Nicht verfügbar";
  }

  return acceptedDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatAcceptedAtTime(acceptedAt?: string) {
  if (!acceptedAt) {
    return "Nicht verfügbar";
  }

  const acceptedDate = new Date(acceptedAt);

  if (Number.isNaN(acceptedDate.getTime())) {
    return "Nicht verfügbar";
  }

  return acceptedDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortOrders(orders: RestockMarketplaceOrder[], sortOption: SortOption) {
  return [...orders].sort((firstOrder, secondOrder) => {
    if (sortOption === "company-asc") {
      return firstOrder.companyName.localeCompare(secondOrder.companyName, "de");
    }

    const firstDate = parseDisplayDate(firstOrder.deliveryDate).getTime();
    const secondDate = parseDisplayDate(secondOrder.deliveryDate).getTime();

    if (firstDate !== secondDate) {
      return sortOption === "delivery-desc"
        ? secondDate - firstDate
        : firstDate - secondDate;
    }

    return sortOption === "delivery-desc"
      ? secondOrder.deliveryTime.localeCompare(firstOrder.deliveryTime, "de")
      : firstOrder.deliveryTime.localeCompare(secondOrder.deliveryTime, "de");
  });
}
