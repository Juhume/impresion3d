import { useState, useEffect } from 'react';
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from '../../../lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProductImage {
  url: string;
  alt: string;
}

interface ProductFormData {
  nombre: string;
  slug: string;
  descripcion: string;
  descripcionCorta: string;
  precio: number;
  precioOferta: number | null;
  categoria: string;
  subcategoria: string;
  stock: number;
  activo: boolean;
  destacado: boolean;
  imagenPrincipal: string;
  imagenes: ProductImage[];
  caracteristicas: string[];
  materiales: string[];
  dimensiones: string;
  peso: string;
  tiempoImpresion: string;
  metaTitle: string;
  metaDescription: string;
}

interface Props {
  productId?: string;
}

const emptyProduct: ProductFormData = {
  nombre: '',
  slug: '',
  descripcion: '',
  descripcionCorta: '',
  precio: 0,
  precioOferta: null,
  categoria: '',
  subcategoria: '',
  stock: 0,
  activo: true,
  destacado: false,
  imagenPrincipal: '',
  imagenes: [],
  caracteristicas: [],
  materiales: [],
  dimensiones: '',
  peso: '',
  tiempoImpresion: '',
  metaTitle: '',
  metaDescription: '',
};

export default function ProductForm({ productId }: Props) {
  const [formData, setFormData] = useState<ProductFormData>(emptyProduct);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos temporales para arrays
  const [newCaracteristica, setNewCaracteristica] = useState('');
  const [newMaterial, setNewMaterial] = useState('');

  useEffect(() => {
    loadCategories();
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  async function loadCategories() {
    if (!isFirebaseConfigured()) return;

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'products'));
      const cats = [...new Set(snap.docs.map(d => d.data().categoria))].filter(Boolean);
      setCategories(cats as string[]);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadProduct() {
    if (!isFirebaseConfigured() || !productId) return;

    try {
      const db = getFirebaseDb();
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          nombre: data.nombre || '',
          slug: data.slug || '',
          descripcion: data.descripcion || '',
          descripcionCorta: data.descripcionCorta || '',
          precio: data.precio || 0,
          precioOferta: data.precioOferta || null,
          categoria: data.categoria || '',
          subcategoria: data.subcategoria || '',
          stock: data.stock || 0,
          activo: data.activo !== false,
          destacado: data.destacado || false,
          imagenPrincipal: data.imagenPrincipal || '',
          imagenes: data.imagenes || [],
          caracteristicas: data.caracteristicas || [],
          materiales: data.materiales || [],
          dimensiones: data.dimensiones || '',
          peso: data.peso || '',
          tiempoImpresion: data.tiempoImpresion || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
        });
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Error al cargar el producto');
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

  function handleChange(field: keyof ProductFormData, value: any) {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generar slug si se cambia el nombre y no hay slug manual
      if (field === 'nombre' && (!prev.slug || prev.slug === generateSlug(prev.nombre))) {
        updated.slug = generateSlug(value);
      }

      return updated;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, isMain: boolean = false) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isFirebaseConfigured()) {
      setError('Firebase Storage no está configurado');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const storage = getFirebaseStorage();
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `products/${fileName}`);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      if (isMain) {
        handleChange('imagenPrincipal', uploadedUrls[0]);
      } else {
        const newImages = uploadedUrls.map(url => ({ url, alt: formData.nombre }));
        handleChange('imagenes', [...formData.imagenes, ...newImages]);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    const updated = formData.imagenes.filter((_, i) => i !== index);
    handleChange('imagenes', updated);
  }

  function addCaracteristica() {
    if (newCaracteristica.trim()) {
      handleChange('caracteristicas', [...formData.caracteristicas, newCaracteristica.trim()]);
      setNewCaracteristica('');
    }
  }

  function removeCaracteristica(index: number) {
    handleChange('caracteristicas', formData.caracteristicas.filter((_, i) => i !== index));
  }

  function addMaterial() {
    if (newMaterial.trim()) {
      handleChange('materiales', [...formData.materiales, newMaterial.trim()]);
      setNewMaterial('');
    }
  }

  function removeMaterial(index: number) {
    handleChange('materiales', formData.materiales.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isFirebaseConfigured()) {
      setError('Firebase no está configurado');
      return;
    }

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!formData.slug.trim()) {
      setError('El slug es obligatorio');
      return;
    }
    if (formData.precio <= 0) {
      setError('El precio debe ser mayor que 0');
      return;
    }
    if (!formData.categoria) {
      setError('La categoría es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const db = getFirebaseDb();
      const productData = {
        ...formData,
        precioOferta: formData.precioOferta || null,
        updatedAt: serverTimestamp(),
      };

      if (productId) {
        // Actualizar producto existente
        await setDoc(doc(db, 'products', productId), productData, { merge: true });
      } else {
        // Crear nuevo producto
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        });
      }

      setSuccess(true);

      // Redirigir después de un momento
      setTimeout(() => {
        window.location.href = '/impresion3d/admin/productos/';
      }, 1500);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">Producto guardado correctamente</div>}

      <div className="form-grid">
        {/* Información básica */}
        <section className="form-section">
          <h2>Información básica</h2>

          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">Slug (URL) *</label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
            />
            <span className="help-text">Se genera automáticamente del nombre</span>
          </div>

          <div className="form-group">
            <label htmlFor="descripcionCorta">Descripción corta</label>
            <input
              type="text"
              id="descripcionCorta"
              value={formData.descripcionCorta}
              onChange={(e) => handleChange('descripcionCorta', e.target.value)}
              maxLength={160}
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción completa</label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              rows={5}
            />
          </div>
        </section>

        {/* Precios y stock */}
        <section className="form-section">
          <h2>Precios y stock</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio (€) *</label>
              <input
                type="number"
                id="precio"
                value={formData.precio}
                onChange={(e) => handleChange('precio', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="precioOferta">Precio oferta (€)</label>
              <input
                type="number"
                id="precioOferta"
                value={formData.precioOferta || ''}
                onChange={(e) => handleChange('precioOferta', e.target.value ? parseFloat(e.target.value) : null)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock *</label>
            <input
              type="number"
              id="stock"
              value={formData.stock}
              onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
              min="0"
              required
            />
          </div>

          <div className="form-row checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => handleChange('activo', e.target.checked)}
              />
              <span>Producto activo</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.destacado}
                onChange={(e) => handleChange('destacado', e.target.checked)}
              />
              <span>Producto destacado</span>
            </label>
          </div>
        </section>

        {/* Categoría */}
        <section className="form-section">
          <h2>Categoría</h2>

          <div className="form-group">
            <label htmlFor="categoria">Categoría *</label>
            <select
              id="categoria"
              value={formData.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Nueva categoría</label>
            <div className="input-with-button">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Crear nueva..."
              />
              <button
                type="button"
                onClick={() => {
                  if (newCategory.trim()) {
                    setCategories([...categories, newCategory.trim()]);
                    handleChange('categoria', newCategory.trim());
                    setNewCategory('');
                  }
                }}
              >
                Añadir
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subcategoria">Subcategoría</label>
            <input
              type="text"
              id="subcategoria"
              value={formData.subcategoria}
              onChange={(e) => handleChange('subcategoria', e.target.value)}
            />
          </div>
        </section>

        {/* Imágenes */}
        <section className="form-section full-width">
          <h2>Imágenes</h2>

          <div className="form-group">
            <label>Imagen principal</label>
            <div className="image-upload-area">
              {formData.imagenPrincipal ? (
                <div className="main-image-preview">
                  <img src={formData.imagenPrincipal} alt="Principal" />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => handleChange('imagenPrincipal', '')}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="upload-placeholder">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    disabled={uploading}
                  />
                  <span className="upload-icon">📷</span>
                  <span>Subir imagen principal</span>
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Galería de imágenes</label>
            <div className="gallery-grid">
              {formData.imagenes.map((img, index) => (
                <div key={index} className="gallery-item">
                  <img src={img.url} alt={img.alt} />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="upload-placeholder small">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, false)}
                  disabled={uploading}
                />
                <span>+</span>
              </label>
            </div>
            {uploading && <p className="uploading-text">Subiendo imagen...</p>}
          </div>
        </section>

        {/* Características */}
        <section className="form-section">
          <h2>Características</h2>

          <div className="form-group">
            <label>Lista de características</label>
            <div className="tags-list">
              {formData.caracteristicas.map((car, index) => (
                <span key={index} className="tag">
                  {car}
                  <button type="button" onClick={() => removeCaracteristica(index)}>✕</button>
                </span>
              ))}
            </div>
            <div className="input-with-button">
              <input
                type="text"
                value={newCaracteristica}
                onChange={(e) => setNewCaracteristica(e.target.value)}
                placeholder="Añadir característica..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCaracteristica())}
              />
              <button type="button" onClick={addCaracteristica}>Añadir</button>
            </div>
          </div>

          <div className="form-group">
            <label>Materiales</label>
            <div className="tags-list">
              {formData.materiales.map((mat, index) => (
                <span key={index} className="tag">
                  {mat}
                  <button type="button" onClick={() => removeMaterial(index)}>✕</button>
                </span>
              ))}
            </div>
            <div className="input-with-button">
              <input
                type="text"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                placeholder="Añadir material..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
              />
              <button type="button" onClick={addMaterial}>Añadir</button>
            </div>
          </div>
        </section>

        {/* Especificaciones */}
        <section className="form-section">
          <h2>Especificaciones</h2>

          <div className="form-group">
            <label htmlFor="dimensiones">Dimensiones</label>
            <input
              type="text"
              id="dimensiones"
              value={formData.dimensiones}
              onChange={(e) => handleChange('dimensiones', e.target.value)}
              placeholder="Ej: 10 x 5 x 3 cm"
            />
          </div>

          <div className="form-group">
            <label htmlFor="peso">Peso</label>
            <input
              type="text"
              id="peso"
              value={formData.peso}
              onChange={(e) => handleChange('peso', e.target.value)}
              placeholder="Ej: 150g"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tiempoImpresion">Tiempo de impresión</label>
            <input
              type="text"
              id="tiempoImpresion"
              value={formData.tiempoImpresion}
              onChange={(e) => handleChange('tiempoImpresion', e.target.value)}
              placeholder="Ej: 4-6 horas"
            />
          </div>
        </section>

        {/* SEO */}
        <section className="form-section full-width">
          <h2>SEO</h2>

          <div className="form-group">
            <label htmlFor="metaTitle">Meta título</label>
            <input
              type="text"
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => handleChange('metaTitle', e.target.value)}
              maxLength={60}
            />
            <span className="help-text">{formData.metaTitle.length}/60 caracteres</span>
          </div>

          <div className="form-group">
            <label htmlFor="metaDescription">Meta descripción</label>
            <textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
              rows={2}
              maxLength={160}
            />
            <span className="help-text">{formData.metaDescription.length}/160 caracteres</span>
          </div>
        </section>
      </div>

      <div className="form-actions">
        <a href="/impresion3d/admin/productos/" className="btn-cancel">
          Cancelar
        </a>
        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? 'Guardando...' : (productId ? 'Actualizar producto' : 'Crear producto')}
        </button>
      </div>

      <style>{`
        .product-form {
          max-width: 1200px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .alert.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .alert.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .form-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-section.full-width {
          grid-column: 1 / -1;
        }

        .form-section h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group textarea {
          resize: vertical;
        }

        .help-text {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-row.checkboxes {
          display: flex;
          gap: 24px;
          margin-top: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-size: 0.9rem;
        }

        .input-with-button {
          display: flex;
          gap: 8px;
        }

        .input-with-button input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }

        .input-with-button button {
          padding: 10px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }

        .input-with-button button:hover {
          background: #e5e7eb;
        }

        /* Images */
        .image-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .main-image-preview {
          position: relative;
          display: inline-block;
        }

        .main-image-preview img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 20px;
        }

        .upload-placeholder input {
          display: none;
        }

        .upload-icon {
          font-size: 2rem;
        }

        .upload-placeholder span {
          color: #6b7280;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }

        .gallery-item {
          position: relative;
          aspect-ratio: 1;
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .upload-placeholder.small {
          aspect-ratio: 1;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 0;
          font-size: 2rem;
          color: #9ca3af;
        }

        .remove-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .uploading-text {
          color: #6b7280;
          font-size: 0.875rem;
          margin-top: 8px;
        }

        /* Tags */
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
          min-height: 32px;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 20px;
          font-size: 0.8rem;
        }

        .tag button {
          background: none;
          border: none;
          color: #6366f1;
          cursor: pointer;
          padding: 0;
          font-size: 0.9rem;
        }

        .tag button:hover {
          color: #4338ca;
        }

        /* Actions */
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel {
          padding: 12px 24px;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-submit {
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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

        @media (max-width: 900px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}
