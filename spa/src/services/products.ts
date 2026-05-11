import products from "../mocks/products.json";
import logoColored from "../assets/logos/logo_colored.png";
import type { Product } from "../types/shop";

const useAPI = false;

const PRODUCTS_API_URL = "https://articles.restockoffice.de/articles";
const PRODUCT_API_URL = "https://articles.restockoffice.de/article";
const PRODUCTS_BY_CATEGORY_API_URL = "https://articles.restockoffice.de/articleByCategory";
const LEGACY_MOCK_IMAGE_PREFIX = "../assets/";
const mockAssetModules = import.meta.glob("../assets/**/*.{png,jpg,jpeg,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function buildProductsNetworkErrorMessage(scope: "Produkte" | "Produkt" | "Kategorie") {
  return `${scope} konnten nicht geladen werden. Bitte prüfe Netzwerk, CORS oder Proxy-Konfiguration des Article-Service.`;
}

function resolveMockImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return logoColored;
  }

  if (imageUrl.startsWith(LEGACY_MOCK_IMAGE_PREFIX)) {
    return mockAssetModules[imageUrl] ?? logoColored;
  }

  return imageUrl;
}

function normalizeProduct(rawProduct: unknown): Product {
  const source = rawProduct as Record<string, unknown>;
  const productIdValue = source.productId ?? source.articleId ?? source.id;
  const unitValue = source.unit ?? source.quantityUnit ?? source.packagingUnit ?? "Einheit";
  const unitCountValue = source.unitCount ?? source.quantity ?? 1;
  const priceValue = source.price ?? source.unitPrice ?? source.salesPrice ?? 0;
  const categoryValue = source.category ?? source.articleType ?? "";
  const descriptionValue = source.description ?? source.articleDescription ?? source.shortDescription ?? "";
  const imageUrlValue = source.imageUrl ?? source.imageURL ?? source.image ?? source.pictureUrl ?? "";

  return {
    productId: Number(productIdValue),
    name: String(source.name ?? source.articleName ?? source.title ?? ""),
    description: String(descriptionValue),
    price: Number(priceValue),
    brand: String(source.brand ?? source.manufacturer ?? ""),
    category: String(categoryValue),
    unit: String(unitValue),
    unitCount: String(unitCountValue),
    imageUrl: String(imageUrlValue),
  };
}

const productMocks = (products as unknown[]).map((product) => {
  const normalizedProduct = normalizeProduct(product);

  return {
    ...normalizedProduct,
    imageUrl: resolveMockImageUrl(normalizedProduct.imageUrl),
  };
});
const productsCache = new Map<number, Product>();
const categoryNameCache = new Map<string, string>();
let allProductsCache: Product[] | null = null;

function seedCaches(loadedProducts: Product[]) {
  allProductsCache = loadedProducts;

  for (const product of loadedProducts) {
    productsCache.set(product.productId, product);
    categoryNameCache.set(getCategorySlug(product.category), product.category);
  }
}

async function loadProductsFromMock(): Promise<Product[]> {
  seedCaches(productMocks);
  return productMocks;
}

async function loadProductsFromApi(): Promise<Product[]> {
  let response: Response;

  try {
    response = await fetch(PRODUCTS_API_URL);
  } catch {
    throw new Error(buildProductsNetworkErrorMessage("Produkte"));
  }

  if (!response.ok) {
    throw new Error(`Produkte konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown[];
  const normalizedProducts = payload.map(normalizeProduct);
  seedCaches(normalizedProducts);
  return normalizedProducts;
}

async function loadProductByIdFromApi(productId: number): Promise<Product | undefined> {
  let response: Response;

  try {
    response = await fetch(`${PRODUCT_API_URL}?productId=${encodeURIComponent(productId)}`);
  } catch {
    throw new Error(buildProductsNetworkErrorMessage("Produkt"));
  }

  if (!response.ok) {
    throw new Error(`Produkt konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  const normalizedProduct = normalizeProduct(payload);
  productsCache.set(normalizedProduct.productId, normalizedProduct);
  categoryNameCache.set(
    getCategorySlug(normalizedProduct.category),
    normalizedProduct.category,
  );

  return normalizedProduct;
}

async function loadProductsByCategoryFromApi(category: string): Promise<Product[]> {
  let response: Response;

  try {
    response = await fetch(
      `${PRODUCTS_BY_CATEGORY_API_URL}?category=${encodeURIComponent(category)}`,
    );
  } catch {
    throw new Error(buildProductsNetworkErrorMessage("Kategorie"));
  }

  if (!response.ok) {
    throw new Error(`Produkte der Kategorie konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown[];
  const normalizedProducts = payload.map(normalizeProduct);

  for (const product of normalizedProducts) {
    productsCache.set(product.productId, product);
  }

  categoryNameCache.set(getCategorySlug(category), category);
  return normalizedProducts;
}

export async function getProducts(): Promise<Product[]> {
  if (allProductsCache) {
    return allProductsCache;
  }

  if (useAPI) {
    return loadProductsFromApi();
  }

  return loadProductsFromMock();
}

export async function getProductById(productId: number): Promise<Product | undefined> {
  const cachedProduct = productsCache.get(productId);

  if (cachedProduct) {
    return cachedProduct;
  }

  if (allProductsCache) {
    return allProductsCache.find((product) => product.productId === productId);
  }

  if (useAPI) {
    return loadProductByIdFromApi(productId);
  }

  return productMocks.find((product) => product.productId === productId);
}

export function getCategorySlug(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<Product[]> {
  const normalizedSlug = categorySlug.toLowerCase();

  if (allProductsCache) {
    return allProductsCache.filter(
      (product) => getCategorySlug(product.category) === normalizedSlug,
    );
  }

  if (useAPI) {
    const resolvedCategoryName = await getCategoryNameBySlug(categorySlug);

    if (!resolvedCategoryName) {
      return [];
    }

    return loadProductsByCategoryFromApi(resolvedCategoryName);
  }

  return productMocks.filter(
    (product) => getCategorySlug(product.category) === normalizedSlug,
  );
}

export async function getCategoryNameBySlug(categorySlug: string): Promise<string | undefined> {
  const normalizedSlug = categorySlug.toLowerCase();
  const cachedCategoryName = categoryNameCache.get(normalizedSlug);

  if (cachedCategoryName) {
    return cachedCategoryName;
  }

  if (allProductsCache) {
    const matchingProduct = allProductsCache.find(
      (product) => getCategorySlug(product.category) === normalizedSlug,
    );

    return matchingProduct?.category;
  }

  const availableProducts = await getProducts();
  const matchingProduct = availableProducts.find(
    (product) => getCategorySlug(product.category) === normalizedSlug,
  );

  return matchingProduct?.category;
}

export function getProductsApiUrl() {
  return PRODUCTS_API_URL;
}
