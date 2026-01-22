import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { getUserAddresses, addUserAddress } from '../../lib/firestore';
import AddressForm from './AddressForm';
import type { Address } from '../../types';

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onSelect: (address: Address) => void;
}

export default function AddressSelector({ selectedAddressId, onSelect }: AddressSelectorProps) {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadAddresses() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userAddresses = await getUserAddresses(user.uid);
        setAddresses(userAddresses);

        // Auto-seleccionar la dirección predeterminada si no hay ninguna seleccionada
        if (!selectedAddressId && userAddresses.length > 0) {
          const defaultAddress = userAddresses.find(a => a.isDefault) || userAddresses[0];
          onSelect(defaultAddress);
        }
      } catch (err) {
        console.error('Error loading addresses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAddresses();
  }, [user]);

  const handleSaveAddress = async (data: Omit<Address, 'id' | 'createdAt'>) => {
    if (!user) return;

    await addUserAddress(user.uid, data);
    const updatedAddresses = await getUserAddresses(user.uid);
    setAddresses(updatedAddresses);
    setShowForm(false);

    // Seleccionar la nueva dirección
    const newAddress = updatedAddresses[updatedAddresses.length - 1];
    if (newAddress) {
      onSelect(newAddress);
    }
  };

  if (isLoading) {
    return (
      <div className="address-selector-loading">
        <div className="spinner"></div>
        <p>Cargando direcciones...</p>
      </div>
    );
  }

  return (
    <div className="address-selector">
      <div className="selector-header">
        <h3>Dirección de envío</h3>
        <button
          type="button"
          className="btn-add-address"
          onClick={() => setShowForm(true)}
        >
          + Nueva dirección
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="no-addresses">
          <p>No tienes direcciones guardadas.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            Añadir dirección
          </button>
        </div>
      ) : (
        <div className="addresses-list">
          {addresses.map(address => (
            <label
              key={address.id}
              className={`address-option ${selectedAddressId === address.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="shipping-address"
                checked={selectedAddressId === address.id}
                onChange={() => onSelect(address)}
              />
              <div className="address-content">
                <span className="address-alias">{address.alias}</span>
                <span className="address-street">
                  {address.calle}, {address.numero}
                  {address.piso && `, ${address.piso}`}
                </span>
                <span className="address-city">
                  {address.codigoPostal} {address.ciudad}, {address.provincia}
                </span>
                {address.telefono && (
                  <span className="address-phone">Tel: {address.telefono}</span>
                )}
                {address.isDefault && (
                  <span className="default-badge">Predeterminada</span>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {showForm && (
        <AddressForm
          onSave={handleSaveAddress}
          onCancel={() => setShowForm(false)}
          isFirst={addresses.length === 0}
        />
      )}

      <style>{`
        .address-selector {
          background-color: #f9fafb;
          border-radius: 12px;
          padding: 20px;
        }

        .address-selector-loading {
          text-align: center;
          padding: 32px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e5e5;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .selector-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .btn-add-address {
          padding: 6px 12px;
          background: none;
          border: 1px dashed #2563eb;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-add-address:hover {
          background-color: #eff6ff;
        }

        .no-addresses {
          text-align: center;
          padding: 24px;
        }

        .no-addresses p {
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .addresses-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .address-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background-color: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .address-option:hover {
          border-color: #2563eb;
        }

        .address-option.selected {
          border-color: #2563eb;
          background-color: #eff6ff;
        }

        .address-option input {
          margin-top: 2px;
        }

        .address-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .address-alias {
          font-weight: 600;
          color: #111827;
          font-size: 0.9rem;
        }

        .address-street,
        .address-city {
          font-size: 0.85rem;
          color: #4b5563;
        }

        .address-phone {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .default-badge {
          display: inline-block;
          padding: 2px 6px;
          background-color: #2563eb;
          color: white;
          font-size: 0.65rem;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
          margin-top: 6px;
          width: fit-content;
        }

        .btn-primary {
          padding: 10px 20px;
          background-color: #2563eb;
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
