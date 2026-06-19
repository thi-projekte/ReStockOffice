import type {ReactElement} from "react";
import {Navigate, useOutletContext} from "react-router-dom";
import type {Product, RestockOrderWithProduct} from "../types/shop";

interface OutletContext {
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  onLogout: () => void;
  theme: "light" | "dark" | "auto";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark" | "auto") => void;
}

type Step = {
  number: string
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Konto erstellen',
    description: 'Registrierung in unter 2 Minuten. Direkt loslegen, ohne Aufwand.',
  },
  {
    number: '02',
    title: 'Artikel abonnieren',
    description: 'Gewünschte Büroartikel auswählen und ein Lieferintervall festlegen – einmalig, fertig.',
  },
  {
    number: '03',
    title: 'Öffnungszeiten hinterlegen',
    description: 'Teilt uns eure Bürozeiten mit, damit der Restocker zur richtigen Zeit liefern kann.',
  },
  {
    number: '04',
    title: 'Fertig – wir liefern automatisch',
    description: 'ReStockOffice kündigt jede Lieferung rechtzeitig per Mail an und bestätigt die Ankunft.',
  },
]

const lastIndex = steps.length - 1


export function ProductsPage(): ReactElement {
  const {isLoggedIn} = useOutletContext<OutletContext>();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace/>;
  }

  return (
    <section className="page-card section-space">

      <span className="eyebrow">So funktioniert's</span>
      <h2 style={{paddingBottom: "1rem"}}>Smart in Stock</h2>

      <ol className={"works-steps"}>
        {steps.map((step, i) => (
          <li key={step.number} className={"works-step"}>
            <div className={"works-stepNumber"}>{step.number}</div>
            {i < lastIndex && <div className={"works-connector"} aria-hidden/>}
            <div>
              <h3 className={"works-stepTitle"}>{step.title}</h3>
              <p className={"works-stepDesc"}>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

    </section>
  )
}
