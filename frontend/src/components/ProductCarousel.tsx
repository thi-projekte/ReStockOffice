import { useRef } from "react";
import { Link } from "react-router-dom";
import logoColored from "../assets/logos/logo_colored.png";
import type { Product } from "../types/shop";

interface ProductCarouselProps {
  anchorId: string;
  eyebrow: string;
  title: string;
  description: string;
  products: Product[];
  isLoading?: boolean;
  getBadge?: (product: Product, index: number) => string;
}

export function ProductCarousel({
  anchorId,
  eyebrow,
  title,
  description,
  products,
  isLoading = false,
  getBadge,
}: ProductCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  function scrollSection(direction: "left" | "right") {
    const target = carouselRef.current;

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

  return (
    <section id={anchorId} className="page-card section-space">
      <div className="section-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="section-copy">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">Produkte werden geladen...</p>
      ) : (
        <div className="carousel-shell">
          <button
            type="button"
            className="carousel-button carousel-button--side"
            aria-label={`${title} nach links scrollen`}
            onClick={() => scrollSection("left")}
          >
            &larr;
          </button>

          <div ref={carouselRef} className="carousel-row">
            {products.map((product, index) => (
              <Link
                key={`${title}-${product.itemId}`}
                className="product-card product-card--link carousel-card"
                to={`/products/${product.itemId}`}
              >
                <div className="carousel-card__media">
                  {getBadge ? (
                    <span className="product-card__badge">{getBadge(product, index)}</span>
                  ) : null}
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
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="carousel-button carousel-button--side"
            aria-label={`${title} nach rechts scrollen`}
            onClick={() => scrollSection("right")}
          >
            &rarr;
          </button>
        </div>
      )}
    </section>
  );
}
