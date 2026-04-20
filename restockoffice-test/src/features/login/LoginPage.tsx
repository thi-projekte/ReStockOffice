import { useState, type ChangeEvent } from 'react';

export interface LoginFormData {
  username: string;
  password: string;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
  general?: string;
}

interface LoginPageProps {
  onLogin?: (data: LoginFormData) => Promise<void> | void;
}

const INITIAL_FORM: LoginFormData = { username: '', password: '' };

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<LoginFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (data: LoginFormData): LoginFormErrors => {
    const next: LoginFormErrors = {};
    if (!data.username.trim()) next.username = 'Benutzername darf nicht leer sein.';
    if (!data.password) next.password = 'Passwort darf nicht leer sein.';
    return next;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      if (onLogin) await onLogin(formData);
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Login fehlgeschlagen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
<h1 className="text-2xl font-bold text-ink">ReStockOffice</h1>
          <p className="text-sm text-ink-muted mt-1">Bitte anmelden, um fortzufahren</p>
        </div>

        <div className="bg-surface-card rounded-2xl shadow-md border border-border p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {errors.general && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-1.5">
                Benutzername
              </label>
              <input
                id="username" name="username" type="text" autoComplete="username"
                value={formData.username} onChange={handleChange} disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-surface text-ink placeholder:text-ink-muted transition-colors ${errors.username ? 'border-red-400 bg-red-50' : 'border-border'}`}
              />
              {errors.username && <p className="mt-1.5 text-sm text-red-600">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                Passwort
              </label>
              <input
                id="password" name="password" type="password" autoComplete="current-password"
                value={formData.password} onChange={handleChange} disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-surface text-ink transition-colors ${errors.password ? 'border-red-400 bg-red-50' : 'border-border'}`}
              />
              {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200 text-white font-semibold rounded-lg transition-colors mt-2"
            >
              {isSubmitting ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
