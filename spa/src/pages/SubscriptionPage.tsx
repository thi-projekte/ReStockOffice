import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import type {
    LoginFormData,
    Product,
    SubscriptionProductItem,
} from "../types/shop";

interface OutletContext {
    onLogin: (formData: LoginFormData) => Promise<void>;
    isLoggedIn: boolean;
    onAddToSubscription: (product: Product) => void;
    onOpenSubscriptionOverview: () => void;
    onEditSubscriptionItem: (item: SubscriptionProductItem) => void;
    subscriptionItems: SubscriptionProductItem[];
    onLogout: () => void;
    theme: "light" | "dark" | "auto";
    onToggleTheme: () => void;
    onSetTheme: (theme: "light" | "dark" | "auto") => void;
}

function formatInterval(intervalCount: number) {
    return `Alle ${intervalCount} Woche${intervalCount === 1 ? "" : "n"}`;
}

export function SubscriptionPage() {
    const {
        isLoggedIn,
        onEditSubscriptionItem,
        subscriptionItems,
    } = useOutletContext<OutletContext>();
    const [isEditMode, setIsEditMode] = useState(false);

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="home-showcase">
            <section id="sub" className="page-card section-space">
                <div className="section-head">
                    <div>
                        <span className="eyebrow">Aboverwaltung</span>
                        <h2>Dein aktuelles Abonnement</h2>
                        <p className="section-copy">
                            Verwalte hier Produkte, Mengen und Lieferintervalle deines Abos.
                        </p>
                    </div>
                    <button
                        className="button"
                        type="button"
                        onClick={() => setIsEditMode((current) => !current)}
                    >
                        {isEditMode ? "Bearbeitung beenden" : "Abo bearbeiten"}
                    </button>

                </div>
                <div className="section-space">
                    <div className="product-specs__grid">
                        <article className="product-specs__item">
                            <span>Bevorzugter Liefertermin</span>
                            <strong>Montag, 09:00 bis 12:00 Uhr</strong>
                        </article>
                        <article className="product-specs__item">
                            <span>Aktuelles Intervall</span>
                            <strong>2 Wochen</strong>
                        </article>
                        <article className="product-specs__item">
                            <span>Benachrichtigung</span>
                            <strong>E-Mail bei Statuswechsel</strong>
                        </article>
                    </div>
                </div>

                <div className="section-space">
                    <h3>Aktuelle ReStockOrders in deinem Abo</h3>
                    <div className="product-specs__grid">
                        {subscriptionItems.length === 0 ? (
                            <p className="empty-state">Du hast aktuell noch keine Artikel in deinem Abo.</p>
                        ) : (
                            <div className="subscription-account-list">
                                {subscriptionItems.map((item) => (
                                    <button
                                        key={item.itemId}
                                        className={`subscription-account-item ${
                                            isEditMode ? "" : "subscription-account-item--disabled"
                                        }`.trim()}
                                        type="button"
                                        disabled={!isEditMode}
                                        onClick={() => onEditSubscriptionItem(item)}
                                    >
                                        <div>
                                            <strong>{item.product.name}</strong>
                                            <div className="muted-text">Menge: {item.quantity}</div>
                                        </div>
                                        <span>{formatInterval(item.intervalCount)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
