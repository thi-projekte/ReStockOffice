import LegalPage from './LegalPage'

export default function ContactPage() {

  const contact = `
    Sie erreichen uns für Fragen, Bestellungen oder Reklamationen unter:
    
    E-Mail: [E-Mail-Adresse]
    Telefon: [Telefonnummer]
    
    Postanschrift:
    [Unternehmensname]
    [Adresse]
    [PLZ Ort]
    
    Wir bemühen uns, Anfragen zeitnah innerhalb der üblichen Geschäftszeiten zu beantworten.
  `;

  return <LegalPage title="Kontakt" body={contact}/>
}
