import { useEffect, useState } from "react";
import {Link, Navigate, NavLink, useOutletContext, useParams} from "react-router-dom";
import { ProductCarousel } from "../components/ProductCarousel";
import { getProductById, getProducts } from "../services/products";
import type { Product, RestockOrderWithProduct } from "../types/shop";

interface ProductDetailProps {
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  isLoggedIn: boolean;
  onLogin: (formData: unknown) => Promise<void>;
  onLogout: () => void;
  theme: "light" | "dark" | "auto";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark" | "auto") => void;
}

function formatPrice(value: number) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function getSimilarProducts(products: Product[], currentProduct: Product) {
  const sameCategory = products.filter(
    (product) =>
      product.productId !== currentProduct.productId &&
      product.category === currentProduct.category,
  );

  if (sameCategory.length >= 3) {
    return sameCategory.slice(0, 6);
  }

  const fallbackProducts = products.filter(
    (product) =>
      product.productId !== currentProduct.productId &&
      product.category !== currentProduct.category,
  );

  return [...sameCategory, ...fallbackProducts].slice(0, 6);
}

export function ProductDetailPage() {
  const params = useParams();
  const productId = Number(params.productId);
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { onAddToSubscription,subscriptionItems } = useOutletContext<ProductDetailProps>();

  useEffect(() => {
    async function loadProduct() {
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

  const isInSub = product ? subscriptionItems.some(
      (item) => item.productId === product.productId.toString(),
  ) : false;

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

  return (
    <div className="home-showcase">
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
                {product.unitCount} {product.unit}
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
            {isInSub ? (
              <div style={{display: "flex", alignItems: "center", width: "100%"}}>
                <button
                    className="button button--ghost"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                >
                  Produkt bereits im Abo
                </button>
                <NavLink to={"/subscription"} style={{marginLeft: "auto", paddingRight: "0.5rem"}}>
                  <small className="small-link-text">
                    Zur Abo-Verwaltung
                  </small>
                </NavLink>
              </div>
            ) :
              <div>
                <button
                  className="button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToSubscription(product);
                  }}
                  >
                  Zum Abo hinzufügen
                </button>
              </div>}
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
              {product.unitCount} {product.unit}
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
