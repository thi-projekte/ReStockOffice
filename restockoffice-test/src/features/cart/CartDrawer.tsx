import type { CartItem } from '../../types';

interface CartDrawerProps {
  items: CartItem[];
  totalPrice: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function CartDrawer({ items, totalPrice, onUpdateQuantity, onRemove, onClose }: CartDrawerProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} aria-hidden="true" />

      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface-card shadow-2xl z-40 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">Warenkorb</h2>
          <button onClick={onClose} aria-label="Warenkorb schließen" className="text-ink-muted hover:text-ink transition-colors p-1 rounded">
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
            Der Warenkorb ist leer.
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-border px-5">
              {items.map(({ article, quantity }) => (
                <li key={article.id} className="py-4 flex gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm leading-snug truncate">{article.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {article.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / Stk.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onUpdateQuantity(article.id, quantity - 1)} aria-label="Menge verringern"
                      className="w-7 h-7 flex items-center justify-center rounded border border-border text-ink-muted hover:text-ink hover:border-brand-500 transition-colors text-lg leading-none">−</button>
                    <span className="w-6 text-center text-sm font-medium text-ink">{quantity}</span>
                    <button onClick={() => onUpdateQuantity(article.id, quantity + 1)} aria-label="Menge erhöhen"
                      className="w-7 h-7 flex items-center justify-center rounded border border-border text-ink-muted hover:text-ink hover:border-brand-500 transition-colors text-lg leading-none">+</button>
                    <button onClick={() => onRemove(article.id)} aria-label="Artikel entfernen"
                      className="ml-1 text-ink-muted hover:text-red-500 transition-colors"><TrashIcon /></button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4 space-y-3">
              <div className="flex justify-between text-base font-semibold text-ink">
                <span>Gesamt</span>
                <span>{totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <p className="text-xs text-ink-muted">Bestellprozess folgt in Spike #13.</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
