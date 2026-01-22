import { useState, useEffect, type ReactNode } from 'react';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  children: ReactNode;
}

type AuthState = 'loading' | 'unauthenticated' | 'not-admin' | 'admin';

export default function AdminGuard({ children }: Props) {
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
          // Si no hay documento de usuario, verificar por email (por ejemplo, email específico de admin)
          const adminEmails = ['admin@impresion3d.com']; // Configurable
          if (adminEmails.includes(currentUser.email || '')) {
            setAuthState('admin');
          } else {
            setAuthState('not-admin');
          }
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
      <div className="admin-guard loading">
        <div className="spinner"></div>
        <p>Verificando acceso...</p>
        <style>{`
          .admin-guard {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 16px;
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .admin-guard p {
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="admin-guard unauthenticated">
        <div className="guard-icon">🔒</div>
        <h2>Acceso restringido</h2>
        <p>Debes iniciar sesión para acceder al panel de administración.</p>
        <a href={`${import.meta.env.BASE_URL}auth/login/`} className="btn-login">
          Iniciar sesión
        </a>
        <style>{`
          .admin-guard {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 16px;
            text-align: center;
            padding: 40px 20px;
          }
          .guard-icon {
            font-size: 3rem;
            margin-bottom: 8px;
          }
          .admin-guard h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0;
          }
          .admin-guard p {
            color: #6b7280;
            margin: 0;
            max-width: 400px;
          }
          .btn-login {
            display: inline-block;
            padding: 12px 32px;
            background: #2563eb;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 8px;
            transition: background 0.15s;
          }
          .btn-login:hover {
            background: #1d4ed8;
          }
        `}</style>
      </div>
    );
  }

  if (authState === 'not-admin') {
    return (
      <div className="admin-guard not-admin">
        <div className="guard-icon">⛔</div>
        <h2>Sin permisos de administrador</h2>
        <p>Tu cuenta no tiene permisos para acceder al panel de administración.</p>
        <p className="user-email">{user?.email}</p>
        <a href={import.meta.env.BASE_URL} className="btn-back">
          Volver a la tienda
        </a>
        <style>{`
          .admin-guard {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 16px;
            text-align: center;
            padding: 40px 20px;
          }
          .guard-icon {
            font-size: 3rem;
            margin-bottom: 8px;
          }
          .admin-guard h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0;
          }
          .admin-guard p {
            color: #6b7280;
            margin: 0;
            max-width: 400px;
          }
          .user-email {
            font-size: 0.9rem;
            color: #9ca3af;
          }
          .btn-back {
            display: inline-block;
            padding: 12px 32px;
            background: #f3f4f6;
            color: #374151;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 8px;
            transition: background 0.15s;
          }
          .btn-back:hover {
            background: #e5e7eb;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
