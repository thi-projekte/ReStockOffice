import { useState } from "react";
import logoColored from "../assets/logos/logo_colored.png";
import type { Product } from "../types/shop";
import { getProductEndpoint } from "../services/productService";

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
  const [imageSrc, setImageSrc] = useState(product.imageUrl);

  return (
    <article className="product-card">
      <img
        className="product-card__image"
        src={logoColored}
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
            onClick={() => onAdd(product)}
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </article>
  );
}
