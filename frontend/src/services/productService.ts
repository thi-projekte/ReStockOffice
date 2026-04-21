import products from "../mocks/products.json";
import type { Product } from "../types/shop";

const API_BASE_URL = "http://localhost:8080";

export const productMocks = products as Product[];

export function getProductEndpoint(itemId: number) {
  return `${API_BASE_URL}/product?itemid=${itemId}`;
}
