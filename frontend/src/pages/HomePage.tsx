import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import logoColored from "../assets/logos/logo_colored.png";
import { getProducts } from "../services/productService";
import type { Product } from "../types/shop";

type ProductSectionId = "sale" | "reorder" | "office";

interface CategoryTile {
  id: string;
  title: string;
  description: string;
  count: number;
}

function rotateProducts(products: Product[], offset: number): Product[] {
  if (products.length === 0) {
    return [];
  }

  const normalizedOffset = offset % products.length;

  return [...products.slice(normalizedOffset), ...products.slice(0, normalizedOffset)];
}

function createCategoryTiles(products: Product[]): CategoryTile[] {
  const groupedCategories = products.reduce<Record<string, number>>((accumulator, product) => {
    const category = product.article_type;
    accumulator[category] = (accumulator[category] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(groupedCategories).map(([title, count]) => ({
    id: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    count,
    description: `Aktuell ${count} Produkt${count === 1 ? "" : "e"} in dieser Kategorie.`,
  }));
}

function getProductBadge(sectionId: ProductSectionId, index: number): string {
  if (sectionId === "sale") {
    return index % 2 === 0 ? "Angebot" : "Deal";
  }

  if (sectionId === "reorder") {
    return index % 2 === 0 ? "Routine" : "Tipp";
  }

  return index % 2 === 0 ? "Bestseller" : "Beliebt";
}


export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saleRef = useRef<HTMLDivElement>(null);
  const reorderRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<HTMLDivElement>(null);

  const carouselRefs: Record<ProductSectionId, RefObject<HTMLDivElement | null>> = {
    sale: saleRef,
    reorder: reorderRef,
    office: officeRef,
  };

  useEffect(() => {
    async function loadProducts() {
      // TODO: Später Produkte und daraus abgeleitete Kategorien über Quarkus REST Services laden
      const loadedProducts = await getProducts();
      setProducts(loadedProducts);
      setIsLoading(false);
    }

    void loadProducts();
  }, []);

  const topCategories = createCategoryTiles(products);
  const saleProducts = rotateProducts(products, 0);
  const reorderProducts = rotateProducts(products, 1);
  const officeProducts = rotateProducts(products, 2);

  function scrollSection(sectionId: ProductSectionId, direction: "left" | "right") {
    const target = carouselRefs[sectionId].current;

    if (!target || target.children.length === 0) {
      return;
    }

    const firstCard = target.children[0] as HTMLElement;
    const styles = window.getComputedStyle(target);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    const scrollDistance = firstCard.offsetWidth + gap;

    target.scrollBy({
      left: direction === "right" ? scrollDistance : -scrollDistance,
      behavior: "smooth",
    });
  }

  function renderCarouselSection(
    sectionId: ProductSectionId,
    anchorId: string,
    eyebrow: string,
    title: string,
    description: string,
    sectionProducts: Product[],
  ) {
    return (
      <section id={anchorId} className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
        </div>

        <p className="section-copy">{description}</p>

        {isLoading ? (
          <p className="empty-state">Produkte werden geladen...</p>
        ) : (
          <div className="carousel-shell">
            <button
              type="button"
              className="carousel-button carousel-button--side"
              aria-label={`${title} nach links scrollen`}
              onClick={() => scrollSection(sectionId, "left")}
            >
              &larr;
            </button>

            <div ref={carouselRefs[sectionId]} className="carousel-row">
              {sectionProducts.map((product, index) => (
                <article key={`${sectionId}-${product.itemId}`} className="product-card carousel-card">
                  <div className="carousel-card__media">
                    <span className="product-card__badge">{getProductBadge(sectionId, index)}</span>
                    <img
                      className="product-card__image"
                      src={product.imageUrl || logoColored}
                      alt={product.name}
                    />
                  </div>

                  <div className="product-card__content">
                    <div className="product-card__category">{product.article_type}</div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>

                    <dl className="product-card__meta">
                      <div>
                        <dt>Marke</dt>
                        <dd>{product.brand}</dd>
                      </div>
                      <div>
                        <dt>Einheiten</dt>
                        <dd>{product.units}</dd>
                      </div>
                    </dl>

                    <div className="product-card__footer">
                      <strong>
                        {product.price.toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="carousel-button carousel-button--side"
              aria-label={`${title} nach rechts scrollen`}
              onClick={() => scrollSection(sectionId, "right")}
            >
              &rarr;
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="home-showcase">
      <section className="hero-card home-hero">
        <div className="home-hero__top">
          <span className="eyebrow">Home</span>
        </div>

        <div className="hero-copy">
          <h1>Alles für den Büroalltag an einem Ort</h1>

          <p>
            Hallo [Nutzer], lass uns direkt loslegen ...
          </p>

          <div className="hero-highlights" aria-label="Schnelle Übersicht">
            <a className="highlight-tile highlight-tile--link" href="#angebote">
              <strong>Angebote</strong>
              <span>Aktuelle Angebote und reduzierte Produkte entdecken</span>
              <small>Jetzt shoppen</small>
            </a>

            <a className="highlight-tile highlight-tile--link" href="#fuer-dein-buero">
              <strong>Empfehlungen</strong>
              <span>Persönlich zusammengestellte Empfehlungen für dich</span>
              <small>Jetzt shoppen</small>
            </a>

            <a className="highlight-tile highlight-tile--link" href="#kategorien">
              <strong>Kategorien</strong>
              <span>Strukturierte Übersicht aller verfügbaren Produkte</span>
              <small>Jetzt shoppen</small>
            </a>
          </div>

          <div className="dashboard-strip" aria-label="Kennzahlen und Aktionen">
            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Nächste Lieferung</span>
              <strong>24. April 2026</strong>
              <small>Geplante Ankunft zwischen 09:00 und 12:00 Uhr</small>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Letzte Lieferung</span>
              <strong>20. April 2026</strong>
              <small>Vollständig eingegangen und verbucht</small>
            </article>

            <article className="dashboard-stat dashboard-stat--action">
              <span className="dashboard-stat__label">Bestellungen</span>
              <Link className="button" to="/search">
                Zu deinen Bestellung
              </Link>
              <small>Status und Details ansehen</small>
            </article>
          </div>
        </div>
      </section>

      {renderCarouselSection(
        "sale",
        "angebote",
        "Angebote",
        "Jetzt im Angebot",
        "Entdecke regelmäßig wechselnde Deals und Preisaktionen",
        saleProducts,
      )}

      {renderCarouselSection(
        "reorder",
        "nochmal-kaufen",
        "Nachkaufen",
        "Nochmal kaufen",
        "Produkte aus früheren Bestellungen schnell erneut kaufen",
        reorderProducts,
      )}

      {renderCarouselSection(
        "office",
        "fuer-dein-buero",
        "Für dein Büro",
        "Passende Produkte",
        "Produkte, die auf deinen Interessen und bisherigen Käufen basieren",
        officeProducts,
      )}

      <section id="kategorien" className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kategorien</span>
            <h2>Top Kategorien</h2>
          </div>
        </div>

        <div className="category-grid">
          {isLoading ? (
            <p className="empty-state">Kategorien werden geladen...</p>
          ) : (
            topCategories.map((category) => (
              <article key={category.id} className="category-tile">
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <span className="category-tile__label">{category.count} Produkte</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
