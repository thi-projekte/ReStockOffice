import { useEffect, useState } from "react";
import type { Product, SubscriptionProductItem } from "../types/shop";

interface SubscriptionDialogProps {
  items: SubscriptionProductItem[];
  product: Product | null;
  selectedItem?: SubscriptionProductItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (configuration: { quantity: number; intervalCount: number }) => void;
  onSelectItem: (item: SubscriptionProductItem) => void;
  onOpenOverview: () => void;
}

function formatInterval(intervalCount: number) {
  return `Alle ${intervalCount} Woche${intervalCount === 1 ? "" : "n"}`;
}

export function SubscriptionDialog({
  product,
  selectedItem,
  open,
  onClose,
  onConfirm,
}: SubscriptionDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [intervalCount, setIntervalCount] = useState(1);

  useEffect(() => {
    if (!open || !product) {
      return;
    }

    setQuantity(selectedItem?.quantity ?? 1);
    setIntervalCount(selectedItem?.intervalCount ?? 1);
  }, [open, product, selectedItem]);

  if (!open || !product) {
    return null;
  }

  const hasInvalidQuantity = quantity < 1 || Number.isNaN(quantity);

  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Dialog schließen"
        onClick={onClose}
      />

      <section
        className="subscription-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-dialog-title"
      >
        <div className="subscription-modal__header">
          <div>
            <span className="eyebrow">Abo</span>
            <h2 id="subscription-dialog-title">Produkt zum Abo hinzufügen</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            X
          </button>
        </div>

        <div className="subscription-modal__body">
          <div className="subscription-modal__product">
            <strong>{product.name}</strong>
            <span>{product.article_type}</span>
          </div>

          {selectedItem ? (
            <div className="subscription-modal__warning">
              Dieses Produkt ist bereits Teil deines Abos. Deine Änderungen werden auf das
              laufende Abo angewendet.
            </div>
          ) : null}

          <label className="subscription-field">
            <span>Menge</span>
            <input
              className="subscription-number-input"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>

          <label className="subscription-field">
            <div className="subscription-field__head">
              <span>Intervall</span>
              <strong>{formatInterval(intervalCount)}</strong>
            </div>
            <input
              className="subscription-slider"
              type="range"
              min={1}
              max={12}
              step={1}
              value={intervalCount}
              onChange={(event) => setIntervalCount(Number(event.target.value))}
            />
            <div className="subscription-slider__scale">
              <span>1 Woche</span>
              <span>12 Wochen</span>
            </div>
          </label>

          <div className="subscription-modal__summary">
            Alle {intervalCount} Wochen werden {quantity}x {product.name} zugeliefert.
          </div>
        </div>

        <div className="subscription-modal__actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            Änderungen verwerfen
          </button>
          <button
            className="button"
            type="button"
            disabled={hasInvalidQuantity}
            onClick={() => onConfirm({ quantity, intervalCount })}
          >
            Änderungen übernehmen
          </button>
        </div>
      </section>
    </>
  );
}
