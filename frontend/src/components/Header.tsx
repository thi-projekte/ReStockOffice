interface HeaderProps {
  totalItems: number;
  onCartOpen: () => void;
  onLogout: () => void;
}

export default function Header({ totalItems, onCartOpen, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-brand-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight select-none">
          ReStockOffice
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={onCartOpen}
            aria-label={`Warenkorb öffnen, ${totalItems} Artikel`}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
          >
            <CartIcon />
            <span>Warenkorb</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 flex items-center justify-center px-1 rounded-full bg-white text-brand-600 text-xs font-bold">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  );
}
