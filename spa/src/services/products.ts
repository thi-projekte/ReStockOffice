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

function resolveMockImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return logoColored;
  }

  if (imageUrl.startsWith(LEGACY_MOCK_IMAGE_PREFIX)) {
    return mockAssetModules[imageUrl] ?? logoColored;
  }

  return imageUrl;
}

const productMocks = (products as Product[]).map((product) => ({
  ...product,
  imageUrl: resolveMockImageUrl(product.imageUrl),
}));
const productsCache = new Map<number, Product>();
const categoryNameCache = new Map<string, string>();
let allProductsCache: Product[] | null = null;

function seedCaches(loadedProducts: Product[]) {
  allProductsCache = loadedProducts;

  for (const product of loadedProducts) {
    productsCache.set(product.itemId, product);
    categoryNameCache.set(getCategorySlug(product.article_type), product.article_type);
  }
}

function normalizeProduct(rawProduct: unknown): Product {
  const source = rawProduct as Record<string, unknown>;
  const itemIdValue = source.itemId ?? source.productId ?? source.articleId ?? source.id;
  const unitsValue = source.units ?? source.unit ?? source.packagingUnit ?? source.quantityUnit ?? 1;
  const priceValue = source.price ?? source.unitPrice ?? source.salesPrice ?? 0;
  const articleTypeValue = source.article_type ?? source.articleType ?? source.category ?? "";
  const descriptionValue = source.description ?? source.articleDescription ?? source.shortDescription ?? "";
  const imageUrlValue = source.imageUrl ?? source.imageURL ?? source.image ?? source.pictureUrl ?? "";

  return {
    itemId: Number(itemIdValue),
    name: String(source.name ?? source.articleName ?? source.title ?? ""),
    description: String(descriptionValue),
    price: Number(priceValue),
    brand: String(source.brand ?? source.manufacturer ?? ""),
    article_type: String(articleTypeValue),
    units: Number(unitsValue),
    imageUrl: String(imageUrlValue),
  };
}

async function loadProductsFromMock(): Promise<Product[]> {
  seedCaches(productMocks);
  return productMocks;
}

async function loadProductsFromApi(): Promise<Product[]> {
  const response = await fetch(PRODUCTS_API_URL);

  if (!response.ok) {
    throw new Error("Produkte konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown[];
  const normalizedProducts = payload.map(normalizeProduct);
  seedCaches(normalizedProducts);
  return normalizedProducts;
}

async function loadProductByIdFromApi(itemId: number): Promise<Product | undefined> {
  const response = await fetch(`${PRODUCT_API_URL}?itemId=${encodeURIComponent(itemId)}`);

  if (!response.ok) {
    throw new Error("Produkt konnte nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown;
  const normalizedProduct = normalizeProduct(payload);
  productsCache.set(normalizedProduct.itemId, normalizedProduct);
  categoryNameCache.set(
    getCategorySlug(normalizedProduct.article_type),
    normalizedProduct.article_type,
  );

  return normalizedProduct;
}

async function loadProductsByCategoryFromApi(articleType: string): Promise<Product[]> {
  const response = await fetch(
    `${PRODUCTS_BY_CATEGORY_API_URL}?articleType=${encodeURIComponent(articleType)}`,
  );

  if (!response.ok) {
    throw new Error("Produkte der Kategorie konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown[];
  const normalizedProducts = payload.map(normalizeProduct);

  for (const product of normalizedProducts) {
    productsCache.set(product.itemId, product);
  }

  categoryNameCache.set(getCategorySlug(articleType), articleType);
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

export async function getProductById(itemId: number): Promise<Product | undefined> {
  const cachedProduct = productsCache.get(itemId);

  if (cachedProduct) {
    return cachedProduct;
  }

  if (allProductsCache) {
    return allProductsCache.find((product) => product.itemId === itemId);
  }

  if (useAPI) {
    return loadProductByIdFromApi(itemId);
  }

  return productMocks.find((product) => product.itemId === itemId);
}

export function getCategorySlug(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<Product[]> {
  const normalizedSlug = categorySlug.toLowerCase();

  if (allProductsCache) {
    return allProductsCache.filter(
      (product) => getCategorySlug(product.article_type) === normalizedSlug,
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
    (product) => getCategorySlug(product.article_type) === normalizedSlug,
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
      (product) => getCategorySlug(product.article_type) === normalizedSlug,
    );

    return matchingProduct?.article_type;
  }

  const availableProducts = await getProducts();
  const matchingProduct = availableProducts.find(
    (product) => getCategorySlug(product.article_type) === normalizedSlug,
  );

  return matchingProduct?.article_type;
}

export function getProductsApiUrl() {
  return PRODUCTS_API_URL;
}
