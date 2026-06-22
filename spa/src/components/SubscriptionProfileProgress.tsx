import type {SubscriptionProfileStatus} from "../utils/subscriptionProfile";
import {NavLink} from "react-router-dom";

interface SubscriptionProfileProgressProps {
  readonly status: SubscriptionProfileStatus | null;
  readonly message: string;
}

export function SubscriptionProfileProgress({
                                              status,
                                              message,
                                            }: Readonly<SubscriptionProfileProgressProps>) {
  if (status?.isComplete !== false) {
    return null;
  }

  return (
    <section className="page-card subscription-profile-progress profile-progress-banner">
      <NavLink to="/account">
        <div className="subscription-profile-progress__copy">
          <div>
            <strong>Profil noch nicht vollständig</strong>
            <p>{message}</p>
          </div>
          <span className="subscription-profile-progress__percent">
              {status.completionPercentage}%
            </span>
        </div>

        <progress
          className="subscription-profile-progress__bar"
          aria-label="Profilfortschritt"
          value={status.completionPercentage}
          max={100}
        />

        {status.missingFields.length > 0 ? (
          <p className="subscription-profile-progress__missing">
            Fehlt noch: {status.missingFields.join(", ")}
          </p>
        ) : null}
      </NavLink>
    </section>
  );
}
