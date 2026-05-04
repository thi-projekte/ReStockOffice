export interface Product {
  itemId: number;
  name: string;
  description: string;
  price: number;
  brand: string;
  article_type: string;
  units: number;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SubscriptionItem {
  itemId: string;
  productId: string;
  quantity: number;
  intervalCount: number;
}

export interface SubscriptionCart {
  subscriptionId: string;
  customerId: string;
  status: "ACTIVE";
  startDate: string;
  endDate: string | null;
  items: SubscriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionProductItem extends SubscriptionItem {
  product: Product;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface LoginCredentials extends LoginFormData {
  role: string;
}
