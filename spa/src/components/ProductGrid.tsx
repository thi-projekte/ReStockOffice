import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types/shop";

interface ProductGridProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, onAdd }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="empty-state">Keine Artikel für die Suche gefunden.</p>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.itemId} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

function ProductCard({ product, onAdd }: ProductCardProps) {
  const navigate = useNavigate();

  function openDetails() {
    navigate(`/products/${product.itemId}`);
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
          <button
            className="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(product);
            }}
          >
            Zum Abo
          </button>
        </div>
      </div>
    </article>
  );
}
