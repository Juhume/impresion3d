import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { getUserOrders } from '../../lib/firestore';
import type { Order } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export default function OrderHistory() {
  const { user, isLoading: authLoading } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function loadOrders() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userOrders = await getUserOrders(user.uid);
        setOrders(userOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      loadOrders();
    }
  }, [user, authLoading]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const formatDateLong = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getCurrentStepIndex = (order: Order) => {
    if (order.status === 'cancelled') return -1;
    return STATUS_STEPS.indexOf(order.status);
  };

  if (authLoading || isLoading) {
    return (
      <div className="orders-loading">
        <div className="spinner"></div>
        <p>Cargando pedidos...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="orders-login-required">
        <p>Debes iniciar sesión para ver tus pedidos.</p>
        <a href="/impresion3d/auth/login/" className="btn-primary">
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>Mis pedidos</h2>

      {orders.length === 0 ? (
        <div className="orders-empty">
          <div className="empty-icon">📦</div>
          <p>Aún no has realizado ningún pedido</p>
          <a href="/impresion3d/catalogo/" className="btn-primary">
            Explorar catálogo
          </a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <span className="order-number">Pedido #{order.orderNumber}</span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>
                <span
                  className="order-status"
                  style={{ backgroundColor: STATUS_COLORS[order.status] }}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="order-body">
                <div className="order-summary">
                  <div className="summary-item">
                    <span className="label">Total</span>
                    <span className="value">{formatPrice(order.total)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Envío</span>
                    <span className="value">
                      {order.shippingCost === 0
                        ? 'Gratis'
                        : formatPrice(order.shippingCost)}
                    </span>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="order-tracking">
                    <span className="label">Nº seguimiento:</span>
                    <span className="tracking-number">{order.trackingNumber}</span>
                  </div>
                )}

                <div className="order-address">
                  <span className="label">Dirección de envío:</span>
                  <p>
                    {order.shippingAddress.calle}, {order.shippingAddress.numero}
                    {order.shippingAddress.piso && `, ${order.shippingAddress.piso}`}
                    <br />
                    {order.shippingAddress.codigoPostal} {order.shippingAddress.ciudad}
                  </p>
                </div>
              </div>

              <div className="order-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedOrder(order)}
                >
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Pedido #{selectedOrder.orderNumber}</h3>
                <p className="modal-date">{formatDateLong(selectedOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-status">
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_COLORS[selectedOrder.status] }}
                >
                  {STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>

              {selectedOrder.status !== 'cancelled' && (
                <div className="order-progress">
                  {STATUS_STEPS.map((step, index) => {
                    const currentStep = getCurrentStepIndex(selectedOrder);
                    return (
                      <div
                        key={step}
                        className={`progress-step ${index <= currentStep ? 'completed' : ''} ${index === currentStep ? 'current' : ''}`}
                      >
                        <div className="step-circle">
                          {index <= currentStep ? '✓' : index + 1}
                        </div>
                        <span className="step-label">{STATUS_LABELS[step]}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="modal-section">
                <h4>Dirección de envío</h4>
                <p>
                  {selectedOrder.shippingAddress.calle}, {selectedOrder.shippingAddress.numero}
                  {selectedOrder.shippingAddress.piso && `, ${selectedOrder.shippingAddress.piso}`}
                </p>
                <p>
                  {selectedOrder.shippingAddress.codigoPostal} {selectedOrder.shippingAddress.ciudad}
                </p>
                <p>{selectedOrder.shippingAddress.provincia}</p>
                {selectedOrder.shippingAddress.telefono && (
                  <p>Tel: {selectedOrder.shippingAddress.telefono}</p>
                )}
              </div>

              {selectedOrder.trackingNumber && (
                <div className="modal-section">
                  <h4>Seguimiento</h4>
                  <p>
                    <span className="tracking-number">{selectedOrder.trackingNumber}</span>
                  </p>
                  {selectedOrder.shippedAt && (
                    <p className="date-info">Enviado: {formatDateLong(selectedOrder.shippedAt)}</p>
                  )}
                  {selectedOrder.deliveredAt && (
                    <p className="date-info">Entregado: {formatDateLong(selectedOrder.deliveredAt)}</p>
                  )}
                </div>
              )}

              <div className="modal-section summary-section">
                <h4>Resumen</h4>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>IVA (21%)</span>
                  <span>{formatPrice(selectedOrder.tax)}</span>
                </div>
                <div className="summary-row">
                  <span>Envío</span>
                  <span>
                    {selectedOrder.shippingCost === 0 ? 'Gratis' : formatPrice(selectedOrder.shippingCost)}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="modal-section">
                  <h4>Notas</h4>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .orders-container {
          width: 100%;
        }

        .orders-container h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 24px 0;
        }

        .orders-loading,
        .orders-login-required {
          text-align: center;
          padding: 48px 24px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e5e5;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .orders-empty {
          text-align: center;
          padding: 48px 24px;
          background-color: #f9fafb;
          border-radius: 12px;
          border: 1px dashed #d1d5db;
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .orders-empty p {
          color: #6b7280;
          margin: 0 0 20px 0;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background-color: white;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          overflow: hidden;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e5e5;
        }

        .order-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-number {
          font-weight: 600;
          color: #111827;
        }

        .order-date {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .order-status,
        .status-badge {
          padding: 6px 12px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .order-body {
          padding: 20px;
        }

        .order-summary {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-item .label,
        .order-tracking .label,
        .order-address .label {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .summary-item .value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
        }

        .order-tracking {
          margin-bottom: 16px;
        }

        .tracking-number {
          font-family: monospace;
          background-color: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          margin-left: 8px;
        }

        .order-address p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          color: #374151;
          line-height: 1.5;
        }

        .order-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e5e5;
        }

        .btn-primary {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.15s;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .btn-secondary {
          display: inline-block;
          padding: 10px 20px;
          background-color: #f3f4f6;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.15s;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        /* Modal */
        .order-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .order-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5e5;
        }

        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }

        .modal-date {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 4px 0 0 0;
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

        .modal-body {
          padding: 24px;
        }

        .modal-status {
          margin-bottom: 20px;
        }

        .order-progress {
          display: flex;
          justify-content: space-between;
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #e5e5e5;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .progress-step.completed .step-circle {
          background-color: #22c55e;
          color: white;
        }

        .progress-step.current .step-circle {
          background-color: #2563eb;
          color: white;
        }

        .step-label {
          font-size: 0.65rem;
          color: #6b7280;
          text-align: center;
        }

        .progress-step.completed .step-label,
        .progress-step.current .step-label {
          color: #111827;
          font-weight: 500;
        }

        .modal-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e5e5;
        }

        .modal-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .modal-section h4 {
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modal-section p {
          margin: 0;
          color: #374151;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .date-info {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .summary-section .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #4b5563;
          padding: 4px 0;
        }

        .summary-section .summary-row.total {
          padding-top: 12px;
          margin-top: 8px;
          border-top: 1px solid #e5e5e5;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        @media (max-width: 480px) {
          .order-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .order-summary {
            flex-direction: column;
            gap: 12px;
          }

          .order-progress {
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
