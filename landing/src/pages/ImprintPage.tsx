import LegalPage from './LegalPage'

export default function ImprintPage() {

  const imprint = `
    Verantwortlich im Sinne des § 5 TMG ist:
    
    [Unternehmensname / Betreiber]
    [Rechtsform]
    [Name des Vertretungsberechtigten]
    [Adresse (Straße, Hausnummer)]
    [PLZ, Ort, Land]
    
    E-Mail: [E-Mail-Adresse]
    Telefon: [Telefonnummer]
    
    USt-IdNr.: [falls vorhanden]
    Registergericht: [falls eingetragen]
    Registernummer: [falls vorhanden]
    
    Inhaltlich verantwortlich gemäß § 18 Abs. 2 MStV:
    [Name, Adresse wie oben]
  `;

  return <LegalPage title="Impressum" body={imprint}/>
}
