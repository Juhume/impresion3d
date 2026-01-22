import { useState, useEffect } from 'react';
import { getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';

interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface ShippingAddress {
  nombre: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  provincia: string;
  telefono: string;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
  paymentStatus: string;
  stripePaymentIntentId?: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  trackingNumber?: string;
  notes?: string;
}

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pagado', color: '#2563eb' },
  { value: 'processing', label: 'En proceso', color: '#f59e0b' },
  { value: 'shipped', label: 'Enviado', color: '#8b5cf6' },
  { value: 'delivered', label: 'Entregado', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelado', color: '#ef4444' },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map(s => [s.value, s.label])
);

const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map(s => [s.value, s.color])
);

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Form fields for order update
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setNewStatus(selectedOrder.status);
      setTrackingNumber(selectedOrder.trackingNumber || '');
      setNotes(selectedOrder.notes || '');
    }
  }, [selectedOrder]);

  async function loadOrders() {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      );

      const ordersData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderNumber: data.orderNumber || doc.id,
          userId: data.userId,
          userEmail: data.userEmail || '',
          userName: data.userName || '',
          status: data.status || 'paid',
          paymentStatus: data.paymentStatus || 'succeeded',
          stripePaymentIntentId: data.stripePaymentIntentId,
          shippingAddress: data.shippingAddress || {},
          items: data.items || [],
          subtotal: data.subtotal || 0,
          tax: data.tax || 0,
          shippingCost: data.shippingCost || 0,
          total: data.total || 0,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : new Date(data.updatedAt),
          paidAt: data.paidAt instanceof Timestamp
            ? data.paidAt.toDate()
            : data.paidAt ? new Date(data.paidAt) : undefined,
          shippedAt: data.shippedAt instanceof Timestamp
            ? data.shippedAt.toDate()
            : data.shippedAt ? new Date(data.shippedAt) : undefined,
          deliveredAt: data.deliveredAt instanceof Timestamp
            ? data.deliveredAt.toDate()
            : data.deliveredAt ? new Date(data.deliveredAt) : undefined,
          trackingNumber: data.trackingNumber,
          notes: data.notes,
        };
      }) as Order[];

      setOrders(ordersData);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOrder() {
    if (!selectedOrder || !isFirebaseConfigured()) return;

    setUpdatingStatus(true);

    try {
      const db = getFirebaseDb();
      const updateData: Record<string, any> = {
        status: newStatus,
        trackingNumber: trackingNumber || null,
        notes: notes || null,
        updatedAt: new Date(),
      };

      // Add timestamp for status change
      if (newStatus === 'shipped' && selectedOrder.status !== 'shipped') {
        updateData.shippedAt = new Date();
      } else if (newStatus === 'delivered' && selectedOrder.status !== 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);

      // Update local state
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, ...updateData }
          : o
      ));

      setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);

    } catch (err) {
      console.error('Error updating order:', err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesSearch = !searchTerm ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="order-list">
      <div className="list-header">
        <div className="filters">
          <div className="search-input">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por pedido, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="order-count">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron pedidos</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-number">{order.orderNumber}</td>
                  <td className="client-cell">
                    <div className="client-info">
                      <span className="client-name">{order.userName || 'Sin nombre'}</span>
                      <span className="client-email">{order.userEmail}</span>
                    </div>
                  </td>
                  <td className="date-cell">
                    {order.createdAt.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="total-cell">{order.total.toFixed(2)}€</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: STATUS_COLORS[order.status] || '#6b7280' }}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal order-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>

            <div className="modal-header">
              <h2>Pedido {selectedOrder.orderNumber}</h2>
              <span
                className="status-badge large"
                style={{ backgroundColor: STATUS_COLORS[selectedOrder.status] }}
              >
                {STATUS_LABELS[selectedOrder.status]}
              </span>
            </div>

            <div className="modal-body">
              <div className="order-sections">
                {/* Customer info */}
                <section className="order-section">
                  <h3>Cliente</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Nombre</span>
                      <span className="info-value">{selectedOrder.userName || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{selectedOrder.userEmail}</span>
                    </div>
                  </div>
                </section>

                {/* Shipping address */}
                <section className="order-section">
                  <h3>Dirección de envío</h3>
                  {selectedOrder.shippingAddress ? (
                    <div className="address-block">
                      <p><strong>{selectedOrder.shippingAddress.nombre}</strong></p>
                      <p>{selectedOrder.shippingAddress.direccion}</p>
                      <p>{selectedOrder.shippingAddress.codigoPostal} {selectedOrder.shippingAddress.ciudad}</p>
                      <p>{selectedOrder.shippingAddress.provincia}</p>
                      <p>Tel: {selectedOrder.shippingAddress.telefono}</p>
                    </div>
                  ) : (
                    <p className="no-address">Sin dirección</p>
                  )}
                </section>

                {/* Order items */}
                <section className="order-section full-width">
                  <h3>Productos</h3>
                  <div className="items-list">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="order-item">
                        {item.productImage && (
                          <img src={item.productImage} alt={item.productName} className="item-image" />
                        )}
                        <div className="item-details">
                          <span className="item-name">{item.productName}</span>
                          <span className="item-qty">x{item.quantity}</span>
                        </div>
                        <span className="item-price">{item.subtotal.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{selectedOrder.subtotal.toFixed(2)}€</span>
                    </div>
                    <div className="total-row">
                      <span>IVA (21%)</span>
                      <span>{selectedOrder.tax.toFixed(2)}€</span>
                    </div>
                    <div className="total-row">
                      <span>Envío</span>
                      <span>{selectedOrder.shippingCost === 0 ? 'Gratis' : `${selectedOrder.shippingCost.toFixed(2)}€`}</span>
                    </div>
                    <div className="total-row grand-total">
                      <span>Total</span>
                      <span>{selectedOrder.total.toFixed(2)}€</span>
                    </div>
                  </div>
                </section>

                {/* Dates */}
                <section className="order-section">
                  <h3>Fechas</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Creado</span>
                      <span className="info-value">
                        {selectedOrder.createdAt.toLocaleString('es-ES')}
                      </span>
                    </div>
                    {selectedOrder.paidAt && (
                      <div className="info-item">
                        <span className="info-label">Pagado</span>
                        <span className="info-value">
                          {selectedOrder.paidAt.toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                    {selectedOrder.shippedAt && (
                      <div className="info-item">
                        <span className="info-label">Enviado</span>
                        <span className="info-value">
                          {selectedOrder.shippedAt.toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliveredAt && (
                      <div className="info-item">
                        <span className="info-label">Entregado</span>
                        <span className="info-value">
                          {selectedOrder.deliveredAt.toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Update form */}
                <section className="order-section full-width">
                  <h3>Actualizar pedido</h3>

                  <div className="update-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Estado</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Número de seguimiento</label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Ej: 1Z999AA10123456784"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Notas internas</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Notas sobre el pedido..."
                      />
                    </div>

                    <button
                      className="btn-update"
                      onClick={handleUpdateOrder}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .order-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 0.9rem;
        }

        .search-input input {
          padding: 10px 12px 10px 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          width: 250px;
        }

        .search-input input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .status-filter {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
        }

        .order-count {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .table-wrapper {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }

        .orders-table th,
        .orders-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .orders-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
        }

        .order-number {
          font-weight: 600;
          color: #2563eb;
        }

        .client-info {
          display: flex;
          flex-direction: column;
        }

        .client-name {
          font-weight: 500;
        }

        .client-email {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .date-cell {
          color: #6b7280;
        }

        .total-cell {
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .status-badge.large {
          padding: 6px 16px;
          font-size: 0.85rem;
        }

        .btn-view {
          padding: 8px 16px;
          background: #e0e7ff;
          color: #4338ca;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-view:hover {
          background: #c7d2fe;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          color: #6b7280;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 16px;
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

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 1000;
          padding: 40px 20px;
          overflow-y: auto;
        }

        .order-modal {
          background: white;
          border-radius: 16px;
          max-width: 800px;
          width: 100%;
          max-height: none;
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          z-index: 10;
        }

        .modal-close:hover {
          background: #e5e7eb;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .modal-body {
          padding: 24px;
        }

        .order-sections {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .order-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
        }

        .order-section.full-width {
          grid-column: 1 / -1;
        }

        .order-section h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          margin: 0 0 12px 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .info-value {
          font-weight: 500;
        }

        .address-block {
          line-height: 1.6;
        }

        .address-block p {
          margin: 0;
        }

        .no-address {
          color: #9ca3af;
          font-style: italic;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 8px;
        }

        .item-image {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          object-fit: cover;
        }

        .item-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .item-name {
          font-weight: 500;
        }

        .item-qty {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .item-price {
          font-weight: 600;
        }

        .order-totals {
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 0.9rem;
        }

        .total-row.grand-total {
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 16px;
          font-weight: 700;
          font-size: 1rem;
        }

        /* Update form */
        .update-form {
          background: white;
          border-radius: 8px;
          padding: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .form-group textarea {
          resize: vertical;
        }

        .btn-update {
          width: 100%;
          padding: 12px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-update:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-update:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .order-sections {
            grid-template-columns: 1fr;
          }

          .modal-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
