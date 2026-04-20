import { useState, type FormEvent, type ChangeEvent } from 'react';

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      else console.info('[LoginPage] Mock-Submit:', formData.username);
    } catch (err) {
      setErrors({
        general:
          err instanceof Error ? err.message : 'Login fehlgeschlagen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">
          ReStockOffice
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Bitte anmelden, um fortzufahren.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {errors.general && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm"
            >
              {errors.general}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-md transition-colors"
          >
            {isSubmitting ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            OIDC-Integration folgt in einem späteren Spike.
          </p>
        </div>
      </div>
    </div>
  );
}