
import { Link } from "react-router-dom";

export function RestockerPage() {
    return (
        <div className="home-showcase">

            {/* Button (ohne Funktion aktuell) */}
            <button className="dashboard-btn button">
                TOUR VON HEUTE BEGINNEN
            </button>


            {/* //Card Heutige Lieferungen */}
            <section className="page-card section-space">

                <div className="section-head">
                    <div>
                        <span className="eyebrow">Deine Lieferungen heute</span>
                        <h2>Status Heute: 2 von 10 offen</h2>
                        <p>Hallo Max, hier siehst du deine heutigen Lieferungen.</p>
                    </div>

                    <Link className="button dashboard-btn" to="/restocker-orders">
                        Alle heutigen Lieferungen anzeigen →
                    </Link>
                </div>

                <div className="category-grid">

                    <div className="highlight-tile">
                        <h3>#1234</h3>
                        <p>Technische Hochschule Ingolstadt</p>
                        <span>Esplanade 138, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:00 Uhr</small>
                        <strong>10 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1354</h3>
                        <p>AUDI AG</p>
                        <span>Auto-Union-Straße 1, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:20 Uhr</small>
                        <strong>8 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1355</h3>
                        <p>COM-IN Telekommunikations GmbH</p>
                        <span>Mauthstraße 4, 85051 Ingolstadt</span>
                        <small>13.05.2026 | 11:30 Uhr</small>
                        <strong>6 Artikel</strong>
                    </div>

                </div>
            </section>

            {/* //Card Offene Aufträge */}

            <section className="page-card section-space">

                <div className="section-head">
                    <div>
                        <span className="eyebrow">Verfügbare Aufträge</span>
                        <h2>Offene Lieferungen in deiner Nähe</h2>
                        <p>Wähle einen Auftrag aus, um die Details zu sehen und die Fahrt zu übernehmen.</p>
                    </div>

                    <Link className="button dashboard-btn" to="/restocker-orders">
                        Alle offenen Aufträge anzeigen →
                    </Link>
                </div>

                <div className="category-grid">

                    <div className="highlight-tile">
                        <h3>#1234</h3>
                        <p>Technische Hochschule Ingolstadt</p>
                        <span>Esplanade 138, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:00 Uhr</small>
                        <strong>10 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1354</h3>
                        <p>AUDI AG</p>
                        <span>Auto-Union-Straße 1, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:20 Uhr</small>
                        <strong>8 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1355</h3>
                        <p>COM-IN Telekommunikations GmbH</p>
                        <span>Mauthstraße 4, 85051 Ingolstadt</span>
                        <small>13.05.2026 | 11:30 Uhr</small>
                        <strong>6 Artikel</strong>
                    </div>

                </div>
            </section>

            {/* //Card Meine Aufträge */}

            <section className="page-card section-space">

                <div className="section-head">
                    <div>
                        <span className="eyebrow">Deine Aufträge</span>
                        <h2>Deine Übersicht</h2>
                        <p>Hier die Aufträge, die du dir gesichert hast.</p>
                    </div>

                    <Link className="button dashboard-btn" to="/restocker-orders">
                        Deine Aufträge anzeigen →
                    </Link>
                </div>

                <div className="category-grid">

                    <div className="highlight-tile">
                        <h3>#1234</h3>
                        <p>Technische Hochschule Ingolstadt</p>
                        <span>Esplanade 138, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:00 Uhr</small>
                        <strong>10 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1354</h3>
                        <p>AUDI AG</p>
                        <span>Auto-Union-Straße 1, 85049 Ingolstadt</span>
                        <small>13.05.2026 | 11:20 Uhr</small>
                        <strong>8 Artikel</strong>
                    </div>

                    <div className="highlight-tile">
                        <h3>#1355</h3>
                        <p>COM-IN Telekommunikations GmbH</p>
                        <span>Mauthstraße 4, 85051 Ingolstadt</span>
                        <small>13.05.2026 | 11:30 Uhr</small>
                        <strong>6 Artikel</strong>
                    </div>

                </div>
            </section>


        </div>
    );
}