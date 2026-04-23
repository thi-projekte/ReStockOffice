import type { CartItem } from "../types/shop";
import {Link} from "react-router-dom";

// Icons
import { MdDelete } from "react-icons/md";

interface CartDrawerProps {
  items: CartItem[];
  totalPrice: number;
  open: boolean;
  onClose: () => void;
  onRemove: (itemId: number) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
}

export function CartDrawer({
  items,
  totalPrice,
  open,
  onClose,
  onRemove,
  onUpdateQuantity,
}: CartDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Warenkorb schließen"
        className="cart-overlay"
        type="button"
        onClick={onClose}
      />

      <aside className="cart-drawer">
        <div className="cart-drawer__header">
          <h2>Warenkorb</h2>
          <button className="button button--ghost" type="button" onClick={onClose}>
            X
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">Der Warenkorb ist leer.</div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map(({ product, quantity }) => (
                <li className="cart-item" key={product.itemId}>
                  <div>
                    <strong>{product.name}</strong>
                    <div className="muted-text">
                      {product.price.toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      })}{" "}
                      pro Stück
                    </div>
                  </div>

                  <div className="cart-controls">
                    <button
                      className="quantity-button"
                      type="button"
                      onClick={() => onUpdateQuantity(product.itemId, quantity - 1)}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      className="quantity-button"
                      type="button"
                      onClick={() => onUpdateQuantity(product.itemId, quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => onRemove(product.itemId)}
                    >
                      <MdDelete  />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-summary">
              <strong>Gesamt:</strong>
              <span>
                {totalPrice.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
              <Link className="button" to="/checkout">
                Weiter zum Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
