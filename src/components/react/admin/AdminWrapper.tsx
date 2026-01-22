import { useState, useEffect, type ReactNode } from 'react';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  children: ReactNode;
}

type AuthState = 'loading' | 'unauthenticated' | 'not-admin' | 'admin';

export default function AdminWrapper({ children }: Props) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // En desarrollo sin Firebase, permitir acceso
      setAuthState('admin');
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setAuthState('unauthenticated');
        setUser(null);
        return;
      }

      setUser(currentUser);

      // Verificar si el usuario es admin
      try {
        const db = getFirebaseDb();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'admin' || userData.isAdmin === true) {
            setAuthState('admin');
          } else {
            setAuthState('not-admin');
          }
        } else {
          // Si no hay documento de usuario, verificar por email (configurable)
          // Por defecto, denegar acceso si no hay rol definido
          setAuthState('not-admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAuthState('not-admin');
      }
    });

    return () => unsubscribe();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="spinner"></div>
          <p>Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-icon">🔒</div>
          <h2>Acceso restringido</h2>
          <p>Debes iniciar sesión para acceder al panel de administración.</p>
          <a href="/impresion3d/auth/login/" className="btn-primary">
            Iniciar sesión
          </a>
          <a href="/impresion3d/" className="btn-secondary">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  if (authState === 'not-admin') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-icon">⛔</div>
          <h2>Sin permisos</h2>
          <p>Tu cuenta no tiene permisos de administrador.</p>
          {user?.email && <p className="user-email">{user.email}</p>}
          <a href="/impresion3d/" className="btn-primary">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <style>{`
        .auth-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f3f4f6;
          padding: 20px;
        }

        .auth-card {
          background: white;
          border-radius: 16px;
          padding: 48px 40px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }

        .auth-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .auth-card h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 12px 0;
        }

        .auth-card p {
          color: #6b7280;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .user-email {
          font-size: 0.9rem;
          color: #9ca3af;
          margin-top: -12px !important;
        }

        .btn-primary {
          display: block;
          width: 100%;
          padding: 14px 24px;
          background: #2563eb;
          color: white;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          margin-bottom: 12px;
          transition: background 0.15s;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-secondary {
          display: block;
          width: 100%;
          padding: 14px 24px;
          background: #f3f4f6;
          color: #374151;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.15s;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
