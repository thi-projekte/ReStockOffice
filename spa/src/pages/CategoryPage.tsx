import { useEffect, useState } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import {
  getCategoryNameBySlug,
  getProductsByCategorySlug,
} from "../services/products";
import type { LoginFormData, Product, SubscriptionProductItem } from "../types/shop";

interface OutletContext {
  onLogin: (formData: LoginFormData) => Promise<void>;
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: SubscriptionProductItem) => void;
  subscriptionItems: SubscriptionProductItem[];
}

export function CategoryPage() {
  const { isLoggedIn, onAddToSubscription } = useOutletContext<OutletContext>();
  const { categorySlug } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategory() {
      if (!categorySlug) {
        setIsLoading(false);
        return;
      }

      const [categoryProducts, resolvedCategoryName] = await Promise.all([
        getProductsByCategorySlug(categorySlug),
        getCategoryNameBySlug(categorySlug),
      ]);

      setProducts(categoryProducts);
      setCategoryName(resolvedCategoryName ?? "");
      setIsLoading(false);
    }

    void loadCategory();
  }, [categorySlug]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!categorySlug) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <section className="page-card">Kategorie wird geladen...</section>;
  }

  if (!categoryName) {
    return (
      <section className="page-card product-detail-empty">
        <span className="eyebrow">Kategorie</span>
        <h1>Kategorie nicht gefunden</h1>
        <p>Die ausgewählte Kategorie ist aktuell nicht verfügbar.</p>
        <div className="product-detail__actions">
          <Link className="button" to="/">
            Zur Startseite
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="home-showcase">
      <section className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kategorie</span>
            <h1>{categoryName}</h1>
            <p className="section-copy">
              Hier findest du alle Produkte aus der Kategorie {categoryName}.
            </p>
          </div>

          <Link className="button button--ghost" to="/">
            Zurück zur Startseite
          </Link>
        </div>

        <ProductGrid products={products} onAdd={onAddToSubscription} />
      </section>
    </div>
  );
}
