import products from "../mocks/products.json";
import type { Product } from "../types/shop";

const API_BASE_URL = "http://localhost:8080";

export const productMocks = products as Product[];

export async function getProducts(): Promise<Product[]> {
  // TODO: REST GET /products endpoint anbinden und API-Base-URL konfigurierbar machen.
  return Promise.resolve(productMocks);
}

export async function getProductById(itemId: number): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.itemId === itemId);
}

export function getProductEndpoint(itemId: number) {
  return `${API_BASE_URL}/product?itemid=${itemId}`;
}
