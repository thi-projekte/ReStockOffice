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

export function getCategorySlug(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<Product[]> {
  const products = await getProducts();

  return products.filter(
    (product) => getCategorySlug(product.article_type) === categorySlug.toLowerCase(),
  );
}

export async function getCategoryNameBySlug(categorySlug: string): Promise<string | undefined> {
  const products = await getProducts();
  const matchingProduct = products.find(
    (product) => getCategorySlug(product.article_type) === categorySlug.toLowerCase(),
  );

  return matchingProduct?.article_type;
}

export function getProductEndpoint(itemId: number) {
  return `${API_BASE_URL}/product?itemid=${itemId}`;
}
