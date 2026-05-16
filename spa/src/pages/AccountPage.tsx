import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { MdEdit, MdLogout, MdOutlineWarningAmber, MdSave } from "react-icons/md";
import { FaBell, FaMoon, FaSun } from "react-icons/fa";
import type {
  Product,
  RestockOrderWithProduct,
} from "../types/shop";
import keycloak from "../auth/keycloak";
import {useAuth} from "../auth/AuthProvider";
import { getUserbyId } from "../services/users";

interface OutletContext {
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark") => void;
}

interface ProfileFormState {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  role: string;
  company: string;
  street: string;
  city: string;
  note: string;
}

interface NotificationState {
  email: boolean;
  confirmations: boolean;
  reminders: boolean;
}

export function AccountPage() {
  const { isLoggedIn, onLogout, onSetTheme, theme } =
      useOutletContext<OutletContext>();
  const { hasRole, token, user } = useAuth();

  const username =
      keycloak.tokenParsed?.preferred_username ?? "unbekannt";

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    email: keycloak.tokenParsed?.email ?? "",
    firstName: keycloak.tokenParsed?.given_name ?? "",
    lastName: keycloak.tokenParsed?.family_name ?? "",
    phone: "+49 152 89123123",
    birthDate: "2000-01-01",
    role: "Einkauf",
    company: "ReStockOffice GmbH",
    street: "Musterstraße 100",
    city: "85049 Ingolstadt",
    note: "Warenannahme Tor 2 – Empfang informieren",
  });

  const [notifications, setNotifications] = useState<NotificationState>({
    email: true,
    confirmations: true,
    reminders: true,
  });

  useEffect(() => {
    const userId = user?.id ?? keycloak.tokenParsed?.sub;

    if (!isLoggedIn || !userId) {
      return;
    }

    getUserbyId(userId, { token })
      .then((loadedUser) => {
        setProfileForm((current) => ({
          ...current,
          phone: loadedUser.phoneNumber,
        }));
      })
      .catch((error) => {
        console.error("Benutzerdaten konnten nicht geladen werden.", error);
      });
  }, [isLoggedIn, token, user?.id]);


  // Boolean zum Überprüfen ob als Restocker eingeloggt oder nicht
  const isRestocker = hasRole("Restocker");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  function updateField<Key extends keyof ProfileFormState>(
      field: Key,
      value: ProfileFormState[Key],
  ) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleNotification(field: keyof NotificationState) {
    setNotifications((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  return (
      <div className="home-showcase account-page">

        {/* HERO */}
        <section className="page-card section-space account-hero">
          <div className="account-hero__copy">
            <span className="eyebrow">Kontoübersicht</span>
            <h1>Kontoeinstellungen und Profilverwaltung</h1>
            <p className="section-copy">
              Verwalte deine persönlichen Daten, Systemeinstellungen und
              sicherheitsrelevanten Funktionen zentral an einem Ort.
            </p>
          </div>

          <div className="account-hero__summary">
            <div className="account-badge">
              <span>Benutzerkonto</span>
              <strong>{username}</strong>
            </div>
            <div className="account-badge">
              <span>Status</span>
              <strong>Aktiv</strong>
            </div>
            <div className="account-badge">
              <span>Rolle</span>
              <strong>{profileForm.role}</strong>
            </div>
          </div>
        </section>

        {/* PROFILE */}
        <section className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Benutzerdaten</span>
              <h2>Profilinformationen</h2>
              <p className="section-copy">
                Deine  Kontaktdaten und Organisationsinformationen für die Kommunikation und Auftragsabwicklung.
              </p>
            </div>

            <button
                className={`button ${isEditingProfile ? "" : "button--ghost"}`.trim()}
                type="button"
                title={isEditingProfile ? "Änderungen speichern" : "Profil bearbeiten"}
                onClick={() => setIsEditingProfile((v) => !v)}
            >
              {isEditingProfile ? <MdSave /> : <MdEdit />}
              {isEditingProfile ? "Änderungen speichern" : "Profil bearbeiten"}
            </button>
          </div>

          <div className="account-profile-grid">

            <div className="account-panel">
              <div className="account-panel__head">
                <h3>Stammdaten</h3>
                <span>Basisdaten für Benutzerkonto und Kommunikation.</span>
              </div>

              <div className="account-form-grid">
                <label className="account-field">
                  <span>Benutzername</span>
                  <input value={username} disabled />
                </label>

                <label className="account-field">
                  <span>E-Mail</span>
                  <input
                      value={profileForm.email}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("email", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>Vorname</span>
                  <input
                      value={profileForm.firstName}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("firstName", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>Nachname</span>
                  <input
                      value={profileForm.lastName}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>Telefon</span>
                  <input
                      value={profileForm.phone}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("phone", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>Geburtsdatum</span>
                  <input
                      type="date"
                      value={profileForm.birthDate}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                  />
                </label>

                <label className="account-field account-field--full">
                  <span>Position</span>
                  <input
                      value={profileForm.role}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("role", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="account-panel account-panel--accent">
              <div className="account-panel__head">
                <h3>Lieferadresse</h3>
                <span>Wird für Bestellungen und Abonnements verwendet.</span>
              </div>

              <div className="account-form-grid">
                <label className="account-field">
                  <span>Unternehmen</span>
                  <input
                      value={profileForm.company}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("company", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>Straße</span>
                  <input
                      value={profileForm.street}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("street", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>PLZ / Ort</span>
                  <input
                      value={profileForm.city}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("city", e.target.value)}
                  />
                </label>

                <label className="account-field account-field--full">
                  <span>Lieferhinweis</span>
                  <textarea
                      rows={4}
                      value={profileForm.note}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("note", e.target.value)}
                  />
                </label>
              </div>
            </div>

          </div>
        </section>

        {/* SETTINGS */}
        <section className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Systemeinstellungen</span>
              <h2>Darstellung & Benachrichtigungen</h2>
              <p className="section-copy">
                Konfiguriere Oberfläche und Informationskanäle entsprechend deiner Arbeitsweise.
              </p>
            </div>
          </div>

          <div className="account-settings-shell">

            {/* THEME */}
            <div className="account-settings-section">
              <div className="account-settings-section__head">
                <div>
                  <h3>Darstellung</h3>
                  <span>
                  Aktuelles Schema: {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </span>
                </div>
              </div>

              <div className="account-theme-grid">
                <button
                    className={`account-theme-option ${theme === "light" ? "active" : ""}`.trim()}
                    type="button"
                    onClick={() => onSetTheme("light")}
                >
                  <div className="account-theme-option__swatch account-theme-option__swatch--light" />
                  <strong>Light Mode</strong>
                  <FaSun />
                </button>

                <button
                    className={`account-theme-option ${theme === "dark" ? "active" : ""}`.trim()}
                    type="button"
                    onClick={() => onSetTheme("dark")}
                >
                  <div className="account-theme-option__swatch account-theme-option__swatch--dark" />
                  <strong>Dark Mode</strong>
                  <FaMoon />
                </button>
              </div>
            </div>

            <div className="account-settings-divider" />

            {/* NOTIFICATIONS */}
            <div className="account-settings-section">
              <div className="account-settings-section__head">
                <div>
                  <h3>Benachrichtigungen</h3>
                  <span>Steuere System- und Prozessmeldungen.</span>
                </div>
              </div>

              <div className="account-toggle-list">

                <button
                    className={`account-toggle-button ${notifications.email ? "active" : ""}`.trim()}
                    type="button"
                    onClick={() => toggleNotification("email")}
                >
                  <div>
                    <strong>E-Mail-Systemmeldungen</strong>
                    <span>Kontostatus und allgemeine Systemupdates</span>
                  </div>
                  <span className="account-toggle-pill">
                  <FaBell />
                    {notifications.email ? " Aktiv" : " Inaktiv"}
                </span>
                </button>

                <button
                    className={`account-toggle-button ${notifications.confirmations ? "active" : ""}`.trim()}
                    type="button"
                    onClick={() => toggleNotification("confirmations")}
                >
                  <div>
                    <strong>Auftragsbestätigungen</strong>
                    <span>Benachrichtigung nach jeder Bestellung</span>
                  </div>
                  <span className="account-toggle-pill">
                  <FaBell />
                    {notifications.confirmations ? " Aktiv" : " Inaktiv"}
                </span>
                </button>

                <button
                    className={`account-toggle-button ${notifications.reminders ? "active" : ""}`.trim()}
                    type="button"
                    onClick={() => toggleNotification("reminders")}
                >
                  <div>
                    <strong>Abo-Erinnerungen</strong>
                    <span>Hinweise vor automatischen Lieferungen</span>
                  </div>
                  <span className="account-toggle-pill">
                  <FaBell />
                    {notifications.reminders ? " Aktiv" : " Inaktiv"}
                </span>
                </button>

              </div>
            </div>

          </div>
        </section>

        {/* SECURITY */}
        <section className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Sicherheit</span>
              <h2>Zugriff und Kontoverwaltung</h2>
              <p className="section-copy">
                Sicherheits- und Zugriffsfunktionen für dein Benutzerkonto.
              </p>
            </div>
          </div>

          <div className="account-action-row">
            <button className="button button--ghost" type="button">
              Passwort zurücksetzen
            </button>

            <button
                className="button account-action-button account-action-button--logout"
                type="button"
                onClick={onLogout}
            >
              <MdLogout />
              Abmelden
            </button>
          </div>

          <div className="account-danger-zone">
            <div className="account-danger-zone__copy">
              <h3>
                <MdOutlineWarningAmber />
                Kritische Aktionen
              </h3>
              <p>
                Diese Aktionen beeinflussen dein Konto und laufende Prozesse dauerhaft.
              </p>
            </div>

            <div className="account-danger-zone__actions">
              <button className="button account-danger-button" type="button">
                Abonnement beenden
              </button>
              <button className="button account-danger-button account-danger-button--secondary" type="button">
                Konto löschen
              </button>
            </div>
          </div>
        </section>

      </div>
  );
}
