import type { UserProfile } from "../services/users";

type RequiredFieldDefinition = {
  keys: string[];
  label: string;
};

export interface SubscriptionProfileStatus {
  isComplete: boolean;
  completedFields: number;
  requiredFields: number;
  completionPercentage: number;
  missingFields: string[];
}

const CUSTOMER_REQUIRED_FIELDS = [
  { keys: ["phoneNumber", "phone"], label: "Telefon" },
  { keys: ["companyName", "company"], label: "Unternehmen" },
  { keys: ["country"], label: "Land" },
  { keys: ["street"], label: "Straße" },
  { keys: ["houseNumber"], label: "Hausnummer" },
  { keys: ["postalCode", "zipCode"], label: "PLZ" },
  { keys: ["city"], label: "Ort" },
] as const satisfies readonly RequiredFieldDefinition[];

const RESTOCKER_REQUIRED_FIELDS = CUSTOMER_REQUIRED_FIELDS;

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function hasAnyValue(profileValues: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => hasValue(profileValues[key]));
}

function getRequiredFields(user: UserProfile): readonly RequiredFieldDefinition[] {
  return user.kind === "restocker"
    ? RESTOCKER_REQUIRED_FIELDS
    : CUSTOMER_REQUIRED_FIELDS;
}

export function getSubscriptionProfileStatus(
  user: UserProfile | null,
): SubscriptionProfileStatus {
  if (!user) {
    return {
      isComplete: false,
      completedFields: 0,
      requiredFields: 0,
      completionPercentage: 0,
      missingFields: [],
    };
  }

  const requiredFields = getRequiredFields(user);
  const profileValues = user as unknown as Record<string, unknown>;
  const missingFields = requiredFields
    .filter(({ keys }) => !hasAnyValue(profileValues, keys))
    .map(({ label }) => label);
  const completedFields = requiredFields.length - missingFields.length;

  return {
    isComplete: missingFields.length === 0,
    completedFields,
    requiredFields: requiredFields.length,
    completionPercentage:
      requiredFields.length === 0
        ? 0
        : Math.round((completedFields / requiredFields.length) * 100),
    missingFields,
  };
}
