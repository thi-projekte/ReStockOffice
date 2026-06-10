import {KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types/shop";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="product-grid-shell product-grid-shell--empty">
        <p className="empty-state product-grid-empty">
          Keine Artikel für die Suche gefunden.
        </p>
      </div>
    );
  }

  return (
    <div className="product-grid-shell">
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();


  function openDetails() {
    navigate(`/products/${product.productId}`);
    window.scrollTo(0, 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  }

  return (
    <article
      className="product-card product-card--interactive"
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleKeyDown}
    >
      <img
        className="product-card__image"
        src={product.imageUrl}
        alt={product.name}
      />
      <div className="product-card__content">
        <div className="product-card__category">{product.category}</div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <dl className="product-card__meta">
          <div>
            <dt>Marke</dt>
            <dd>{product.brand}</dd>
          </div>
          <div>
            <dt>Verpackung</dt>
            <dd>
              {product.unitCount} {product.unit}
            </dd>
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
  );
}
