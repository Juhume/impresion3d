import { useState, useEffect } from 'react';
import { getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface Product {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  precioOferta?: number;
  categoria: string;
  stock: number;
  activo: boolean;
  imagenPrincipal?: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; product: Product | null }>({
    show: false,
    product: null,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'products'));
      const productsData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        activo: doc.data().activo !== false,
        stock: doc.data().stock || 0,
      })) as Product[];

      setProducts(productsData);

      // Extraer categorías únicas
      const uniqueCategories = [...new Set(productsData.map(p => p.categoria))].filter(Boolean);
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleProductActive(product: Product) {
    if (!isFirebaseConfigured()) return;

    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, 'products', product.id), {
        activo: !product.activo,
      });

      setProducts(products.map(p =>
        p.id === product.id ? { ...p, activo: !p.activo } : p
      ));
    } catch (err) {
      console.error('Error updating product:', err);
    }
  }

  async function handleDelete() {
    if (!deleteModal.product || !isFirebaseConfigured()) return;

    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, 'products', deleteModal.product.id));
      setProducts(products.filter(p => p.id !== deleteModal.product!.id));
      setDeleteModal({ show: false, product: null });
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="product-list">
      <div className="list-header">
        <div className="filters">
          <div className="search-input">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="category-filter"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <a href="/impresion3d/admin/productos/nuevo/" className="btn-new">
          + Nuevo producto
        </a>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron productos</p>
          {products.length === 0 && (
            <a href="/impresion3d/admin/productos/nuevo/" className="btn-primary">
              Crear primer producto
            </a>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className={!product.activo ? 'inactive' : ''}>
                  <td className="product-cell">
                    <div className="product-info">
                      {product.imagenPrincipal ? (
                        <img
                          src={product.imagenPrincipal}
                          alt={product.nombre}
                          className="product-thumb"
                        />
                      ) : (
                        <div className="product-thumb placeholder">📦</div>
                      )}
                      <div className="product-details">
                        <span className="product-name">{product.nombre}</span>
                        <span className="product-slug">{product.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{product.categoria}</span>
                  </td>
                  <td className="price-cell">
                    {product.precioOferta ? (
                      <>
                        <span className="price-offer">{product.precioOferta.toFixed(2)}€</span>
                        <span className="price-original">{product.precio.toFixed(2)}€</span>
                      </>
                    ) : (
                      <span className="price">{product.precio.toFixed(2)}€</span>
                    )}
                  </td>
                  <td>
                    <span className={`stock-badge ${product.stock === 0 ? 'out' : product.stock < 5 ? 'low' : 'ok'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${product.activo ? 'active' : 'inactive'}`}
                      onClick={() => toggleProductActive(product)}
                    >
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <a
                      href={`/impresion3d/admin/productos/editar/?id=${product.id}`}
                      className="btn-action edit"
                      title="Editar"
                    >
                      ✏️
                    </a>
                    <button
                      className="btn-action delete"
                      title="Eliminar"
                      onClick={() => setDeleteModal({ show: true, product })}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteModal.show && deleteModal.product && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, product: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar producto?</h3>
            <p>
              ¿Estás seguro de que quieres eliminar <strong>{deleteModal.product.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteModal({ show: false, product: null })}
              >
                Cancelar
              </button>
              <button className="btn-delete" onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .product-list {
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

        .category-filter {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
        }

        .btn-new {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-new:hover {
          background: #1d4ed8;
        }

        .table-wrapper {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
        }

        .products-table th,
        .products-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .products-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
        }

        .products-table tr.inactive {
          opacity: 0.6;
        }

        .product-cell {
          min-width: 250px;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .product-thumb {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          background: #f3f4f6;
        }

        .product-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .product-details {
          display: flex;
          flex-direction: column;
        }

        .product-name {
          font-weight: 600;
          color: #111827;
        }

        .product-slug {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .category-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .price-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price {
          font-weight: 600;
        }

        .price-offer {
          font-weight: 600;
          color: #16a34a;
        }

        .price-original {
          font-size: 0.8rem;
          color: #9ca3af;
          text-decoration: line-through;
        }

        .stock-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .stock-badge.ok {
          background: #dcfce7;
          color: #16a34a;
        }

        .stock-badge.low {
          background: #fef3c7;
          color: #b45309;
        }

        .stock-badge.out {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-toggle {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }

        .status-toggle.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-toggle.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status-toggle:hover {
          opacity: 0.8;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          text-decoration: none;
        }

        .btn-action.edit {
          background: #e0e7ff;
        }

        .btn-action.edit:hover {
          background: #c7d2fe;
        }

        .btn-action.delete {
          background: #fee2e2;
        }

        .btn-action.delete:hover {
          background: #fecaca;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
        }

        .empty-state p {
          color: #6b7280;
          margin-bottom: 16px;
        }

        .btn-primary {
          display: inline-block;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
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
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 24px;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
        }

        .modal h3 {
          margin: 0 0 12px 0;
          font-size: 1.1rem;
        }

        .modal p {
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-delete {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        @media (max-width: 900px) {
          .list-header {
            flex-direction: column;
            align-items: stretch;
          }

          .filters {
            flex-direction: column;
          }

          .search-input input {
            width: 100%;
          }

          .table-wrapper {
            overflow-x: auto;
          }

          .products-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
}
