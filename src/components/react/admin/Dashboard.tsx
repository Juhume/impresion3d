import { useState, useEffect } from 'react';
import { getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  userEmail: string;
  total: number;
  status: string;
  createdAt: Date;
}

interface LowStockProduct {
  id: string;
  nombre: string;
  stock: number;
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  paid: '#2563eb',
  processing: '#f59e0b',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    if (!isFirebaseConfigured()) {
      setError('Firebase no está configurado');
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();

      // Obtener productos
      const productsSnap = await getDocs(collection(db, 'products'));
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Obtener pedidos
      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      );
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calcular estadísticas
      const totalProducts = products.length;
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum: number, order: any) => {
        if (order.paymentStatus === 'succeeded') {
          return sum + (order.total || 0);
        }
        return sum;
      }, 0);

      const pendingOrders = orders.filter((o: any) =>
        o.status === 'paid' || o.status === 'processing'
      ).length;

      // Pedidos recientes (últimos 5)
      const recentOrders: RecentOrder[] = orders.slice(0, 5).map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        userEmail: o.userEmail || 'N/A',
        total: o.total || 0,
        status: o.status || 'paid',
        createdAt: o.createdAt instanceof Timestamp
          ? o.createdAt.toDate()
          : new Date(o.createdAt),
      }));

      // Productos con bajo stock (menos de 5 unidades)
      const lowStockProducts: LowStockProduct[] = products
        .filter((p: any) => (p.stock || 0) < 5 && (p.stock || 0) >= 0)
        .map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          stock: p.stock || 0,
        }))
        .slice(0, 5);

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingOrders,
        recentOrders,
        lowStockProducts,
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={loadDashboardStats}>Reintentar</button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon products-icon">📦</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalProducts}</span>
            <span className="stat-label">Productos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders-icon">🛒</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">Pedidos totales</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalRevenue.toFixed(2)}€</span>
            <span className="stat-label">Ingresos totales</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon pending-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingOrders}</span>
            <span className="stat-label">Pedidos pendientes</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Pedidos recientes</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="empty-message">No hay pedidos aún</p>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map(order => (
                    <tr key={order.id}>
                      <td className="order-number">{order.orderNumber}</td>
                      <td className="order-email">{order.userEmail}</td>
                      <td className="order-total">{order.total.toFixed(2)}€</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: STATUS_COLORS[order.status] || '#6b7280' }}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="order-date">
                        {order.createdAt.toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <a href={`${import.meta.env.BASE_URL}admin/pedidos/`} className="view-all-link">
            Ver todos los pedidos →
          </a>
        </section>

        <section className="dashboard-section">
          <h2>Productos con bajo stock</h2>
          {stats.lowStockProducts.length === 0 ? (
            <p className="empty-message">No hay productos con bajo stock</p>
          ) : (
            <ul className="low-stock-list">
              {stats.lowStockProducts.map(product => (
                <li key={product.id} className="low-stock-item">
                  <span className="product-name">{product.nombre}</span>
                  <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : 'low-stock'}`}>
                    {product.stock === 0 ? 'Sin stock' : `${product.stock} uds.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <a href={`${import.meta.env.BASE_URL}admin/productos/`} className="view-all-link">
            Ver todos los productos →
          </a>
        </section>
      </div>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
        }

        .stat-card.highlight .stat-label {
          color: rgba(255, 255, 255, 0.8);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: #f3f4f6;
        }

        .stat-card.highlight .stat-icon {
          background: rgba(255, 255, 255, 0.2);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .dashboard-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .dashboard-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dashboard-section h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .orders-table-wrapper {
          overflow-x: auto;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .orders-table th,
        .orders-table td {
          text-align: left;
          padding: 12px 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        .orders-table th {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .order-number {
          font-weight: 600;
          color: #2563eb;
        }

        .order-email {
          color: #6b7280;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-total {
          font-weight: 600;
        }

        .order-date {
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .low-stock-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .low-stock-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .low-stock-item:last-child {
          border-bottom: none;
        }

        .product-name {
          font-weight: 500;
        }

        .stock-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .stock-badge.low-stock {
          background: #fef3c7;
          color: #b45309;
        }

        .stock-badge.out-of-stock {
          background: #fee2e2;
          color: #dc2626;
        }

        .empty-message {
          color: #6b7280;
          font-size: 0.9rem;
          padding: 20px 0;
          text-align: center;
        }

        .view-all-link {
          display: block;
          text-align: center;
          color: #2563eb;
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: 16px;
          text-decoration: none;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        .dashboard-loading,
        .dashboard-error {
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

        .dashboard-error button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .dashboard-error button:hover {
          background: #1d4ed8;
        }

        @media (max-width: 600px) {
          .dashboard-sections {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat-card {
            padding: 16px;
          }

          .stat-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
