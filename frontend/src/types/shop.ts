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

export interface LoginFormData {
  username: string;
  password: string;
}

export interface LoginCredentials extends LoginFormData {
  role: string;
}
