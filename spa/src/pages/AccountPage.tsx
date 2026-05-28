import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useOutletContext } from "react-router-dom";
import { MdEdit, MdLogout, MdOutlineWarningAmber, MdReceiptLong, MdSave } from "react-icons/md";
import { FaBell, FaMoon, FaSun } from "react-icons/fa";
import toast from "react-hot-toast";
import type { Product, RestockOrderWithProduct } from "../types/shop";
import keycloak from "../auth/keycloak";
import { useAuth } from "../auth/AuthProvider";
import { getInvoices, requestInvoicePdf, type InvoiceSummary } from "../services/invoices";
import { getMyUser, saveMyUser, type UserProfile } from "../services/users";
import type { SubscriptionProfileStatus } from "../utils/subscriptionProfile";

interface OutletContext {
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  subscriptionProfileStatus: SubscriptionProfileStatus | null;
  onSubscriptionProfileUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark") => void;
}

interface ProfileFormState {
  phone: string;
  birthDate: string;
  role: string;
  company: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  note: string;
  deliveryDay: string;
  deliveryTime: string;
  iban: string;
  bic: string;
  accountHolder: string;
}

interface NotificationState {
  email: boolean;
  confirmations: boolean;
  reminders: boolean;
}

// Pflichtfelder
const REQUIRED_FIELDS: (keyof ProfileFormState)[] = [
  "phone",
  "country",
  "street",
  "houseNumber",
  "postalCode",
  "city",
];

const RESTOCKER_REQUIRED_FIELDS: (keyof ProfileFormState)[] = [
  "phone",
  "iban",
  "bic",
  "accountHolder",
];

const CUSTOMER_REQUIRED_FIELDS: (keyof ProfileFormState)[] = [
  ...REQUIRED_FIELDS,
  "company",
];

const INVOICE_PAGE_SIZE = 3;
const UNSAVED_PROFILE_CHANGES_MESSAGE =
  "Du hast ungespeicherte Änderungen. Wenn du die Seite verlässt, gehen sie verloren.";

const EMPTY_FORM: ProfileFormState = {
  phone: "",
  birthDate: "",
  role: "",
  company: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "",
  note: "",
  deliveryDay: "",
  deliveryTime: "",
  iban: "",
  bic: "",
  accountHolder: "",
};

export function AccountPage() {
  const {
    isLoggedIn,
    onLogout,
    onSetTheme,
    theme,
    subscriptionProfileStatus,
    onSubscriptionProfileUpdated,
  } = useOutletContext<OutletContext>();
  const { hasRole, token, user } = useAuth();
  const isRestocker = hasRole("Restocker");
  const location = useLocation();

  const username = keycloak.tokenParsed?.preferred_username ?? "";
  const email = keycloak.tokenParsed?.email ?? "";
  const firstName = keycloak.tokenParsed?.given_name ?? "";
  const lastName = keycloak.tokenParsed?.family_name ?? "";

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadedUser, setLoadedUser] = useState<UserProfile | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_FORM);

  const lastSavedForm = useRef<ProfileFormState>(EMPTY_FORM);

  const [notifications, setNotifications] = useState<NotificationState>({
    email: true,
    confirmations: true,
    reminders: true,
  });
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [visibleInvoiceCount, setVisibleInvoiceCount] = useState(INVOICE_PAGE_SIZE);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return;
    }

    getMyUser({ token, kind: isRestocker ? "restocker" : "customer" })
        .then((user) => {
          setLoadedUser(user);

          const form: ProfileFormState = {
            phone: user.phoneNumber ?? "",
            birthDate: user.birthDate ?? "",
            street: user.street ?? "",
            houseNumber: user.houseNumber ?? "",
            postalCode: user.postalCode ?? "",
            city: user.city ?? "",
            country: user.country ?? "",
            iban: user.iban ?? "",
            // customer-only
            company: !isRestocker && user.kind === "customer" ? (user.companyName ?? "") : "",
            role: !isRestocker && user.kind === "customer" ? (user.roleInCompany ?? "") : "",
            note: !isRestocker && user.kind === "customer" ? (user.deliveryHint ?? "") : "",
            deliveryDay: !isRestocker && user.kind === "customer" ? (user.deliveryDay ?? "") : "",
            deliveryTime: !isRestocker && user.kind === "customer" ? String(user.deliveryTime || "") : "",
            // restocker-only
            bic: isRestocker && user.kind === "restocker" ? (user.bic ?? "") : "",
            accountHolder: isRestocker && user.kind === "restocker" ? (user.accountHolder ?? "") : "",
          };

          setProfileForm(form);
          lastSavedForm.current = form;
        })
        .catch((error) => {
          console.error("Benutzerdaten konnten nicht geladen werden.", error);
        });
  }, [isLoggedIn, isRestocker, token, user]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return;
    }

    getInvoices({ token, kind: isRestocker ? "restocker" : "customer" })
        .then((loadedInvoices) => {
          setInvoices(loadedInvoices);
          setVisibleInvoiceCount(INVOICE_PAGE_SIZE);
        })
        .catch((error) => {
          console.error("Rechnungen konnten nicht geladen werden.", error);
        });
  }, [isLoggedIn, isRestocker, token, user]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const sectionId = location.hash.slice(1);
    const scrollToSection = () => {
      const section = document.getElementById(sectionId);

      if (!section) {
        return;
      }

      const headerOffset = 96;
      const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    };

    window.requestAnimationFrame(scrollToSection);
  }, [location.hash, invoices.length]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  function getRequiredFields(): (keyof ProfileFormState)[] {
    return isRestocker ? RESTOCKER_REQUIRED_FIELDS : CUSTOMER_REQUIRED_FIELDS;
  }

  function isFieldEmpty(field: keyof ProfileFormState): boolean {
    return profileForm[field].trim() === "";
  }

  function isFieldInvalid(field: keyof ProfileFormState): boolean {
    return  getRequiredFields().includes(field) && isFieldEmpty(field);
  }

  function getFieldLabel(field: keyof ProfileFormState, label: string) {
    return getRequiredFields().includes(field) ? `${label} *` : label;
  }

  function sanitizeFieldValue(field: keyof ProfileFormState, value: string) {
    switch (field) {
      case "phone":
        return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 20);
      case "houseNumber":
        return value.replace(/\D/g, "").slice(0, 6);
      case "postalCode":
        return value.replace(/\D/g, "").slice(0, 5);
      case "deliveryTime": {
        const numericValue = value.replace(/\D/g, "").slice(0, 2);
        return numericValue === "" ? "" : String(Math.min(Number(numericValue), 24));
      }
      case "iban":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
      case "bic":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
      case "country":
      case "city":
        return value.replace(/[^A-Za-zÄÖÜäöüß\s-]/g, "").slice(0, 80);
      case "street":
        return value.replace(/[^A-Za-zÄÖÜäöüß\s.'-]/g, "").slice(0, 120);
      case "accountHolder":
      case "role":
      case "deliveryDay":
        return value.replace(/[^A-Za-zÄÖÜäöüß\s.'\/-]/g, "").slice(0, 80);
      case "company":
        return value.replace(/[^A-Za-z0-9ÄÖÜäöüß\s&.,'()+\/-]/g, "").slice(0, 120);
      case "note":
        return value.slice(0, 500);
      default:
        return value;
    }
  }

  function hasUnsavedChanges(): boolean {
    return (Object.keys(profileForm) as (keyof ProfileFormState)[]).some(
        (key) => profileForm[key] !== lastSavedForm.current[key],
    );
  }

  async function persistUser(form: ProfileFormState) {
    if (!loadedUser) return false;

    if (loadedUser.existsInUserService === false && getRequiredFields().some(isFieldEmpty)) {
      return false;
    }

    setIsSavingProfile(true);

    try {
      const savedUser =
          isRestocker
              ? await saveMyUser(
                  {
                    kind: "restocker",
                    userId: loadedUser.userId,
                    phoneNumber: form.phone,
                    birthDate: form.birthDate || undefined,
                    street: form.street,
                    houseNumber: form.houseNumber,
                    postalCode: form.postalCode,
                    city: form.city,
                    country: form.country,
                    profilePictureUrl: loadedUser.profilePictureUrl,
                    iban: form.iban,
                    bic: form.bic,
                    accountHolder: form.accountHolder,
                    existsInUserService: loadedUser.existsInUserService,
                  },
                  { token, kind: "restocker" },
              )
              : await saveMyUser(
                  {
                    kind: "customer",
                    userId: loadedUser.userId,
                    phoneNumber: form.phone,
                    birthDate: form.birthDate || undefined,
                    street: form.street,
                    houseNumber: form.houseNumber,
                    postalCode: form.postalCode,
                    city: form.city,
                    country: form.country,
                    profilePictureUrl: loadedUser.profilePictureUrl,
                    companyName: form.company,
                    roleInCompany: form.role || undefined,
                    deliveryHint: form.note || undefined,
                    deliveryDay: form.deliveryDay || undefined,
                    deliveryTime: Number(form.deliveryTime || 0),
                    iban: form.iban || undefined,
                    existsInUserService: loadedUser.existsInUserService,
                  },
                  { token, kind: "customer" },
              );

      setLoadedUser(savedUser);
      onSubscriptionProfileUpdated(savedUser);
      lastSavedForm.current = form;
      return true;
    } catch (error) {
      console.error("Benutzerdaten konnten nicht gespeichert werden.", error);
      toast.error("Deine Änderungen konnten nicht gespeichert werden.");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  function updateField<Key extends keyof ProfileFormState>(
      field: Key,
      value: ProfileFormState[Key],
  ) {
    setProfileForm((current) => ({
      ...current,
      [field]: sanitizeFieldValue(field, value),
    }));
  }

  function toggleNotification(field: keyof NotificationState) {
    setNotifications((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function formatInvoiceAmount(invoice: InvoiceSummary) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: invoice.currency,
    }).format(invoice.totalAmount);
  }

  async function handleInvoiceOpen(invoice: InvoiceSummary) {
    setLoadingInvoiceId(invoice.invoiceId);
    try {
      await requestInvoicePdf(invoice.invoiceId, {
        token,
        kind: isRestocker ? "restocker" : "customer",
      });
    } catch (error) {
      console.error("Die Rechnung konnte nicht geladen werden.", error);
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  function handleLoadMoreInvoices() {
    setVisibleInvoiceCount((current) => current + INVOICE_PAGE_SIZE);
  }

  async function handleProfileAction() {
    if (!isEditingProfile) {
      setIsEditingProfile(true);
      return;
    }

    // Nur speichern, wenn Änderungen vorliegen
    if (hasUnsavedChanges()) {
      const wasSaved = await persistUser(profileForm);

      if (!wasSaved) {
        return;
      }

      toast.success("Deine Änderungen wurden gespeichert.");
    }

    setIsEditingProfile(false);
  }

  const visibleInvoices = invoices.slice(0, visibleInvoiceCount);
  const hasMoreInvoices = visibleInvoiceCount < invoices.length;
  const showProfileProgress = subscriptionProfileStatus?.isComplete === false;

  return (
      <div className="home-showcase account-page">
        {showProfileProgress ? (
          <section className="page-card subscription-profile-progress">
            <div className="subscription-profile-progress__copy">
              <div>
                <strong>Profil noch nicht vollständig</strong>
                <p>
                  {isRestocker
                      ? "Dein Profil muss noch vervollständigt werden. Solange Pflichtfelder fehlen, kannst du keine RestockOrders ausliefern."
                      : "Dein Profil muss noch vervollständigt werden. Solange Pflichtfelder fehlen, sind Änderungen am Abo gesperrt."}
                </p>
              </div>
              <span className="subscription-profile-progress__percent">
                {subscriptionProfileStatus?.completionPercentage ?? 0}%
              </span>
            </div>

            <div
              className="subscription-profile-progress__bar"
              role="progressbar"
              aria-label="Profilfortschritt"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={subscriptionProfileStatus?.completionPercentage ?? 0}
            >
              <div
                className="subscription-profile-progress__fill"
                style={{ width: `${subscriptionProfileStatus?.completionPercentage ?? 0}%` }}
              />
            </div>

            {subscriptionProfileStatus?.missingFields.length ? (
              <p className="subscription-profile-progress__missing">
                Fehlt noch: {subscriptionProfileStatus.missingFields.join(", ")}.
              </p>
            ) : null}
          </section>
        ) : null}

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
              <strong>{isRestocker ? "Restocker" : "Customer"}</strong>
            </div>
          </div>
        </section>

        <section id="profile" className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Benutzerdaten</span>
              <h2>Profilinformationen</h2>
              <p className="section-copy">
                Deine Kontaktdaten und Organisationsinformationen für Kommunikation
                und Auftragsabwicklung.
              </p>
            </div>

            <button
                className={`button ${isEditingProfile ? "" : "button--ghost"}`.trim()}
                type="button"
                title={isEditingProfile ? "Änderungen speichern" : "Profil bearbeiten"}
                disabled={isSavingProfile}
                onClick={() => {
                  void handleProfileAction();
                }}
            >
              {isEditingProfile ? <MdSave /> : <MdEdit />}
              {isSavingProfile
                  ? "Wird gespeichert"
                  : isEditingProfile
                      ? "Änderungen speichern"
                      : "Profil bearbeiten"}
            </button>
          </div>

          <div className="account-profile-grid">
            {/* Persönliche Daten */}
            <div className="account-panel">
              <div className="account-panel__head">
                <h3 style={{ paddingBottom: "1rem" }}>Persönliche Daten</h3>
              </div>

              <div className="account-form-grid">
                {/* Keycloak-Felder – immer disabled, keine Validierung */}
                <label className="account-field">
                  <span>Benutzername</span>
                  <input value={username} disabled />
                </label>

                <label className="account-field">
                  <span>E-Mail</span>
                  <input value={email} disabled />
                </label>

                <label className="account-field">
                  <span>Vorname</span>
                  <input value={firstName} disabled />
                </label>

                <label className="account-field">
                  <span>Nachname</span>
                  <input value={lastName} disabled />
                </label>

                {/* Editierbare Felder */}
                <label className="account-field">
                  <span>Geburtsdatum</span>
                  <input
                      type="date"
                      value={profileForm.birthDate}
                      disabled={!isEditingProfile}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>{getFieldLabel("phone", "Telefon")}</span>
                  <input
                      value={profileForm.phone}
                      disabled={!isEditingProfile}
                      inputMode="tel"
                      pattern="\+?[0-9]*"
                      maxLength={20}
                      className={isFieldInvalid("phone") ? "input--invalid" : ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                  />
                </label>

                <label className="account-field account-field--full">
                  <span>
                    {isRestocker
                        ? getFieldLabel("accountHolder", "Kontoinhaber")
                        : getFieldLabel("role", "Position")}
                  </span>
                  <input
                      value={isRestocker ? profileForm.accountHolder : profileForm.role}
                      disabled={!isEditingProfile}
                      maxLength={80}
                      className={
                        isRestocker && isFieldInvalid("accountHolder") ? "input--invalid" : ""
                      }
                      onChange={(e) =>
                          updateField(isRestocker ? "accountHolder" : "role", e.target.value)
                      }
                  />
                </label>
              </div>
            </div>

            {/* Adress- und Abrechnungsdaten */}
            <div className="account-panel account-panel--accent">
              <div className="account-panel__head">
                <h3 style={{ paddingBottom: "1rem" }}>
                  {isRestocker ? "Abrechnungs- und Adressdaten" : "Lieferadresse"}
                </h3>
              </div>

              <div className="account-form-grid">
                {!isRestocker && (
                    <label className="account-field">
                      <span>{getFieldLabel("company", "Unternehmen")}</span>
                      <input
                          value={profileForm.company}
                          disabled={!isEditingProfile}
                          maxLength={120}
                          className={isFieldInvalid("company") ? "input--invalid" : ""}
                          onChange={(e) => updateField("company", e.target.value)}
                      />
                    </label>
                )}

                <label className="account-field">
                <span>{getFieldLabel("country", "Land")}</span>
                <input
                    value={profileForm.country}
                    disabled={!isEditingProfile}
                    maxLength={80}
                    className={isFieldInvalid("country") ? "input--invalid" : ""}
                    onChange={(e) => updateField("country", e.target.value)}
                />
              </label>

                <label className="account-field">
                  <span>{getFieldLabel("street", "Straße")}</span>
                  <input
                      value={profileForm.street}
                      disabled={!isEditingProfile}
                      maxLength={120}
                      className={isFieldInvalid("street") ? "input--invalid" : ""}
                      onChange={(e) => updateField("street", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>{getFieldLabel("houseNumber", "Hausnummer")}</span>
                  <input
                      value={profileForm.houseNumber}
                      disabled={!isEditingProfile}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className={isFieldInvalid("houseNumber") ? "input--invalid" : ""}
                      onChange={(e) => updateField("houseNumber", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>{getFieldLabel("postalCode", "PLZ")}</span>
                  <input
                      value={profileForm.postalCode}
                      disabled={!isEditingProfile}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      className={isFieldInvalid("postalCode") ? "input--invalid" : ""}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                  />
                </label>

                <label className="account-field">
                  <span>{getFieldLabel("city", "Ort")}</span>
                  <input
                      value={profileForm.city}
                      disabled={!isEditingProfile}
                      maxLength={80}
                      className={isFieldInvalid("city") ? "input--invalid" : ""}
                      onChange={(e) => updateField("city", e.target.value)}
                  />
                </label>


                {!isRestocker && (
                    <label className="account-field">
                      <span>Bevorzugter Liefertag</span>
                      <input
                          value={profileForm.deliveryDay}
                          disabled={!isEditingProfile}
                          maxLength={80}
                          onChange={(e) => updateField("deliveryDay", e.target.value)}
                      />
                    </label>
                )}

                {!isRestocker && (
                    <label className="account-field">
                      <span>Bevorzugte Uhrzeit</span>
                      <input
                          type="number"
                          min={0}
                          max={24}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={profileForm.deliveryTime}
                          disabled={!isEditingProfile}
                          onChange={(e) => updateField("deliveryTime", e.target.value)}
                      />
                    </label>
                )}

                <label className="account-field">
                  <span>{getFieldLabel("iban", "IBAN")}</span>
                  <input
                      value={profileForm.iban}
                      disabled={!isEditingProfile}
                      autoCapitalize="characters"
                      maxLength={34}
                      className={isFieldInvalid("iban") ? "input--invalid" : ""}
                      onChange={(e) => updateField("iban", e.target.value)}
                  />
                </label>

                {isRestocker && (
                    <label className="account-field">
                      <span>{getFieldLabel("bic", "BIC")}</span>
                      <input
                          value={profileForm.bic}
                          disabled={!isEditingProfile}
                          autoCapitalize="characters"
                          maxLength={11}
                          className={isFieldInvalid("bic") ? "input--invalid" : ""}
                          onChange={(e) => updateField("bic", e.target.value)}
                      />
                    </label>
                )}

                {!isRestocker && (
                    <label className="account-field account-field--full">
                      <span>Lieferhinweis</span>
                      <textarea
                          rows={4}
                          value={profileForm.note}
                          disabled={!isEditingProfile}
                          maxLength={500}
                          onChange={(e) => updateField("note", e.target.value)}
                      />
                    </label>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="appearence" className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Systemeinstellungen</span>
              <h2>Darstellung und Benachrichtigungen</h2>
              <p className="section-copy">
                Konfiguriere Oberfläche und Informationskanäle entsprechend deiner Arbeitsweise.
              </p>
            </div>
          </div>

          <div className="account-settings-shell">
            <div className="account-settings-section">
              <div className="account-settings-section__head">
                <div>
                  <h3>Darstellung</h3>
                  <span>Aktuelles Schema: {theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
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

        <section id="finance" className="page-card section-space">
          <div className="section-head account-section-head">
            <div>
              <span className="eyebrow">Finanzen</span>
              <h2>Monatliche Abrechnungen</h2>
              <p className="section-copy">
                {visibleInvoices.length > 0
                    ? "Deine zuletzt bereitgestellten Rechnungen der letzten Monate."
                    : "Es sind noch keine Rechnungen vorhanden."}
              </p>
            </div>
          </div>

          {visibleInvoices.length > 0 && (
              <div className="account-settings-shell">
                <div className="account-settings-section">
                  <div className="account-invoice-list" role="list">
                    {visibleInvoices.map((invoice) => (
                        <button
                            key={invoice.invoiceId}
                            className="account-invoice-item"
                            type="button"
                            onClick={() => {
                              void handleInvoiceOpen(invoice);
                            }}
                            disabled={loadingInvoiceId === invoice.invoiceId}
                        >
                          <div className="account-invoice-item__copy">
                            <span>{invoice.monthLabel}</span>
                            <strong>{invoice.title}</strong>
                          </div>
                          <span className="account-invoice-pill">
                <MdReceiptLong />
                            {formatInvoiceAmount(invoice)}
              </span>
                        </button>
                    ))}
                  </div>

                  {hasMoreInvoices ? (
                      <button
                          className="button button--ghost account-invoice-more"
                          type="button"
                          onClick={handleLoadMoreInvoices}
                      >
                        Mehr anzeigen
                      </button>
                  ) : null}
                </div>
              </div>
          )}
        </section>

        <section id="security" className="page-card section-space">
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
              <p>Diese Aktionen beeinflussen dein Konto und laufende Prozesse dauerhaft.</p>
            </div>

            <div className="account-danger-zone__actions">
              <button className="button account-danger-button" type="button">
                Abonnement beenden
              </button>
              <button
                  className="button account-danger-button account-danger-button--secondary"
                  type="button"
              >
                Konto löschen
              </button>
            </div>
          </div>
        </section>
      </div>
  );
}
