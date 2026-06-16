import {type ReactElement, useEffect, useRef, useState} from "react";
import {Navigate, useLocation, useOutletContext} from "react-router-dom";
import {MdEdit, MdLogout, MdOutlineWarningAmber, MdReceiptLong, MdSave} from "react-icons/md";
import {FaBell, FaMoon, FaSun} from "react-icons/fa";
import toast from "react-hot-toast";
import type {Product, RestockOrderWithProduct} from "../types/shop";
import keycloak from "../auth/keycloak";
import {useAuth} from "../auth/AuthProvider";
import {getInvoices, requestInvoicePdf, type InvoiceSummary} from "../services/invoices";
import {getMyUser, saveMyUser, type UserProfile} from "../services/users";
import type {SubscriptionProfileStatus} from "../utils/subscriptionProfile";
import {useAddressAutocomplete} from "../utils/useAddressAutocomplete";
import {
  computeErrors,
  formatBIC,
  formatIBAN,
  formatPhone,
  type FormErrors,
  type ProfileFormState,
} from "../utils/profileValidation";

// ─── Typen ───────────────────────────────────────────────────────────────────

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

interface NotificationState {
  email: boolean;
  confirmations: boolean;
  reminders: boolean;
}

// ─── Konstanten ──────────────────────────────────────────────────────────────

const ALLOWED_COUNTRIES = ["Deutschland", "Österreich", "Schweiz"] as const;
const DELIVERY_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"] as const;

const RESTOCKER_REQUIRED_FIELDS: (keyof ProfileFormState)[] = [
  "phone", "iban", "bic", "accountHolder",
];

const CUSTOMER_REQUIRED_FIELDS: (keyof ProfileFormState)[] = [
  "phone", "country", "street", "houseNumber", "postalCode", "city", "company",
];

const INVOICE_PAGE_SIZE = 3;

const EMPTY_FORM: ProfileFormState = {
  phone: "", birthDate: "", role: "", company: "", street: "",
  houseNumber: "", postalCode: "", city: "", country: "",
  note: "", deliveryDay: "", deliveryTime: "", iban: "", bic: "", accountHolder: "",
};

const NOTIFICATION_OPTIONS: {
  key: keyof NotificationState;
  title: string;
  description: string;
}[] = [
  {
    key: "email",
    title: "E-Mail-Systemmeldungen",
    description: "Kontostatus und allgemeine Systemupdates",
  },
  {
    key: "confirmations",
    title: "Auftragsbestätigungen",
    description: "Benachrichtigung nach jeder Bestellung",
  },
  {
    key: "reminders",
    title: "Abo-Erinnerungen",
    description: "Hinweise vor automatischen Lieferungen",
  },
];

function formatDeliveryTimeInput(hour: number | undefined): string {
  if (hour === undefined || !Number.isFinite(hour) || hour <= 0) {
    return "";
  }

  return `${String(Math.trunc(hour)).padStart(2, "0")}:00`;
}

// ─── Komponente ──────────────────────────────────────────────────────────────

export function AccountPage(): ReactElement {
  const {
    isLoggedIn, onLogout, onSetTheme, theme,
    subscriptionProfileStatus, onSubscriptionProfileUpdated,
  } = useOutletContext<OutletContext>();
  const {hasRole, token, user} = useAuth();
  const isRestocker = hasRole("Restocker");
  const userKind = isRestocker ? "restocker" : "customer";
  const location = useLocation();

  const username = keycloak.tokenParsed?.preferred_username ?? "";
  const email = keycloak.tokenParsed?.email ?? "";
  const firstName = keycloak.tokenParsed?.given_name ?? "";
  const lastName = keycloak.tokenParsed?.family_name ?? "";

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadedUser, setLoadedUser] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof ProfileFormState>>(new Set());
  const lastSavedForm = useRef<ProfileFormState>(EMPTY_FORM);

  const [notifications, setNotifications] = useState<NotificationState>({
    email: true, confirmations: true, reminders: true,
  });
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [visibleInvoiceCount, setVisibleInvoiceCount] = useState(INVOICE_PAGE_SIZE);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  // Adress-Autocomplete
  const addressAC = useAddressAutocomplete();
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressContainerRef = useRef<HTMLDivElement>(null);

  // ── Daten laden ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    getMyUser({token, kind: userKind})
      .then((u) => {
        setLoadedUser(u);
        const form: ProfileFormState = {
          phone: u.phoneNumber ?? "",
          birthDate: u.birthDate ?? "",
          street: u.street ?? "",
          houseNumber: u.houseNumber ?? "",
          postalCode: u.postalCode ?? "",
          city: u.city ?? "",
          country: u.country ?? "",
          iban: u.iban ?? "",
          company: !isRestocker && u.kind === "customer" ? (u.companyName ?? "") : "",
          role: !isRestocker && u.kind === "customer" ? (u.roleInCompany ?? "") : "",
          note: !isRestocker && u.kind === "customer" ? (u.deliveryHint ?? "") : "",
          deliveryDay: !isRestocker && u.kind === "customer" ? (u.deliveryDay ?? "") : "",
          deliveryTime: !isRestocker && u.kind === "customer" ? formatDeliveryTimeInput(u.deliveryTime) : "",
          bic: isRestocker && u.kind === "restocker" ? (u.bic ?? "") : "",
          accountHolder: isRestocker && u.kind === "restocker" ? (u.accountHolder ?? "") : "",
        };
        setProfileForm(form);
        lastSavedForm.current = form;
      })
      .catch(() => undefined);
  }, [isLoggedIn, isRestocker, token, user, userKind]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    getInvoices({token, kind: userKind})
      .then((loaded) => {
        setInvoices(loaded);
        setVisibleInvoiceCount(INVOICE_PAGE_SIZE);
      })
      .catch(() => undefined);
  }, [isLoggedIn, token, user, userKind]);

  useEffect(() => {
    if (!location.hash) return;
    const sectionId = location.hash.slice(1);
    globalThis.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({top, behavior: "smooth"});
    });
  }, [location.hash, invoices.length]);

  // Suggestionen schließen bei Klick außerhalb
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (addressContainerRef.current && !addressContainerRef.current.contains(e.target as Node)) {
        setShowAddressSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoggedIn) return <Navigate to="/login" replace/>;

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────

  function getRequiredFields(): (keyof ProfileFormState)[] {
    return isRestocker ? RESTOCKER_REQUIRED_FIELDS : CUSTOMER_REQUIRED_FIELDS;
  }

  function isFieldEmpty(field: keyof ProfileFormState): boolean {
    return profileForm[field].trim() === "";
  }

  function isFieldInvalid(field: keyof ProfileFormState): boolean {
    const required = getRequiredFields().includes(field) && isFieldEmpty(field);
    const hasError = touchedFields.has(field) && !!formErrors[field];
    return required || hasError;
  }

  function getFieldLabel(field: keyof ProfileFormState, label: string): string {
    return getRequiredFields().includes(field) ? `${label} *` : label;
  }

  function getFieldError(field: keyof ProfileFormState): string | undefined {
    return touchedFields.has(field) ? formErrors[field] : undefined;
  }

  function hasUnsavedChanges(): boolean {
    return (Object.keys(profileForm) as (keyof ProfileFormState)[]).some(
      (key) => profileForm[key] !== lastSavedForm.current[key],
    );
  }

  // ── Feldaktualisierung ─────────────────────────────────────────────────────

  function updateField<K extends keyof ProfileFormState>(field: K, value: string): void {
    let sanitized = value;

    switch (field) {
      case "phone":
        sanitized = formatPhone(value);
        break;
      case "iban":
        sanitized = formatIBAN(value);
        break;
      case "bic":
        sanitized = formatBIC(value);
        break;
      case "houseNumber":
        sanitized = value.replace(/\D/g, "").slice(0, 6);
        break;
      case "postalCode":
        sanitized = value.replace(/\D/g, "").slice(0, 5);
        break;
      case "note":
        sanitized = value.slice(0, 300);
        break;
    }

    const updated = {...profileForm, [field]: sanitized};
    setProfileForm(updated);
    setFormErrors(computeErrors(updated));
  }

  function touchField(field: keyof ProfileFormState): void {
    setTouchedFields((prev) => new Set([...prev, field]));
  }

  // ── Adress-Autocomplete ────────────────────────────────────────────────────

  function handleAddressSearchChange(value: string): void {
    addressAC.setQuery(value);
    setShowAddressSuggestions(true);
    // Straße direkt in das Feld schreiben während der User tippt
    updateField("street", value);
  }

  function handleAddressSelect(suggestion: typeof addressAC.suggestions[0]): void {
    const updated: ProfileFormState = {
      ...profileForm,
      street: suggestion.street,
      houseNumber: suggestion.houseNumber,
      postalCode: suggestion.postalCode,
      city: suggestion.city,
      country: suggestion.country,
    };
    setProfileForm(updated);
    setFormErrors(computeErrors(updated));
    addressAC.setQuery(suggestion.street);
    addressAC.setSuggestions([]);
    setShowAddressSuggestions(false);
    // Alle Adressfelder als berührt markieren
    setTouchedFields((prev) => new Set([...prev, "street", "city", "postalCode", "country"]));
  }

  // ── Persistierung ──────────────────────────────────────────────────────────

  async function persistUser(form: ProfileFormState): Promise<boolean> {
    if (!loadedUser) return false;

    // Alle Felder als berührt markieren → Fehler sichtbar machen
    setTouchedFields(new Set(Object.keys(form) as (keyof ProfileFormState)[]));
    const errors = computeErrors(form);
    const hasValidationErrors = Object.keys(errors).length > 0;
    const hasMissingRequired = getRequiredFields().some((f) => form[f].trim() === "");

    if (hasValidationErrors || hasMissingRequired) {
      toast.error("Bitte korrigiere die markierten Felder.");
      return false;
    }

    setIsSavingProfile(true);
    try {
      const savedUser = isRestocker
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
          {token, kind: userKind},
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
            deliveryTime: Number(form.deliveryTime?.split(":")[0] || 0),
            iban: form.iban,
            existsInUserService: loadedUser.existsInUserService,
          },
          {token, kind: userKind},
        );

      setLoadedUser(savedUser);
      onSubscriptionProfileUpdated(savedUser);
      lastSavedForm.current = form;
      return true;
    } catch {
      toast.error("Deine Änderungen konnten nicht gespeichert werden.");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleProfileAction(): Promise<void> {
    if (!isEditingProfile) {
      setIsEditingProfile(true);
      return;
    }
    if (hasUnsavedChanges()) {
      const wasSaved = await persistUser(profileForm);
      if (!wasSaved) return;
      toast.success("Deine Änderungen wurden gespeichert.");
    }
    setIsEditingProfile(false);
  }

  function toggleNotification(field: keyof NotificationState): void {
    setNotifications((c) => ({...c, [field]: !c[field]}));
  }

  function formatInvoiceAmount(invoice: InvoiceSummary): string {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: invoice.currency,
    }).format(invoice.totalAmount);
  }

  async function handleInvoiceOpen(invoice: InvoiceSummary): Promise<void> {
    setLoadingInvoiceId(invoice.invoiceId);
    try {
      await requestInvoicePdf(invoice.invoiceId, {
        token, kind: userKind,
      });
    } catch {
      return;
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  const visibleInvoices = invoices.slice(0, visibleInvoiceCount);
  const hasMoreInvoices = visibleInvoiceCount < invoices.length;
  const showProfileProgress = subscriptionProfileStatus?.isComplete === false;

  // ─── Render ───────────────────────────────────────────────────────────────

  function renderProfileProgress(): ReactElement | null {
    if (!showProfileProgress) {
      return null;
    }

    return (
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
          <progress
            className="subscription-profile-progress__bar"
            aria-label="Profilfortschritt"
            value={subscriptionProfileStatus?.completionPercentage ?? 0}
            max={100}
          />
          {subscriptionProfileStatus?.missingFields.length ? (
            <p className="subscription-profile-progress__missing">
              Fehlt noch: {subscriptionProfileStatus.missingFields.join(", ")}.
            </p>
          ) : null}
        </section>
    );
  }

  function renderHeroSection(): ReactElement {
    return (
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
          <div className="account-badge"><span>Benutzerkonto</span><strong>{username}</strong></div>
          <div className="account-badge"><span>Unternehmen</span><strong>{profileForm.company || "—"}</strong>
          </div>
          <div className="account-badge">
            <span>Rolle</span><strong>{isRestocker ? "Restocker" : "Customer"}</strong></div>
        </div>
      </section>
    );
  }

  function renderProfileSection(): ReactElement {
    return (
      <section id="profile" className="page-card section-space">
        <div className="section-head account-section-head">
          <div>
            <span className="eyebrow">Benutzerdaten</span>
            <h2>Profilinformationen</h2>
            <p className="section-copy">
              Deine Kontaktdaten und Organisationsinformationen für Kommunikation und Auftragsabwicklung.
            </p>
          </div>
          <button
            className={`button ${isEditingProfile ? "" : "button--ghost"}`.trim()}
            type="button"
            disabled={isSavingProfile}
            onClick={() => {
              void handleProfileAction();
            }}
          >
            {isEditingProfile ? <MdSave/> : <MdEdit/>}
            {
              isSavingProfile
                ? "Wird gespeichert"
                : (isEditingProfile ? "Änderungen speichern" : "Profil bearbeiten")
            }
          </button>
        </div>

        <div className="account-profile-grid">
          {/* ── Persönliche Daten ── */}
          <div className="account-panel">
            <div className="account-panel__head">
              <h3 style={{paddingBottom: "1rem"}}>Persönliche Daten</h3>
            </div>
            <div className="account-form-grid">
              <label className="account-field">
                <span>Benutzername</span>
                <input value={username} disabled/>
              </label>
              <label className="account-field">
                <span>E-Mail</span>
                <input value={email} disabled/>
              </label>
              <label className="account-field">
                <span>Vorname</span>
                <input value={firstName} disabled/>
              </label>
              <label className="account-field">
                <span>Nachname</span>
                <input value={lastName} disabled/>
              </label>

              {/* Geburtsdatum */}
              <label className="account-field">
                <span>Geburtsdatum</span>
                <input
                  type="date"
                  value={profileForm.birthDate}
                  disabled={!isEditingProfile}
                  onChange={(e) => updateField("birthDate", e.target.value)}
                />
              </label>

              {/* Telefon */}
              <label className="account-field">
                <span>{getFieldLabel("phone", "Telefon")}</span>
                <input
                  value={profileForm.phone}
                  disabled={!isEditingProfile}
                  inputMode="tel"
                  placeholder="+49 151 12345678"
                  className={isFieldInvalid("phone") ? "input--invalid" : ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  onBlur={() => touchField("phone")}
                />
                {getFieldError("phone") && (
                  <span className="account-field__error">{getFieldError("phone")}</span>
                )}
              </label>

              {/* Kontoinhaber / Position */}
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
                  className={isRestocker && isFieldInvalid("accountHolder") ? "input--invalid" : ""}
                  onChange={(e) => updateField(isRestocker ? "accountHolder" : "role", e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* ── Adresse / Abrechnung ── */}
          <div className="account-panel account-panel--accent">
            <div className="account-panel__head">
              <h3 style={{paddingBottom: "1rem"}}>
                {isRestocker ? "Abrechnungs- und Adressdaten" : "Lieferadresse"}
              </h3>
            </div>
            <div className="account-form-grid">

              {/* Unternehmen (nur Customer) */}
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

              {/* Land */}
              <label className="account-field">
                <span>{getFieldLabel("country", "Land")}</span>
                <select
                  value={profileForm.country}
                  disabled={!isEditingProfile}
                  className={`account-field__select${isFieldInvalid("country") ? " input--invalid" : ""}`}
                  onChange={(e) => updateField("country", e.target.value)}
                >
                  <option value="">Bitte wählen</option>
                  {ALLOWED_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              {/* Straße + Hausnummer */}
              <div className="account-field account-field--full account-street-row">
                <div className="account-field" ref={addressContainerRef} style={{position: "relative"}}>
                  <span>{getFieldLabel("street", "Straße")}</span>
                  <input
                    value={isEditingProfile ? addressAC.query || profileForm.street : profileForm.street}
                    disabled={!isEditingProfile}
                    placeholder="Straße eingeben und aus Vorschlägen wählen…"
                    autoComplete="off"
                    className={isFieldInvalid("street") ? "input--invalid" : ""}
                    onChange={(e) => handleAddressSearchChange(e.target.value)}
                    onFocus={() => setShowAddressSuggestions(true)}
                    onBlur={() => touchField("street")}
                  />
                  {showAddressSuggestions && addressAC.suggestions.length > 0 && isEditingProfile && (
                    <ul className="account-address-suggestions">
                      {addressAC.suggestions.map((s) => (
                        <li key={`${s.street}-${s.houseNumber}-${s.postalCode}-${s.city}`}>
                          <button
                            type="button"
                            className="account-address-suggestion-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleAddressSelect(s);
                            }}
                          >
                            <strong>{s.street} {s.houseNumber}</strong>
                            <span>{s.postalCode} {s.city}, {s.country}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {addressAC.isLoading && isEditingProfile && (
                    <span className="account-field__hint">Suche Adressen…</span>
                  )}
                </div>
                <label className="account-field account-field--hnr">
                  <span>{getFieldLabel("houseNumber", "Hausnr.")}</span>
                  <input
                    value={profileForm.houseNumber}
                    disabled={!isEditingProfile}
                    inputMode="numeric"
                    maxLength={6}
                    className={isFieldInvalid("houseNumber") ? "input--invalid" : ""}
                    onChange={(e) => updateField("houseNumber", e.target.value)}
                  />
                </label>
              </div>

              {/* PLZ + Ort */}
              <label className="account-field">
                <span>{getFieldLabel("postalCode", "PLZ")}</span>
                <input
                  value={profileForm.postalCode}
                  disabled={!isEditingProfile}
                  inputMode="numeric"
                  maxLength={5}
                  className={isFieldInvalid("postalCode") ? "input--invalid" : ""}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  onBlur={() => touchField("postalCode")}
                />
                {getFieldError("postalCode") && (
                  <span className="account-field__error">{getFieldError("postalCode")}</span>
                )}
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

              {/* Liefertag + Uhrzeit (nur Customer) */}
              {!isRestocker && (
                <label className="account-field">
                  <span>Bevorzugter Liefertag</span>
                  <select
                    value={profileForm.deliveryDay}
                    disabled={!isEditingProfile}
                    className="account-field__select"
                    onChange={(e) => updateField("deliveryDay", e.target.value)}
                  >
                    {DELIVERY_DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              )}
              {!isRestocker && (
                <label className="account-field">
                  <span>Bevorzugte Uhrzeit</span>
                  <input
                    type="time"
                    value={profileForm.deliveryTime}
                    disabled={!isEditingProfile}
                    min="07:00"
                    max="18:00"
                    className={isFieldInvalid("deliveryTime") ? "input--invalid" : ""}
                    onChange={(e) => updateField("deliveryTime", e.target.value)}
                    onBlur={() => touchField("deliveryTime")}
                  />
                  {getFieldError("deliveryTime") && (
                    <span className="account-field__error">{getFieldError("deliveryTime")}</span>
                  )}
                </label>
              )}

              {/* IBAN */}
              <label className="account-field account-field--full">
                <span>{getFieldLabel("iban", "IBAN")}</span>
                <input
                  value={profileForm.iban}
                  disabled={!isEditingProfile}
                  autoCapitalize="characters"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  maxLength={34}
                  className={isFieldInvalid("iban") ? "input--invalid" : ""}
                  onChange={(e) => updateField("iban", e.target.value)}
                  onBlur={() => touchField("iban")}
                />
                {getFieldError("iban") && (
                  <span className="account-field__error">{getFieldError("iban")}</span>
                )}
              </label>

              {/* BIC (nur Restocker) */}
              {isRestocker && (
                <label className="account-field account-field--full">
                  <span>{getFieldLabel("bic", "BIC")}</span>
                  <input
                    value={profileForm.bic}
                    disabled={!isEditingProfile}
                    autoCapitalize="characters"
                    placeholder="COBADEFFXXX"
                    maxLength={11}
                    className={isFieldInvalid("bic") ? "input--invalid" : ""}
                    onChange={(e) => updateField("bic", e.target.value)}
                    onBlur={() => touchField("bic")}
                  />
                  {getFieldError("bic") && (
                    <span className="account-field__error">{getFieldError("bic")}</span>
                  )}
                </label>
              )}

              {/* Lieferhinweis (nur Customer) */}
              {!isRestocker && (
                <div className="account-field account-field--full">
                  <div className="account-field__head-row">
                    <span>Lieferhinweis</span>
                    <span className="account-field__counter">{profileForm.note.length}/300</span>
                  </div>
                  <textarea
                    rows={4}
                    value={profileForm.note}
                    disabled={!isEditingProfile}
                    maxLength={300}
                    className={profileForm.note.length >= 300 ? "input--invalid" : ""}
                    onChange={(e) => updateField("note", e.target.value)}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderSettingsSection(): ReactElement {
    return (
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
                <div className="account-theme-option__swatch account-theme-option__swatch--light"/>
                <strong>Light Mode</strong>
                <FaSun/>
              </button>
              <button
                className={`account-theme-option ${theme === "dark" ? "active" : ""}`.trim()}
                type="button"
                onClick={() => onSetTheme("dark")}
              >
                <div className="account-theme-option__swatch account-theme-option__swatch--dark"/>
                <strong>Dark Mode</strong>
                <FaMoon/>
              </button>
            </div>
          </div>

          <div className="account-settings-divider"/>

          <div className="account-settings-section">
            <div className="account-settings-section__head">
              <div>
                <h3>Benachrichtigungen</h3>
                <span>Steuere System- und Prozessmeldungen.</span>
              </div>
            </div>
            <div className="account-toggle-list">
              {NOTIFICATION_OPTIONS.map(({key, title, description}) => (
                <button
                  key={key}
                  className={`account-toggle-button ${notifications[key] ? "active" : ""}`.trim()}
                  type="button"
                  onClick={() => toggleNotification(key)}
                >
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                  <span className="account-toggle-pill">
                    <FaBell/>
                    {notifications[key] ? " Aktiv" : " Inaktiv"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderFinanceSection(): ReactElement {
    return (
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
              <ul className="account-invoice-list">
                {visibleInvoices.map((invoice) => (
                  <li key={invoice.invoiceId}>
                    <button
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
                        <MdReceiptLong/>
                        {formatInvoiceAmount(invoice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {hasMoreInvoices && (
                <button
                  className="button button--ghost account-invoice-more"
                  type="button"
                  onClick={() => setVisibleInvoiceCount((c) => c + INVOICE_PAGE_SIZE)}
                >
                  Mehr anzeigen
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  function renderSecuritySection(): ReactElement {
    return (
      <section id="security" className="page-card section-space">
        <div className="section-head account-section-head">
          <div>
            <span className="eyebrow">Sicherheit</span>
            <h2>Zugriff und Kontoverwaltung</h2>
            <p className="section-copy">Sicherheits- und Zugriffsfunktionen für dein Benutzerkonto.</p>
          </div>
        </div>
        <div className="account-action-row">
          <button className="button button--ghost" type="button">Passwort zurücksetzen</button>
          <button
            className="button account-action-button account-action-button--logout"
            type="button"
            onClick={onLogout}
          >
            <MdLogout/>
            Abmelden
          </button>
        </div>
        <div className="account-danger-zone">
          <div className="account-danger-zone__copy">
            <h3><MdOutlineWarningAmber/>Kritische Aktionen</h3>
            <p>Diese Aktionen beeinflussen dein Konto und laufende Prozesse dauerhaft.</p>
          </div>
          <div className="account-danger-zone__actions">
            <button className="button account-danger-button" type="button">Abonnement beenden</button>
            <button className="button account-danger-button account-danger-button--secondary" type="button">
              Konto löschen
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="home-showcase account-page">
      {renderProfileProgress()}
      {renderHeroSection()}
      {renderProfileSection()}
      {renderSettingsSection()}
      {renderFinanceSection()}
      {renderSecuritySection()}
    </div>
  );
}
