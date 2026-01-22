import { useState, useEffect } from 'react';
import type { Address } from '../../types';

interface AddressFormProps {
  address?: Address | null;
  onSave: (data: Omit<Address, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  isFirst?: boolean;
}

export default function AddressForm({ address, onSave, onCancel, isFirst = false }: AddressFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    alias: '',
    calle: '',
    numero: '',
    piso: '',
    codigoPostal: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    telefono: '',
    isDefault: false,
  });

  useEffect(() => {
    if (address) {
      setFormData({
        alias: address.alias || '',
        calle: address.calle || '',
        numero: address.numero || '',
        piso: address.piso || '',
        codigoPostal: address.codigoPostal || '',
        ciudad: address.ciudad || '',
        provincia: address.provincia || '',
        pais: address.pais || 'España',
        telefono: address.telefono || '',
        isDefault: address.isDefault || false,
      });
    } else if (isFirst) {
      setFormData(prev => ({ ...prev, isDefault: true }));
    }
  }, [address, isFirst]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    if (!formData.alias.trim()) {
      setError('El alias es obligatorio');
      return;
    }
    if (!formData.calle.trim()) {
      setError('La calle es obligatoria');
      return;
    }
    if (!formData.numero.trim()) {
      setError('El número es obligatorio');
      return;
    }
    if (!formData.codigoPostal.trim()) {
      setError('El código postal es obligatorio');
      return;
    }
    if (!formData.ciudad.trim()) {
      setError('La ciudad es obligatoria');
      return;
    }
    if (!formData.provincia.trim()) {
      setError('La provincia es obligatoria');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        alias: formData.alias.trim(),
        calle: formData.calle.trim(),
        numero: formData.numero.trim(),
        piso: formData.piso.trim() || undefined,
        codigoPostal: formData.codigoPostal.trim(),
        ciudad: formData.ciudad.trim(),
        provincia: formData.provincia.trim(),
        pais: formData.pais.trim(),
        telefono: formData.telefono.trim() || undefined,
        isDefault: formData.isDefault,
      });
    } catch (err) {
      console.error('Error saving address:', err);
      setError('Error al guardar la dirección');
    } finally {
      setIsSaving(false);
    }
  };

  const provincias = [
    'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
    'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón',
    'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara',
    'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén', 'La Rioja',
    'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra',
    'Ourense', 'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife',
    'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia',
    'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
  ];

  return (
    <div className="address-form-overlay">
      <div className="address-form-modal">
        <div className="modal-header">
          <h3>{address ? 'Editar dirección' : 'Nueva dirección'}</h3>
          <button type="button" className="close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="address-form">
          <div className="form-group">
            <label htmlFor="alias">Alias *</label>
            <input
              type="text"
              id="alias"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              placeholder="Ej: Casa, Trabajo, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group form-group-large">
              <label htmlFor="calle">Calle *</label>
              <input
                type="text"
                id="calle"
                name="calle"
                value={formData.calle}
                onChange={handleChange}
                placeholder="Nombre de la calle"
              />
            </div>
            <div className="form-group form-group-small">
              <label htmlFor="numero">Nº *</label>
              <input
                type="text"
                id="numero"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                placeholder="Nº"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="piso">Piso / Puerta</label>
            <input
              type="text"
              id="piso"
              name="piso"
              value={formData.piso}
              onChange={handleChange}
              placeholder="Ej: 2º B, Bajo, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="codigoPostal">Código postal *</label>
              <input
                type="text"
                id="codigoPostal"
                name="codigoPostal"
                value={formData.codigoPostal}
                onChange={handleChange}
                placeholder="Ej: 28001"
                maxLength={5}
              />
            </div>
            <div className="form-group">
              <label htmlFor="ciudad">Ciudad *</label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                placeholder="Ciudad"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="provincia">Provincia *</label>
            <select
              id="provincia"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
            >
              <option value="">Selecciona provincia</option>
              {provincias.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono de contacto</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                disabled={isFirst}
              />
              <span>Usar como dirección predeterminada</span>
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .address-form-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .address-form-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5e5;
        }

        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          color: #6b7280;
          transition: background-color 0.15s;
        }

        .close-btn:hover {
          background-color: #e5e7eb;
        }

        .address-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-row .form-group-large {
          grid-column: span 1;
        }

        .form-row:first-of-type {
          grid-template-columns: 2fr 1fr;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .checkbox-group {
          margin-top: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 400;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .form-error {
          padding: 12px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 12px 20px;
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-primary {
          background-color: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .btn-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .form-row:first-of-type {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
