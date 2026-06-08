import LegalPage from './LegalPage'

export default function TermsPrivacyPage() {

  const termsPrivacy = `
    Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge, die über den Online-Shop ReStockOffice zwischen dem Betreiber und den Kunden geschlossen werden.
    
    (1) Vertragsgegenstand ist der Verkauf von Waren über den Online-Shop.
    (2) Die Darstellung der Produkte stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Abgabe eines Angebots.
    (3) Der Vertrag kommt durch Annahme der Bestellung durch den Betreiber zustande.
    (4) Preise verstehen sich in Euro und enthalten die gesetzliche Mehrwertsteuer, sofern nicht anders angegeben.
    (5) Versand- und Lieferbedingungen ergeben sich aus den Angaben im Bestellprozess.
    (6) Es gilt das gesetzliche Mängelhaftungsrecht.
    (7) Der Kunde hat ein gesetzliches Widerrufsrecht nach den gesetzlichen Bestimmungen.
    (8) Änderungen dieser AGB bleiben vorbehalten, soweit sie für den Kunden zumutbar sind.
    
    
    Nachfolgend informieren wir Sie über die Erhebung, Verarbeitung und Nutzung personenbezogener Daten im Rahmen der Nutzung unserer Website restockoffice.de.

    (1) Verantwortlicher im Sinne der Datenschutzgesetze ist der im Impressum genannte Betreiber.
    (2) Personenbezogene Daten werden nur erhoben, soweit dies für die Bereitstellung einer funktionsfähigen Website sowie zur Vertragsabwicklung erforderlich ist.
    (3) Die Verarbeitung erfolgt auf Grundlage der DSGVO, insbesondere Art. 6 Abs. 1 lit. b (Vertragserfüllung) und lit. f (berechtigtes Interesse).
    (4) Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragsabwicklung notwendig ist (z. B. Versanddienstleister, Zahlungsanbieter).
    (5) Betroffene haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie Datenübertragbarkeit gemäß Art. 15–20 DSGVO.
    (6) Es besteht ein Beschwerderecht bei der zuständigen Datenschutzaufsichtsbehörde.
    (7) Daten werden nur so lange gespeichert, wie dies für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
  `;

  return <LegalPage title="AGB & Datenschutz" body={termsPrivacy}/>
}
