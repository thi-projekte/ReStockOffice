import { useEffect, useState } from "react";
import {Link, Navigate, useOutletContext, useParams} from "react-router-dom";
import logoColored from "../assets/logos/logo_colored.png";
import { ProductCarousel } from "../components/ProductCarousel";
import { getProductById, getProducts } from "../services/productService";
import type { Product } from "../types/shop";

interface ProductDetailProps {
  onAddToCart: (product: Product) => void;
  isLoggedIn: boolean;
  onLogin: (formData: any) => void;
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
      product.itemId !== currentProduct.itemId &&
      product.article_type === currentProduct.article_type,
  );

  if (sameCategory.length >= 3) {
    return sameCategory.slice(0, 6);
  }

  const fallbackProducts = products.filter(
    (product) =>
      product.itemId !== currentProduct.itemId &&
      product.article_type !== currentProduct.article_type,
  );

  return [...sameCategory, ...fallbackProducts].slice(0, 6);
}

export function ProductDetailPage() {
  const params = useParams();
  const itemId = Number(params.itemId);
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { onAddToCart } = useOutletContext<ProductDetailProps>();

  useEffect(() => {
    async function loadProduct() {
      if (Number.isNaN(itemId)) {
        setIsLoading(false);
        return;
      }

      const [currentProduct, allProducts] = await Promise.all([
        getProductById(itemId),
        getProducts(),
      ]);

      setProduct(currentProduct ?? null);
      setSimilarProducts(currentProduct ? getSimilarProducts(allProducts, currentProduct) : []);
      setIsLoading(false);
    }

    void loadProduct();
  }, [itemId]);

  if (Number.isNaN(itemId)) {
    return <Navigate to="/search" replace />;
  }

  if (isLoading) {
    return <section className="page-card">Produkt wird geladen...</section>;
  }

  if (!product) {
    return (
      <section className="page-card product-detail-empty">
        <span className="eyebrow">Produkt</span>
        <h1>Produkt nicht gefunden</h1>
        <p>Der ausgewählte Artikel ist aktuell nicht verfügbar.</p>
        <div className="product-detail__actions">
          <Link className="button" to="/search">
            Zur Produktsuche
          </Link>
        </div>
      </section>
    );
  }

  return (
        <div className="home-showcase">
          <section className="page-card product-detail">
            <Link to="/search" className="product-detail__backlink">
              <span className="eyebrow">Zurück zur Artikelsuche</span>
            </Link>
            <div>
              <span className="eyebrow">{product.article_type}</span>
            </div>
            <div className="product-detail__media">
              <img src={product.imageUrl || logoColored} alt={product.name}/>
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
                  <dd>{product.itemId}</dd>
                </div
                ><div>
                  <dt>Verpackung</dt>
                  <dd>{product.units} Einheit(en)</dd>
                </div>
                <div>
                  <dt>Marke</dt>
                  <dd>{product.brand}</dd>
                </div>
                <div>
                  <dt>Kategorie</dt>
                  <dd>{product.article_type}</dd>
                </div>
              </dl>

              <div className="product-detail__actions">
                <button
                    className="button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product);
                    }}
                >
                  Zum Warenkorb hinzufügen
                </button>
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
                <strong>{product.itemId}</strong>
              </article>
              <article className="product-specs__item">
                <span>Marke</span>
                <strong>{product.brand}</strong>
              </article>
              <article className="product-specs__item">
                <span>Kategorie</span>
                <strong>{product.article_type}</strong>
              </article>
              <article className="product-specs__item">
                <span>Einheiten pro Packung</span>
                <strong>{product.units}</strong>
              </article>
              <article className="product-specs__item">
                <span>Preis</span>
                <strong>{formatPrice(product.price)}</strong>
              </article>
            </div>
          </section>

          <ProductCarousel
              anchorId={"similar-products"}
              eyebrow="Mehr entdecken"
              title="Ähnliche Produkte"
              description="Weitere Artikel, die zu diesem Produkt und seiner Kategorie passen."
              products={similarProducts}/>
        </div>
  );
}
