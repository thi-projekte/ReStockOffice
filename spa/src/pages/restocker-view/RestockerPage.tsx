import "../../styles/restocker-home.css";

const orders = [
    { id: "#1234", company: "Technische Hochschule Ingolstadt", addr: "Esplanade 138, 85049 Ingolstadt", date: "13.05.2026 · 11:00 Uhr", count: "10 Artikel" },
    { id: "#1354", company: "AUDI AG", addr: "Auto-Union-Straße 1, 85049 Ingolstadt", date: "13.05.2026 · 11:20 Uhr", count: "8 Artikel" },
]

function OrderTile({ order }) {
    return (
        <div className="order-tile">
            <div className="order-top">
                <span className="order-id">{order.id}</span>
            </div>
            <div className="order-company">{order.company}</div>
            <div className="order-addr">
                {order.addr}
            </div>
            <div className="order-meta">
                <span>{order.date}</span>
                <span>{order.count}</span>
            </div>
        </div>
    );
}

export function RestockerPage() {
    return (
        <>
            <div className="restocker-page">
                <div className="restocker-inner">

                    <button className="tour-btn">
                        Tour von heute beginnen
                    </button>

                    {/* Heutige Lieferungen */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Lieferungen heute</h4>
                                <h2>Übersicht – Heutige Lieferungen</h2>
                                <p> Hallo, hier siehst du die wichtigsten Kennzahlen zu deinen heutigen Lieferungen.</p>
                            </div>
                        </div>

                        <div className="metrics-row-desktop">
                            <div className="metric-tile">
                                <div className="metric-label">Abgeschlossen</div>
                                <div className="metric-value">2</div>
                                <div className="metric-sub">von 10 Lieferungen</div>
                            </div>
                            <div className="metric-tile">
                                <div className="metric-label">Heutiger Verdienst</div>
                                <div className="metric-value">30 €</div>
                            </div>

                        </div>

                        <button className="tour-btn">
                            Alle heutigen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Offene Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Verfügbare Aufträge</h4>
                                <h2>Offene Lieferungen in deiner Nähe</h2>
                                <p>Es gibt weitere Lieferungen in deiner Nähe. Beispielsweise:</p>
                            </div>
                        </div>

                        <div className="orders-grid">
                            {orders.map(o => <OrderTile key={o.id} order={o} />)}
                        </div>

                        <button className="tour-btn">
                            Alle offenen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Meine Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Aufträge</h4>
                                <h2>Deine Übersicht</h2>
                                <p>Hier einige Aufträge, die du dir gesichert hast.</p>
                            </div>
                        </div>

                        <div className="orders-grid">
                            {orders.map(o => <OrderTile key={o.id} order={o} />)}
                        </div>

                        <button className="tour-btn">
                            Alle dir zugeordneten Aufträge anzeigen
                        </button>
                    </div>


                </div>
            </div>
        </>
    );
}
