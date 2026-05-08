import products from "../mocks/products.json";
import type { Product } from "../types/shop";

const PRODUCTS_API_URL = "";

const productMocks = products as Product[];

async function loadProductsFromMock(): Promise<Product[]> {
  return productMocks;
}

async function loadProductsFromApi(): Promise<Product[]> {
  const response = await fetch(PRODUCTS_API_URL);

  if (!response.ok) {
    throw new Error("Produkte konnten nicht geladen werden.");
  }

  return (await response.json()) as Product[];
}

export async function getProducts(): Promise<Product[]> {
  if (PRODUCTS_API_URL) {
    return loadProductsFromApi();
  }

  return loadProductsFromMock();
}

export async function getProductById(itemId: number): Promise<Product | undefined> {
  const availableProducts = await getProducts();
  return availableProducts.find((product) => product.itemId === itemId);
}

export function getCategorySlug(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<Product[]> {
  const availableProducts = await getProducts();

  return availableProducts.filter(
    (product) => getCategorySlug(product.article_type) === categorySlug.toLowerCase(),
  );
}

export async function getCategoryNameBySlug(categorySlug: string): Promise<string | undefined> {
  const availableProducts = await getProducts();
  const matchingProduct = availableProducts.find(
    (product) => getCategorySlug(product.article_type) === categorySlug.toLowerCase(),
  );

  return matchingProduct?.article_type;
}

export function getProductsApiUrl() {
  return PRODUCTS_API_URL;
}
