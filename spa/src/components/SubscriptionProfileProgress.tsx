import type { SubscriptionProfileStatus } from "../utils/subscriptionProfile";
import {NavLink} from "react-router-dom";

interface SubscriptionProfileProgressProps {
  status: SubscriptionProfileStatus | null;
  message: string;
}

export function SubscriptionProfileProgress({
  status,
  message,
}: SubscriptionProfileProgressProps) {
  if (status?.isComplete !== false) {
    return null;
  }

  return (
    <section className="page-card subscription-profile-progress">
        <NavLink to="/account" className="profile-progress-banner">
          <div className="subscription-profile-progress__copy">
            <div>
              <strong>Profil noch nicht vollständig</strong>
              <p>{message}</p>
            </div>
            <span className="subscription-profile-progress__percent">
              {status.completionPercentage}%
            </span>
          </div>

          <div
            className="subscription-profile-progress__bar"
            role="progressbar"
            aria-label="Profilfortschritt"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.completionPercentage}
          >
            <div
              className="subscription-profile-progress__fill"
              style={{ width: `${status.completionPercentage}%` }}
            />
          </div>

          {status.missingFields.length > 0 ? (
            <p className="subscription-profile-progress__missing">
              Fehlt noch: {status.missingFields.join(", ")}
            </p>
          ) : null}
        </NavLink>
    </section>
  );
}
