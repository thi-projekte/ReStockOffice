export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  unit: string;
  unitCount: string;
  imageUrl: string;
}


export interface SubscriptionItem {
  itemId: string;
  productId: string;
  quantity: number;
  intervalCount: number;
}

export interface RestockOrder {
  customerId: string;
  productId: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | string;
  quantity: number;
  interval: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
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


