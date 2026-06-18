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


export interface RestockOrder {
  id?: number;
  customerId: string;
  productId: string;
  status:  string;
  quantity: number;
  interval: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  subscriptionId: string;
  customerId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  items: RestockOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface RestockOrderWithProduct extends RestockOrder {
  product: Product;
}

export interface RestockMarketplaceOrderItem {
  position: number;
  articleNumber: string;
  productId: string;
  name: string;
  quantity: number;
  quantityLabel: string;
  interval: number;
}

export type RestockOrderAssignmentStatus =
  | "accepted"
  | "in_delivery"
  | "completed";

export interface RestockMarketplaceAssignment {
  restockerId: string;
  acceptedAt: string;
  status: RestockOrderAssignmentStatus;
}

export interface RestockMarketplaceOrder {
  orderId: string;
  orderKey: string;
  customerId: string;
  companyName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryNotes: string;
  articleCount: number;
  items: RestockMarketplaceOrderItem[];
  isPlaceholderCustomerData: boolean;
  assignment?: RestockMarketplaceAssignment;
}

export interface RestockMarketplaceLoadResult {
  orders: RestockMarketplaceOrder[];
  source: "live" | "demo";
  hasPlaceholderCustomerData: boolean;
}

export interface RestockerCustomerProfile {
  companyName: string;
  street: string;
  postalCode: string;
  city: string;
  deliveryTime: string;
  deliveryNotes: string;
  isPlaceholder: boolean;
}


