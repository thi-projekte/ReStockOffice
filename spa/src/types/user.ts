export interface UserProfile {
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
  deliveryTime?: number;

  IBAN?: string;

  profilePictureUrl?: string;

  createdAt?: string;
  updatedAt?: string;
}
