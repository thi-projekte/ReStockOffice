import { useEffect, useRef, useState } from "react";
import type { Product, RestockOrderWithProduct } from "../types/shop";

interface SubscriptionDialogProps {
  items: RestockOrderWithProduct[];
  product: Product | null;
  selectedItem?: RestockOrderWithProduct;
  open: boolean;
  onClose: () => void;
  onConfirm: (configuration: { quantity: number; intervalCount: number }) => Promise<void> | void;
  onSelectItem: (item: RestockOrderWithProduct) => void;
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
  const [isClosingToHeader, setIsClosingToHeader] = useState(false);
  const overlayRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !product) {
      return;
    }

    setQuantity(selectedItem?.quantity ?? 1);
    setIntervalCount(selectedItem?.interval ?? 1);
    setIsClosingToHeader(false);
  }, [open, product, selectedItem]);

  if (!open || !product) {
    return null;
  }

  const hasInvalidQuantity = quantity < 1 || Number.isNaN(quantity);

  function getSubscriptionTargetElement() {
    const isMobile = window.matchMedia("(max-width: 720px)").matches;

    if (isMobile) {
      return document.querySelector(".hamburger-btn") as HTMLElement | null;
    }

    return document.querySelector('a[href="/subscription"]') as HTMLElement | null;
  }

  async function animateDialogIntoHeader() {
    const modalElement = modalRef.current;
    const overlayElement = overlayRef.current;
    const targetElement = getSubscriptionTargetElement();

    if (!modalElement || !overlayElement || !targetElement) {
      onClose();
      return;
    }

    const modalRect = modalElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const targetSize = Math.max(Math.min(targetRect.width, targetRect.height), 44);
    const targetTop = targetRect.top + (targetRect.height - targetSize) / 2;
    const targetLeft = targetRect.left + (targetRect.width - targetSize) / 2;

    modalElement.style.top = `${modalRect.top}px`;
    modalElement.style.left = `${modalRect.left}px`;
    modalElement.style.width = `${modalRect.width}px`;
    modalElement.style.height = `${modalRect.height}px`;
    modalElement.style.maxHeight = `${modalRect.height}px`;
    modalElement.style.transform = "translate(0, 0) scale(1)";
    modalElement.style.transformOrigin = "center center";

    window.requestAnimationFrame(() => {
      overlayElement.classList.add("subscription-modal__overlay--closing");
      modalElement.classList.add("subscription-modal--closing");
      modalElement.style.top = `${targetTop}px`;
      modalElement.style.left = `${targetLeft}px`;
      modalElement.style.width = `${targetSize}px`;
      modalElement.style.height = `${targetSize}px`;
      modalElement.style.maxHeight = `${targetSize}px`;
      modalElement.style.opacity = "0.98";
      modalElement.style.transform = "translate(0, 0) scale(0.18)";
    });

    await new Promise((resolve) => window.setTimeout(resolve, 480));
    onClose();
  }

  async function handleConfirm() {
    if (isClosingToHeader) {
      return;
    }

    setIsClosingToHeader(true);

    try {
      await onConfirm({ quantity, intervalCount });
      await animateDialogIntoHeader();
    } catch (error) {
      setIsClosingToHeader(false);
      console.error(error);
    }
  }

  return (
    <>
      <button
        ref={overlayRef}
        className="subscription-modal__overlay"
        type="button"
        aria-label="Dialog schließen"
        onClick={isClosingToHeader ? undefined : onClose}
        disabled={isClosingToHeader}
      />

      <section
        ref={modalRef}
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
          <button
            className="button button--ghost"
            type="button"
            onClick={onClose}
            disabled={isClosingToHeader}
          >
            X
          </button>
        </div>

        <div className="subscription-modal__body">
          <div className="subscription-modal__product">
            <strong>{product.name}</strong>
            <span>{product.category}</span>
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
          <button
            className="button button--ghost"
            type="button"
            onClick={onClose}
            disabled={isClosingToHeader}
          >
            Änderungen verwerfen
          </button>
          <button
            className="button"
            type="button"
            disabled={hasInvalidQuantity || isClosingToHeader}
            onClick={() => {
              void handleConfirm();
            }}
          >
            Änderungen übernehmen
          </button>
        </div>
      </section>
    </>
  );
}
