import {type MouseEvent, useEffect, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {getCategorySlug, getProducts} from "../services/products";
import type {Product} from "../types/shop";
import {ProductCarousel} from "../components/ProductCarousel";
import keycloak from "../auth/keycloak";
import type {CustomerDeliveryOverview} from "../services/deliveries";
import {loadCustomerDeliveryOverview} from "../services/deliveries";

interface CategoryTile {
  id: string;
  title: string;
  description: string;
  count: number;
}


function createCategoryTiles(products: Product[]): CategoryTile[] {
  const groupedCategories = products.reduce<Record<string, number>>((accumulator, product) => {
    const category = product.category;
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
  const location = useLocation();

  useEffect(() => {
    async function loadProducts() {
      const loadedProducts = await getProducts();
      setProducts(loadedProducts);
      setIsLoading(false);
    }

    void loadProducts();
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const sectionId = location.hash.slice(1);
    const scrollToSection = () => {
      const section = document.getElementById(sectionId);

      if (!section) {
        return;
      }

      const headerOffset = 96;
      const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({
        top,
        behavior: "smooth",
      });
    };

    window.requestAnimationFrame(scrollToSection);
  }, [location.hash, products.length]);

  const topCategories = createCategoryTiles(products);
  const firstName = keycloak.tokenParsed?.given_name ?? keycloak.tokenParsed?.preferred_username;

  const getRandomProducts = (products: Product[], max: number) =>
    [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, max);

  const saleProducts = getRandomProducts(products, 12);
  const reorderProducts = getRandomProducts(products, 12);
  const officeProducts = getRandomProducts(products, 12);

  function handleSectionJump(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
    event.preventDefault();
    window.history.replaceState(null, "", `#${sectionId}`);

    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    const headerOffset = 96;
    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }

  const [overview, setOverview] = useState<CustomerDeliveryOverview | null>(null);
  const token = keycloak.token;
  const customerId = keycloak.tokenParsed?.sub;

  useEffect(() => {
    if (!customerId || !token) return;

    loadCustomerDeliveryOverview({
      customerId,
      token,
    }).then(setOverview);
  }, [customerId, token]);

  function formatDate(date?: string | null) {
    if (!date) return "—";

    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
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
            Hallo {firstName}, lass uns direkt loslegen ...
          </p>

          <div className="hero-highlights" aria-label="Schnelle Übersicht">
            <a
              className="highlight-tile highlight-tile--link"
              href="#sale"
              onClick={(event) => handleSectionJump(event, "sale")}
            >
              <strong>Angebote</strong>
              <span>Aktuelle Angebote und reduzierte Produkte entdecken</span>
              <small>Jetzt shoppen</small>
            </a>

            <a
              className="highlight-tile highlight-tile--link"
              href="#office"
              onClick={(event) => handleSectionJump(event, "office")}
            >
              <strong>Empfehlungen</strong>
              <span>Persönlich zusammengestellte Empfehlungen für dich</span>
              <small>Jetzt shoppen</small>
            </a>

            <a
              className="highlight-tile highlight-tile--link"
              href="#categories"
              onClick={(event) => handleSectionJump(event, "categories")}
            >
              <strong>Kategorien</strong>
              <span>Strukturierte Übersicht aller verfügbaren Produkte</span>
              <small>Jetzt shoppen</small>
            </a>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Letzte Lieferung</span>

              <strong>
                {overview?.lastDelivery?.deliveryDate
                  ? formatDate(overview.lastDelivery.deliveryDate)
                  : "—"}
              </strong>

              <small>
                {(() => {
                  switch (overview?.lastDelivery?.status) {
                    case "DELIVERED":
                      return "Vollständig eingegangen";
                    case "COLLECTED":
                      return "Vom Restocker abgeholt";
                    case "ACCEPTED":
                      return "Vom Restocker angenommen";
                    case "OPEN":
                      return "Offen";
                    default:
                      return overview?.lastDelivery?.status ?? "Keine Daten";
                  }
                })()}
              </small>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">ReStockOffice Abonnement</span>
              <Link className="button dashboard-btn" to="/subscription">
                Dein Abo verwalten
              </Link>
              <small>Produktmenge und -intervall anpassen</small>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Nächste Lieferung</span>

              <strong>
                <strong>
                  {overview?.nextDelivery?.deliveryDate
                    ? formatDate(overview.nextDelivery.deliveryDate)
                    : "—"}
                </strong>
              </strong>

              <small>
                {(() => {
                  switch (overview?.nextDelivery?.status) {
                    case "DELIVERED":
                      return "Vollständig eingegangen";
                    case "COLLECTED":
                      return "Vom Restocker abgeholt";
                    case "ACCEPTED":
                      return "Vom Restocker angenommen";
                    case "OPEN":
                      return "Offen";
                    default:
                      return overview?.nextDelivery?.status ?? "Keine Daten";
                  }
                })()}
              </small>
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
                onClick={() => window.scrollTo(0, 0)}
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
