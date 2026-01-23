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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  paid: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  processing: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  shipped: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' },
  delivered: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
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
        <a href={`${import.meta.env.BASE_URL}auth/login/`} className="btn-primary">
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
          <a href={`${import.meta.env.BASE_URL}catalogo/`} className="btn-primary">
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
                  style={{ backgroundColor: STATUS_COLORS[order.status]?.bg, color: STATUS_COLORS[order.status]?.text }}
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
                  style={{ backgroundColor: STATUS_COLORS[selectedOrder.status]?.bg, color: STATUS_COLORS[selectedOrder.status]?.text }}
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
          color: var(--color-text);
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
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
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
          background-color: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .orders-empty p {
          color: var(--color-text-muted);
          margin: 0 0 20px 0;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }

        .order-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-number {
          font-weight: 600;
          color: var(--color-text);
        }

        .order-date {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .order-status,
        .status-badge {
          padding: 6px 12px;
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
          color: var(--color-text-muted);
        }

        .summary-item .value {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .order-tracking {
          margin-bottom: 16px;
        }

        .tracking-number {
          font-family: monospace;
          background-color: var(--color-surface);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          margin-left: 8px;
        }

        .order-address p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .order-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--color-border);
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
          transition: var(--transition-fast);
        }

        .btn-primary:hover {
          background-color: var(--color-accent-dark);
        }

        .btn-secondary {
          display: inline-block;
          padding: 10px 20px;
          background-color: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-decoration: none;
          transition: var(--transition-fast);
        }

        .btn-secondary:hover {
          background-color: var(--color-border);
        }

        /* Modal */
        .order-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .order-modal {
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          color: var(--color-text);
        }

        .modal-date {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 4px 0 0 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          font-size: 1rem;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: var(--transition-fast);
        }

        .close-btn:hover {
          background-color: var(--color-border);
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
          background-color: var(--color-surface);
          border-radius: var(--radius-sm);
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
          background-color: var(--color-border);
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .progress-step.completed .step-circle {
          background-color: rgba(34, 197, 94, 0.15);
          color: var(--color-success);
        }

        .progress-step.current .step-circle {
          background-color: rgba(212, 175, 55, 0.15);
          color: var(--color-accent);
        }

        .step-label {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-align: center;
        }

        .progress-step.completed .step-label,
        .progress-step.current .step-label {
          color: var(--color-text);
          font-weight: 500;
        }

        .modal-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .modal-section h4 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-muted);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modal-section p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .date-info {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-top: 4px;
        }

        .summary-section .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          padding: 4px 0;
        }

        .summary-section .summary-row.total {
          padding-top: 12px;
          margin-top: 8px;
          border-top: 1px solid var(--color-border);
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
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
