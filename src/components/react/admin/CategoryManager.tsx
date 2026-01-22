import { useState, useEffect } from 'react';
import { getFirebaseDb, isFirebaseConfigured } from '../../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Category {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  imagen?: string;
  orden: number;
  activa: boolean;
  productCount?: number;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; category: Category | null }>({
    show: false,
    category: null,
  });

  // Form fields
  const [formNombre, setFormNombre] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formOrden, setFormOrden] = useState(0);
  const [formActiva, setFormActiva] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (editingCategory) {
      setFormNombre(editingCategory.nombre);
      setFormSlug(editingCategory.slug);
      setFormDescripcion(editingCategory.descripcion);
      setFormOrden(editingCategory.orden);
      setFormActiva(editingCategory.activa);
    } else if (isCreating) {
      setFormNombre('');
      setFormSlug('');
      setFormDescripcion('');
      setFormOrden(categories.length);
      setFormActiva(true);
    }
  }, [editingCategory, isCreating, categories.length]);

  async function loadCategories() {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();

      // Cargar categorías
      const catsSnap = await getDocs(collection(db, 'categories'));
      const catsData = catsSnap.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre || '',
        slug: doc.data().slug || '',
        descripcion: doc.data().descripcion || '',
        imagen: doc.data().imagen,
        orden: doc.data().orden || 0,
        activa: doc.data().activa !== false,
      })) as Category[];

      // Contar productos por categoría
      const productsSnap = await getDocs(collection(db, 'products'));
      const productCounts: Record<string, number> = {};

      productsSnap.docs.forEach(doc => {
        const cat = doc.data().categoria;
        if (cat) {
          productCounts[cat] = (productCounts[cat] || 0) + 1;
        }
      });

      // Si no hay categorías guardadas pero hay productos, extraer categorías de productos
      if (catsData.length === 0 && productsSnap.docs.length > 0) {
        const uniqueCats = [...new Set(productsSnap.docs.map(d => d.data().categoria))].filter(Boolean);
        uniqueCats.forEach((cat, index) => {
          catsData.push({
            id: `temp-${index}`,
            nombre: cat as string,
            slug: generateSlug(cat as string),
            descripcion: '',
            orden: index,
            activa: true,
            productCount: productCounts[cat as string] || 0,
          });
        });
      } else {
        // Añadir conteo de productos a categorías existentes
        catsData.forEach(cat => {
          cat.productCount = productCounts[cat.nombre] || 0;
        });
      }

      // Ordenar por orden
      catsData.sort((a, b) => a.orden - b.orden);

      setCategories(catsData);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleNombreChange(value: string) {
    setFormNombre(value);
    if (!editingCategory || formSlug === generateSlug(editingCategory.nombre)) {
      setFormSlug(generateSlug(value));
    }
  }

  async function handleSave() {
    if (!formNombre.trim() || !formSlug.trim()) {
      return;
    }

    if (!isFirebaseConfigured()) return;

    setSaving(true);

    try {
      const db = getFirebaseDb();
      const categoryData = {
        nombre: formNombre.trim(),
        slug: formSlug.trim(),
        descripcion: formDescripcion.trim(),
        orden: formOrden,
        activa: formActiva,
        updatedAt: serverTimestamp(),
      };

      if (editingCategory && !editingCategory.id.startsWith('temp-')) {
        // Actualizar categoría existente
        await setDoc(doc(db, 'categories', editingCategory.id), categoryData, { merge: true });

        // Si cambió el nombre, actualizar productos
        if (editingCategory.nombre !== formNombre.trim()) {
          const productsSnap = await getDocs(collection(db, 'products'));
          const batch: Promise<void>[] = [];

          productsSnap.docs.forEach(productDoc => {
            if (productDoc.data().categoria === editingCategory.nombre) {
              batch.push(
                updateDoc(doc(db, 'products', productDoc.id), {
                  categoria: formNombre.trim(),
                })
              );
            }
          });

          await Promise.all(batch);
        }

        setCategories(categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, ...categoryData, productCount: c.productCount }
            : c
        ));
      } else {
        // Crear nueva categoría
        const newDocRef = doc(collection(db, 'categories'));
        await setDoc(newDocRef, {
          ...categoryData,
          createdAt: serverTimestamp(),
        });

        setCategories([...categories, {
          id: newDocRef.id,
          ...categoryData,
          productCount: 0,
        } as Category]);
      }

      setEditingCategory(null);
      setIsCreating(false);
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal.category || !isFirebaseConfigured()) return;

    try {
      const db = getFirebaseDb();

      // Solo borrar si existe en Firestore (no temporal)
      if (!deleteModal.category.id.startsWith('temp-')) {
        await deleteDoc(doc(db, 'categories', deleteModal.category.id));
      }

      setCategories(categories.filter(c => c.id !== deleteModal.category!.id));
      setDeleteModal({ show: false, category: null });
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  }

  function handleCancel() {
    setEditingCategory(null);
    setIsCreating(false);
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando categorías...</p>
      </div>
    );
  }

  const showForm = isCreating || editingCategory;

  return (
    <div className="category-manager">
      <div className="manager-header">
        <h2>Categorías ({categories.length})</h2>
        {!showForm && (
          <button className="btn-new" onClick={() => setIsCreating(true)}>
            + Nueva categoría
          </button>
        )}
      </div>

      {showForm && (
        <div className="category-form">
          <h3>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formNombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>

            <div className="form-group">
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="nombre-categoria"
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                rows={2}
                placeholder="Descripción de la categoría"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={formOrden}
                onChange={(e) => setFormOrden(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formActiva}
                  onChange={(e) => setFormActiva(e.target.checked)}
                />
                <span>Categoría activa</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={handleCancel}>
              Cancelar
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={saving || !formNombre.trim() || !formSlug.trim()}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>No hay categorías</p>
          <button className="btn-primary" onClick={() => setIsCreating(true)}>
            Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="categories-list">
          {categories.map(category => (
            <div
              key={category.id}
              className={`category-card ${!category.activa ? 'inactive' : ''}`}
            >
              <div className="category-info">
                <span className="category-name">{category.nombre}</span>
                <span className="category-slug">/{category.slug}</span>
                {category.descripcion && (
                  <p className="category-description">{category.descripcion}</p>
                )}
              </div>

              <div className="category-meta">
                <span className="product-count">
                  {category.productCount || 0} producto{(category.productCount || 0) !== 1 ? 's' : ''}
                </span>
                <span className={`status-badge ${category.activa ? 'active' : 'inactive'}`}>
                  {category.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="category-actions">
                <button
                  className="btn-edit"
                  onClick={() => setEditingCategory(category)}
                >
                  Editar
                </button>
                <button
                  className="btn-delete"
                  onClick={() => setDeleteModal({ show: true, category })}
                  disabled={(category.productCount || 0) > 0}
                  title={(category.productCount || 0) > 0 ? 'No se puede eliminar: tiene productos' : 'Eliminar'}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal.show && deleteModal.category && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, category: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar categoría?</h3>
            <p>
              ¿Estás seguro de que quieres eliminar <strong>{deleteModal.category.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteModal({ show: false, category: null })}
              >
                Cancelar
              </button>
              <button className="btn-confirm-delete" onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .category-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .manager-header h2 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }

        .btn-new {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-new:hover {
          background: #1d4ed8;
        }

        /* Form */
        .category-form {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .category-form h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 20px 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .checkbox-label {
          flex-direction: row !important;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          margin-top: 20px;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-save {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-save:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-save:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Categories list */
        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .category-card.inactive {
          opacity: 0.6;
        }

        .category-info {
          flex: 1;
        }

        .category-name {
          font-weight: 600;
          color: #111827;
          display: block;
        }

        .category-slug {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .category-description {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 8px 0 0 0;
        }

        .category-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .product-count {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .category-actions {
          display: flex;
          gap: 8px;
        }

        .btn-edit {
          padding: 8px 16px;
          background: #e0e7ff;
          color: #4338ca;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-edit:hover {
          background: #c7d2fe;
        }

        .btn-delete {
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-delete:hover:not(:disabled) {
          background: #fecaca;
        }

        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
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

        .btn-confirm-delete {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-confirm-delete:hover {
          background: #dc2626;
        }

        @media (max-width: 600px) {
          .category-card {
            flex-direction: column;
            align-items: stretch;
          }

          .category-meta {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .category-actions {
            justify-content: flex-end;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
