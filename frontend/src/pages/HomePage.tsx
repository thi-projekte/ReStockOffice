import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import logoColored from "../assets/logos/logo_colored.png";
import { getCategorySlug, getProducts } from "../services/productService";
import type { Product } from "../types/shop";
import {ProductCarousel} from "../components/ProductCarousel";

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
export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            <a className="highlight-tile highlight-tile--link" href="#sale">
              <strong>Angebote</strong>
              <span>Aktuelle Angebote und reduzierte Produkte entdecken</span>
              <small>Jetzt shoppen</small>
            </a>

            <a className="highlight-tile highlight-tile--link" href="#office">
              <strong>Empfehlungen</strong>
              <span>Persönlich zusammengestellte Empfehlungen für dich</span>
              <small>Jetzt shoppen</small>
            </a>

            <a className="highlight-tile highlight-tile--link" href="#categories">
              <strong>Kategorien</strong>
              <span>Strukturierte Übersicht aller verfügbaren Produkte</span>
              <small>Jetzt shoppen</small>
            </a>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Nächste Lieferung</span>
              <strong>24. April 2026</strong>
              <small>Geplante Ankunft zwischen 09:00 und 12:00 Uhr</small>
            </article>

            <article className="dashboard-stat dashboard-stat--action">
              <span className="dashboard-stat__label">Bestellungen</span>
              <Link className="button" to="/search">
                Zu deinen Bestellung
              </Link>
              <small>Status und Details ansehen</small>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Letzte Lieferung</span>
              <strong>20. April 2026</strong>
              <small>Vollständig eingegangen und verbucht</small>
            </article>
          </div>
        </div>
      </section>


      <ProductCarousel
          anchorId={"sale"}
          eyebrow="Angebote"
          title="Aktuelle Deals"
          description="Entdecke regelmäßig wechselnde Deals und Preisaktionen"
          products={saleProducts}
          getBadge={() => (Math.random() < 0.5 ? "Angebot" : "Deal")}
      />

      <section id="categories" className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kategorien</span>
            <h2>Unsere Top Kategorien</h2>
          </div>
        </div>

        <div className="category-grid">
          {isLoading ? (
              <p className="empty-state">Kategorien werden geladen...</p>
          ) : (
              topCategories.map((category) => (
                  <Link
                    key={category.id}
                    className="category-tile highlight-tile highlight-tile--link"
                    to={`/categories/${getCategorySlug(category.title)}`}
                  >
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                    <span className="category-tile__label">{category.count} Produkte</span>
                  </Link>
              ))
          )}
        </div>
      </section>

      <ProductCarousel
          anchorId={"office"}
          eyebrow="Empfehlungen"
          title="Für dein Büro"
          description="Produkte, die auf deinen Interessen und bisherigen Käufen basieren"
          products={officeProducts}
          getBadge={() => (Math.random() < 0.5 ? "Bestseller" : "Beliebt")}
      />

      <ProductCarousel
          anchorId={"reorder"}
          eyebrow="Nachbestellen"
          title="Nochmal kaufen"
          description="Produkte aus früheren Bestellungen schnell erneut kaufen"
          products={reorderProducts}
          getBadge={() => (Math.random() < 0.5 ? "Routine" : "Tipp")}
      />
    </div>
  );
}
