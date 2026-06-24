import { type ReactElement, useEffect, useState } from "react";
import { Link, Navigate, NavLink, useOutletContext, useParams } from "react-router-dom";
import { ProductCarousel } from "../components/ProductCarousel";
import { SubscriptionProfileProgress } from "../components/SubscriptionProfileProgress";
import { getProductById, getProducts } from "../services/products";
import type { Product, RestockOrderWithProduct } from "../types/shop";
import type { SubscriptionProfileStatus } from "../utils/subscriptionProfile";

interface ProductDetailProps {
  readonly onAddToSubscription: (product: Product) => void;
  readonly onOpenSubscriptionOverview: () => void;
  readonly onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  readonly subscriptionItems: readonly RestockOrderWithProduct[];
  readonly canModifySubscription: boolean;
  readonly subscriptionProfileStatus: SubscriptionProfileStatus | null;
  readonly isLoggedIn: boolean;
  readonly onLogin: (formData: unknown) => Promise<void>;
  readonly onLogout: () => void;
  readonly theme: "light" | "dark" | "auto";
  readonly onToggleTheme: () => void;
  readonly onSetTheme: (theme: "light" | "dark" | "auto") => void;
}

function formatPrice(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function getSimilarProducts(products: Product[], currentProduct: Product): Product[] {
  const sameCategory = products.filter(
    product =>
      product.productId !== currentProduct.productId
      && product.category === currentProduct.category,
  );

  if (sameCategory.length >= 3) {
    return sameCategory.slice(0, 6);
  }

  const fallbackProducts = products.filter(
    product =>
      product.productId !== currentProduct.productId
      && product.category !== currentProduct.category,
  );

  return [...sameCategory, ...fallbackProducts].slice(0, 6);
}

export function ProductDetailPage(): ReactElement {
  const params = useParams();
  const productId = Number(params.productId);
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    onAddToSubscription,
    onEditSubscriptionItem,
    subscriptionItems,
    canModifySubscription,
    subscriptionProfileStatus,
  }
    = useOutletContext<ProductDetailProps>();

  useEffect(() => {
    async function loadProduct(): Promise<void> {
      if (Number.isNaN(productId)) {
        setIsLoading(false);
        return;
      }

      const [currentProduct, allProducts] = await Promise.all([
        getProductById(productId),
        getProducts(),
      ]);

      setProduct(currentProduct ?? null);
      setSimilarProducts(currentProduct ? getSimilarProducts(allProducts, currentProduct) : []);
      setIsLoading(false);
    }

    void loadProduct();
  }, [productId]);

  if (Number.isNaN(productId)) {
    return <Navigate to="/products" replace />;
  }

  if (isLoading) {
    return <section className="page-card">Produkt wird geladen...</section>;
  }

  const isInSub = product
    ? subscriptionItems.some(item => item.productId === product.productId.toString())
    : false;
  const subscriptionItem = product
    ? subscriptionItems.find(item => item.productId === product.productId.toString())
    : undefined;

  if (!product) {
    return (
      <section className="page-card product-detail-empty">
        <span className="eyebrow">Produkt</span>
        <h1>Produkt nicht gefunden</h1>
        <p>Der ausgewählte Artikel ist aktuell nicht verfügbar.</p>
        <div className="product-detail__actions">
          <Link className="button" to="/products">
            Zur Produktsuche
          </Link>
        </div>
      </section>
    );
  }

  let subscriptionAction: ReactElement;

  if (isInSub && canModifySubscription) {
    subscriptionAction = (
      <div className="product-detail__subscription-action">
        <button
          className="button button--ghost product-detail__subscription-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (subscriptionItem) {
              onEditSubscriptionItem(subscriptionItem);
            }
          }}
        >
          Abo-Produkt bearbeiten
        </button>
        <NavLink to="/subscription" className="small-link-text">
          <small>Dieses Produkt ist bereits Teil deines Abos.</small>
        </NavLink>
      </div>
    );
  } else if (canModifySubscription) {
    subscriptionAction = (
      <div className="product-detail__subscription-action">
        <button
          className="button product-detail__subscription-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAddToSubscription(product);
          }}
        >
          Zum Abo hinzufügen
        </button>
      </div>
    );
  } else {
    subscriptionAction = (
      <div className="product-detail__subscription-lock">
        <button className="button product-detail__subscription-button" type="button" disabled>
          Zuerst Profil vervollständigen
        </button>
        <NavLink to="/account" className="small-link-text">
          <small>
            Solange dein Profil unvollständig ist, kannst du kein Produkt hinzufügen.
          </small>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="home-showcase">
      <SubscriptionProfileProgress
        status={subscriptionProfileStatus}
        message="Solange Pflichtfelder fehlen, kannst du kein Produkt zum Abo hinzufügen."
      />

      <section className="page-card product-detail">
        <Link to="/products" className="product-detail__backlink">
          <span className="eyebrow">Zurück zur Artikelsuche</span>
        </Link>

        <div>
          <span className="eyebrow">{product.category}</span>
        </div>
        <div className="product-detail__media">
          <img src={product.imageUrl} alt={product.name} />
        </div>
        <div className="product-detail__summary">
          <h1>{product.name}</h1>
          <p className="product-detail__description">{product.description}</p>

          <div className="product-detail__price-box">
            <strong>{formatPrice(product.price)}</strong>
            <span>pro Verpackungseinheit</span>
          </div>

          <dl className="product-detail__facts">
            <div>
              <dt>Artikelnummer</dt>
              <dd>{product.productId}</dd>
            </div>
            <div>
              <dt>Einheiten</dt>
              <dd>
                {product.unitCount}
                {" "}
                {product.unit}
              </dd>
            </div>
            <div>
              <dt>Marke</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>Kategorie</dt>
              <dd>{product.category}</dd>
            </div>
          </dl>

          <div className="product-detail__actions">
            {subscriptionAction}
          </div>
        </div>
      </section>

      <section className="page-card product-specs">
        <div className="section-head">
          <div>
            <span className="eyebrow">Spezifikationen</span>
            <h2>Produktdetails</h2>
            <p className="section-copy">Alle wichtigen Informationen auf einen Blick.</p>
          </div>
        </div>

        <div className="product-specs__grid">
          <article className="product-specs__item">
            <span>Artikelnummer</span>
            <strong>{product.productId}</strong>
          </article>
          <article className="product-specs__item">
            <span>Marke</span>
            <strong>{product.brand}</strong>
          </article>
          <article className="product-specs__item">
            <span>Kategorie</span>
            <strong>{product.category}</strong>
          </article>
          <article className="product-specs__item">
            <span>Einheiten pro Packung</span>
            <strong>
              {product.unitCount}
              {" "}
              {product.unit}
            </strong>
          </article>
          <article className="product-specs__item">
            <span>Preis</span>
            <strong>{formatPrice(product.price)}</strong>
          </article>
        </div>
      </section>

      <ProductCarousel
        anchorId="similar-products"
        eyebrow="Mehr entdecken"
        title="Ähnliche Produkte"
        description="Weitere Artikel, die zu diesem Produkt und seiner Kategorie passen."
        products={similarProducts}
      />
    </div>
  );
}
