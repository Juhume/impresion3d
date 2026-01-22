import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured, getStorageUrl } from '../../lib/firebase';
import '../../styles/components/product-catalog.css';

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

interface FeaturedProductsProps {
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

export default function FeaturedProducts({ baseUrl }: FeaturedProductsProps) {
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatured();
  }, []);

  async function loadFeatured() {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'pokebolas'));

      const featured = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as FirebaseProduct)
        .filter((p) => (p.stock || 0) > 0)
        .slice(0, 6);

      setProducts(featured);
    } catch (err) {
      console.error('Error loading featured products:', err);
    } finally {
      setLoading(false);
    }
  }

  function getImageSrc(product: FirebaseProduct): string {
    if (!product.imagen) return `${baseUrl}images/placeholder.svg`;
    return getStorageUrl(product.imagen);
  }

  if (loading) {
    return (
      <div className="products-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="product-item" style={{ '--index': i } as React.CSSProperties}>
            <div className="product-card product-card-skeleton">
              <div className="product-image skeleton-image" />
              <div className="product-info">
                <div className="skeleton-line skeleton-short" />
                <div className="skeleton-line skeleton-medium" />
                <div className="skeleton-line skeleton-short" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="products-grid">
      {products.map((producto, index) => {
        const precio =
          typeof producto.precio === 'string'
            ? parseFloat(producto.precio)
            : producto.precio;
        const imagenSrc = getImageSrc(producto);
        const slug = slugify(producto.nombre);
        const numRef = (producto.ref || 0).toString().padStart(4, '0');

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
                          id={`grid-feat-${producto.id}`}
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
                      <rect
                        width="100"
                        height="100"
                        fill={`url(#grid-feat-${producto.id})`}
                      />
                    </svg>
                  </div>
                  <div className="image-wrapper">
                    <img
                      src={imagenSrc}
                      alt={producto.nombre}
                      loading="lazy"
                      width="400"
                      height="400"
                      decoding="async"
                    />
                  </div>

                  <div className="stock-badge in-stock">
                    <span className="badge-text mono">Envío inmediato</span>
                  </div>

                  <div className="hover-overlay" aria-hidden="true">
                    <div className="overlay-content">
                      <span className="view-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
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
                      <span className="price-current mono">
                        {precio.toFixed(2)}€
                      </span>
                    </div>
                    <span className="arrow-indicator" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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
  );
}
