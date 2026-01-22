import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

export default function RegisterForm({ onSwitchToLogin, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState('');
  const { registerWithEmail, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await registerWithEmail(email, password, displayName);
      onSuccess?.();
    } catch {
      // Error handled by store
    }
  };

  const handleGoogleLogin = async () => {
    clearError();

    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch {
      // Error handled by store
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-form">
      <h2>Crear cuenta</h2>
      <p className="auth-subtitle">Únete para empezar a comprar</p>

      {displayError && <div className="auth-error">{displayError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">Nombre</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
            required
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="auth-divider">
        <span>o</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn btn-google"
        disabled={isLoading}
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar con Google
      </button>

      <p className="auth-terms">
        Al registrarte aceptas nuestros términos y condiciones
      </p>

      <div className="auth-links">
        {onSwitchToLogin && (
          <p>
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-btn">
              Inicia sesión
            </button>
          </p>
        )}
      </div>

      <style>{`
        .auth-form {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .auth-form h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 8px;
          text-align: center;
        }

        .auth-subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 24px;
        }

        .auth-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 6px;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.15s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .form-group input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-google {
          background: white;
          color: #374151;
          border: 1px solid #e5e5e5;
        }

        .btn-google:hover:not(:disabled) {
          background: #f9fafb;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 20px 0;
          color: #9ca3af;
          font-size: 0.85rem;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e5e5;
        }

        .auth-terms {
          margin-top: 16px;
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .auth-links {
          margin-top: 16px;
          text-align: center;
          font-size: 0.9rem;
          color: #666;
        }

        .link-btn {
          background: none;
          border: none;
          color: #2563eb;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
