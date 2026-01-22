import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  baseUrl: string;
}

export default function UserMenu({ baseUrl }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, userProfile, isInitialized, logout, isAdmin } = useAuthStore();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    window.location.href = baseUrl;
  };

  // Mostrar loading mientras se inicializa
  if (!isInitialized) {
    return (
      <div className="user-menu-placeholder">
        <div className="avatar-placeholder" />
        <style>{`
          .user-menu-placeholder {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .avatar-placeholder {
            width: 32px;
            height: 32px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // No autenticado: mostrar botón de login
  if (!user) {
    return (
      <a href={`${baseUrl}auth/login/`} className="login-btn">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Entrar</span>

        <style>{`
          .login-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: var(--color-accent);
            color: var(--color-bg);
            border-radius: var(--radius-sm);
            font-family: 'Archivo', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-decoration: none;
            transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 0 1px var(--color-accent);
          }

          .login-btn:hover {
            background: var(--color-accent-light);
            box-shadow: 0 0 0 1px var(--color-accent-light), var(--shadow-glow);
            transform: translateY(-1px);
          }

          @media (max-width: 480px) {
            .login-btn span {
              display: none;
            }

            .login-btn {
              padding: 10px;
              width: 36px;
              height: 36px;
              justify-content: center;
            }
          }
        `}</style>
      </a>
    );
  }

  // Autenticado: mostrar menú
  const displayName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Menú de ${displayName}`}
      >
        <div className="avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt={displayName} />
          ) : (
            <span className="avatar-initial">{initial}</span>
          )}
        </div>
        <svg
          className={`chevron ${isOpen ? 'open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-email">{user.email}</span>
          </div>

          <div className="menu-divider" />

          <a href={`${baseUrl}cuenta/`} className="menu-item" onClick={() => setIsOpen(false)} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Mi perfil</span>
            <span className="menu-item-arrow">→</span>
          </a>

          <a href={`${baseUrl}cuenta/pedidos/`} className="menu-item" onClick={() => setIsOpen(false)} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
            <span>Mis pedidos</span>
            <span className="menu-item-arrow">→</span>
          </a>

          {isAdmin() && (
            <>
              <div className="menu-divider" />
              <a href={`${baseUrl}admin/`} className="menu-item menu-item-admin" onClick={() => setIsOpen(false)} role="menuitem">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Panel admin</span>
                <span className="menu-item-arrow">→</span>
              </a>
            </>
          )}

          <div className="menu-divider" />

          <button className="menu-item menu-item-logout" onClick={handleLogout} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}

      <style>{`
        .user-menu {
          position: relative;
        }

        .user-menu-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          padding: 4px 8px 4px 4px;
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .user-menu-trigger:hover {
          border-color: var(--color-accent);
          background: var(--color-accent-glow);
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: var(--color-accent);
          color: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .avatar-initial {
          font-family: 'Archivo Black', sans-serif;
          font-size: 0.85rem;
          font-weight: 400;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .chevron {
          color: var(--color-text-muted);
          transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .user-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 260px;
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          padding: 8px 0;
          z-index: 1000;
          animation: dropdownIn 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user-info {
          padding: 12px 16px;
        }

        .user-name {
          display: block;
          font-family: 'Archivo Black', sans-serif;
          font-weight: 400;
          color: var(--color-text);
          font-size: 0.95rem;
        }

        .user-email {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          color: var(--color-text-muted);
          font-size: 0.7rem;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-divider {
          height: 1px;
          background: var(--color-border);
          margin: 8px 16px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 100ms ease;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
        }

        .menu-item span {
          flex: 1;
        }

        .menu-item-arrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          opacity: 0;
          transform: translateX(-4px);
          transition: all 150ms ease;
        }

        .menu-item:hover {
          background: var(--color-surface);
          color: var(--color-text);
        }

        .menu-item:hover .menu-item-arrow {
          opacity: 1;
          transform: translateX(0);
          color: var(--color-accent);
        }

        .menu-item svg {
          color: var(--color-text-muted);
          transition: color 100ms ease;
        }

        .menu-item:hover svg {
          color: var(--color-accent);
        }

        .menu-item-admin {
          color: var(--color-secondary-light);
        }

        .menu-item-admin svg {
          color: var(--color-secondary);
        }

        .menu-item-admin:hover {
          color: var(--color-secondary-light);
        }

        .menu-item-logout {
          color: #ef4444;
        }

        .menu-item-logout svg {
          color: #ef4444;
        }

        .menu-item-logout:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .menu-item-logout:hover svg {
          color: #ef4444;
        }

        @media (max-width: 480px) {
          .user-menu-trigger {
            padding: 4px;
          }

          .chevron {
            display: none;
          }

          .user-menu-dropdown {
            width: calc(100vw - 32px);
            right: -8px;
          }
        }
      `}</style>
    </div>
  );
}
