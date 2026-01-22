import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured, getStorageUrl } from '../../lib/firebase';
import '../../styles/components/product-catalog.css';

// Tipo basado en la estructura real de Firestore (colección pokebolas)
interface FirebaseProduct {
  id: string;
  nombre: string;
  imagen: string;
  precio: number | string;
  ref?: number;
  stock?: number;
  video?: string;
  categoria?: string;
}

interface ProductCatalogProps {
  baseUrl: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function ProductCatalog({ baseUrl }: ProductCatalogProps) {
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!isFirebaseConfigured()) {
      setError('Firebase no está configurado');
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'pokebolas'));

      const prods: FirebaseProduct[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseProduct[];

      // Ordenar: primero los que tienen stock
      prods.sort((a, b) => (b.stock || 0) - (a.stock || 0));

      // Extraer categorías únicas
      const cats = [...new Set(prods.map((p) => p.categoria).filter(Boolean))] as string[];

      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      console.error('Error loading catalog:', err);
      setError(err?.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeFilter === 'todos' || p.categoria === activeFilter;
    const matchesSearch =
      !searchQuery ||
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ref && p.ref.toString().includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  function getImageSrc(product: FirebaseProduct): string {
    if (!product.imagen) return '';
    return getStorageUrl(product.imagen);
  }

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Cargando catálogo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="catalog-header">
        <div className="header-content">
          <div className="header-title-group">
            <span className="page-index mono">Catálogo</span>
            <h1>Nuestra colección</h1>
          </div>
          <p className="catalog-subtitle">
            Explora nuestra selección de piezas únicas impresas en 3D.
            <br className="hide-mobile" />
            Cada producto está fabricado con precisión y atención al detalle.
          </p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value mono">{products.length}</span>
            <span className="stat-label">Productos</span>
          </div>
          <div className="stat">
            <span className="stat-value mono">{categories.length}</span>
            <span className="stat-label">Categorías</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="catalog-search">
        <input
          type="text"
          className="search-input"
          placeholder="Busca tu figura..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      {categories.length > 0 && (
        <div className="catalog-filters" role="tablist" aria-label="Filtrar por categoría">
          <button
            className={`filter-btn${activeFilter === 'todos' ? ' active' : ''}`}
            onClick={() => setActiveFilter('todos')}
            role="tab"
            aria-selected={activeFilter === 'todos'}
          >
            <span>Todos</span>
            <span className="filter-count mono">{products.length}</span>
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoria === cat).length;
            return (
              <button
                key={cat}
                className={`filter-btn${activeFilter === cat ? ' active' : ''}`}
                onClick={() => setActiveFilter(cat)}
                role="tab"
                aria-selected={activeFilter === cat}
              >
                <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span className="filter-count mono">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="products-grid" role="tabpanel">
          {filteredProducts.map((producto, index) => {
            const precio =
              typeof producto.precio === 'string'
                ? parseFloat(producto.precio)
                : producto.precio;
            const imagenSrc = getImageSrc(producto);
            const slug = slugify(producto.nombre);
            const numRef = (producto.ref || 0).toString().padStart(4, '0');
            const tieneStock = (producto.stock || 0) > 0;

            return (
              <div
                key={producto.id}
                className="product-item"
                style={{ '--index': index } as React.CSSProperties}
              >
                <article className="product-card">
                  <a href={`${baseUrl}producto/?slug=${slug}`} className="product-link">
                    <div className="card-glow" aria-hidden="true" />

                    <div className="product-image">
                      <div className="image-pattern" aria-hidden="true">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <pattern
                              id={`grid-${producto.id}`}
                              width="10"
                              height="10"
                              patternUnits="userSpaceOnUse"
                            >
                              <path
                                d="M 10 0 L 0 0 0 10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                              />
                            </pattern>
                          </defs>
                          <rect width="100" height="100" fill={`url(#grid-${producto.id})`} />
                        </svg>
                      </div>
                      <div className="image-wrapper">
                        {imagenSrc ? (
                          <img
                            src={imagenSrc}
                            alt={producto.nombre}
                            loading="lazy"
                            width="400"
                            height="400"
                            decoding="async"
                          />
                        ) : (
                          <div className="image-placeholder">
                            <span className="placeholder-name">{producto.nombre}</span>
                          </div>
                        )}
                      </div>

                      <div className={`stock-badge ${tieneStock ? 'in-stock' : 'on-demand'}`}>
                        <span className="badge-text mono">
                          {tieneStock ? 'Envío inmediato' : 'Bajo pedido'}
                        </span>
                      </div>

                      <div className="hover-overlay" aria-hidden="true">
                        <div className="overlay-content">
                          <span className="view-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                            </svg>
                          </span>
                          <span className="view-text mono">Ver detalles</span>
                        </div>
                        <div className="overlay-gradient" />
                      </div>
                    </div>

                    <div className="product-info">
                      <div className="info-top">
                        <span className="product-category mono">#{numRef}</span>
                        <div className="category-line" aria-hidden="true" />
                      </div>

                      <h3 className="product-name">{producto.nombre}</h3>

                      <div className="product-footer">
                        <div className="product-pricing">
                          <span className="price-current mono">{precio.toFixed(2)}€</span>
                        </div>
                        <span className="arrow-indicator" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="card-accent" aria-hidden="true">
                      <div className="accent-progress" />
                    </div>
                  </a>
                </article>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="empty-text">No hay productos con esa búsqueda</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setActiveFilter('todos');
              setSearchQuery('');
            }}
          >
            Ver todos los productos
          </button>
        </div>
      )}
    </>
  );
}
