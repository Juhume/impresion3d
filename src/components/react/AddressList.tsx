import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import {
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress
} from '../../lib/firestore';
import AddressForm from './AddressForm';
import type { Address } from '../../types';

export default function AddressList() {
  const { user, isLoading: authLoading } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAddresses() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userAddresses = await getUserAddresses(user.uid);
        setAddresses(userAddresses);
      } catch (err) {
        console.error('Error loading addresses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      loadAddresses();
    }
  }, [user, authLoading]);

  const handleSave = async (data: Omit<Address, 'id' | 'createdAt'>) => {
    if (!user) return;

    if (editingAddress) {
      await updateUserAddress(user.uid, editingAddress.id, data);
    } else {
      await addUserAddress(user.uid, data);
    }

    const updatedAddresses = await getUserAddresses(user.uid);
    setAddresses(updatedAddresses);
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async (addressId: string) => {
    if (!user) return;

    if (!confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
      return;
    }

    setDeletingId(addressId);

    try {
      await deleteUserAddress(user.uid, addressId);
      setAddresses(prev => prev.filter(a => a.id !== addressId));
    } catch (err) {
      console.error('Error deleting address:', err);
      alert('Error al eliminar la dirección');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!user || address.isDefault) return;

    try {
      await updateUserAddress(user.uid, address.id, { isDefault: true });
      const updatedAddresses = await getUserAddresses(user.uid);
      setAddresses(updatedAddresses);
    } catch (err) {
      console.error('Error setting default address:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="addresses-loading">
        <div className="spinner"></div>
        <p>Cargando direcciones...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="addresses-login-required">
        <p>Debes iniciar sesión para gestionar tus direcciones.</p>
        <a href={`${import.meta.env.BASE_URL}auth/login/`} className="btn-primary">
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="addresses-container">
      <div className="addresses-header">
        <h2>Mis direcciones</h2>
        <button
          type="button"
          className="btn-add"
          onClick={() => setShowForm(true)}
        >
          + Añadir dirección
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="addresses-empty">
          <div className="empty-icon">📍</div>
          <p>No tienes direcciones guardadas</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            Añadir tu primera dirección
          </button>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map(address => (
            <div
              key={address.id}
              className={`address-card ${address.isDefault ? 'is-default' : ''}`}
            >
              {address.isDefault && (
                <span className="default-badge">Predeterminada</span>
              )}
              <h3 className="address-alias">{address.alias}</h3>
              <p className="address-street">
                {address.calle}, {address.numero}
                {address.piso && `, ${address.piso}`}
              </p>
              <p className="address-city">
                {address.codigoPostal} {address.ciudad}
              </p>
              <p className="address-province">{address.provincia}</p>
              {address.telefono && (
                <p className="address-phone">Tel: {address.telefono}</p>
              )}

              <div className="address-actions">
                {!address.isDefault && (
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => handleSetDefault(address)}
                  >
                    Usar como predeterminada
                  </button>
                )}
                <div className="action-buttons">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleEdit(address)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    title="Eliminar"
                  >
                    {deletingId === address.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddressForm
          address={editingAddress}
          onSave={handleSave}
          onCancel={handleCancel}
          isFirst={addresses.length === 0}
        />
      )}

      <style>{`
        .addresses-container {
          width: 100%;
        }

        .addresses-loading,
        .addresses-login-required {
          text-align: center;
          padding: 48px 24px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .addresses-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .addresses-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .btn-add {
          padding: 10px 16px;
          background: var(--gradient-primary);
          color: var(--color-bg);
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          box-shadow: var(--shadow-glow-sm);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }

        .addresses-empty {
          text-align: center;
          padding: 48px 24px;
          background-color: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .addresses-empty p {
          color: var(--color-text-muted);
          margin: 0 0 20px 0;
        }

        .addresses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .address-card {
          position: relative;
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 20px;
          transition: border-color 0.15s;
        }

        .address-card:hover {
          border-color: var(--color-accent);
        }

        .address-card.is-default {
          border-color: var(--color-accent);
          background-color: var(--color-accent-glow);
        }

        .default-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          background-color: var(--color-accent);
          color: var(--color-bg);
          font-size: 0.7rem;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .address-alias {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 8px 0;
        }

        .address-street,
        .address-city,
        .address-province,
        .address-phone {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .address-phone {
          margin-top: 8px;
          color: var(--color-text-muted);
        }

        .address-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }

        .btn-text {
          padding: 0;
          background: none;
          border: none;
          color: var(--color-accent);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-text:hover {
          text-decoration: underline;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-surface);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-icon:hover {
          background-color: var(--color-border);
        }

        .btn-icon.btn-danger:hover {
          background-color: var(--color-error-light);
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          display: inline-block;
          padding: 12px 24px;
          background: var(--gradient-primary);
          color: var(--color-bg);
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-decoration: none;
          box-shadow: var(--shadow-glow-sm);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }

        @media (max-width: 600px) {
          .addresses-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .btn-add {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
