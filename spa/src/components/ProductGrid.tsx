import {type ReactElement} from "react";
import {Link} from "react-router-dom";
import type {Product} from "../types/shop";

interface ProductGridProps {
  readonly products: readonly Product[];
}

export function ProductGrid({products}: Readonly<ProductGridProps>): ReactElement {
  if (products.length === 0) {
    return (
      <p className="empty-state product-grid-empty">
        Keine Artikel für die Suche gefunden.
      </p>
    );
  }

  return (
    <div className="product-grid-shell">
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product}/>
        ))}
      </div>
    </div>
  );
}

interface ProductCardProps {
  readonly product: Product;
}

function ProductCard({product}: Readonly<ProductCardProps>): ReactElement {
  return (
    <Link
      className="product-card product-card--link"
      to={`/products/${product.productId}`}
      onClick={() => window.scrollTo(0, 0)}
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
    </Link>
  );
}
