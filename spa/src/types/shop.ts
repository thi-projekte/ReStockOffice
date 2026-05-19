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


