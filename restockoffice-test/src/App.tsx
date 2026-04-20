import { useState } from 'react';
import LoginPage from './features/login/LoginPage';
import CartDrawer from './features/cart/CartDrawer';
import { useCart } from './features/cart/useCart';
import ArticleList from './features/search/ArticleList';
import Header from './components/Header';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={async () => {
          // Platzhalter bis OIDC-Integration (folgt in späterem Spike)
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header
        totalItems={cart.totalItems}
        onCartOpen={() => setCartOpen(true)}
        onLogout={() => setIsLoggedIn(false)}
      />

      <ArticleList onAdd={cart.add} />

      {cartOpen && (
        <CartDrawer
          items={cart.items}
          totalPrice={cart.totalPrice}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.remove}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
