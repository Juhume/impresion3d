import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured, getStorageUrl } from '../../lib/firebase';
import '../../styles/components/product-detail.css';
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

interface ProductDetailProps {
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

export default function ProductDetail({ baseUrl }: ProductDetailProps) {
  const [product, setProduct] = useState<FirebaseProduct | null>(null);
  const [related, setRelated] = useState<FirebaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (slug) {
      loadProduct(slug);
    } else {
      setError('Producto no encontrado');
      setLoading(false);
    }
  }, []);

  async function loadProduct(slug: string) {
    if (!isFirebaseConfigured()) {
      setError('Firebase no está configurado');
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'pokebolas'));

      const allProducts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FirebaseProduct[];

      const prod = allProducts.find(
        (p) => slugify(p.nombre) === slug
      );

      if (!prod) {
        setError('Producto no encontrado');
        setLoading(false);
        return;
      }

      setProduct(prod);

      // Related products (same category, excluding current)
      const relatedProducts = allProducts
        .filter((p) => p.categoria === prod.categoria && p.id !== prod.id)
        .slice(0, 3);

      setRelated(relatedProducts);
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  }

  function getImageSrc(product: FirebaseProduct): string {
    if (!product.imagen) return '';
    return getStorageUrl(product.imagen);
  }

  if (loading) {
    return (
      <div className="product-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Cargando producto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-error">
        <div className="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <p>{error || 'Producto no encontrado'}</p>
        <a href={`${baseUrl}catalogo/`} className="btn btn-primary">
          Volver al catálogo
        </a>
      </div>
    );
  }

  const precio =
    typeof product.precio === 'string'
      ? parseFloat(product.precio)
      : product.precio;
  const imagenSrc = getImageSrc(product);
  const numRef = (product.ref || 0).toString().padStart(4, '0');
  const tieneStock = (product.stock || 0) > 0;

  const features = [
    { icon: 'material', label: 'Material PLA ecológico', value: 'PLA+' },
    { icon: 'print', label: 'Impresión bajo demanda', value: 'FDM' },
    { icon: 'color', label: 'Colores personalizables', value: '+20' },
    { icon: 'ship', label: 'Envío a toda España', value: '24-48h' },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Navegación">
        <a href={baseUrl} className="breadcrumb-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Inicio</span>
        </a>
        <span className="breadcrumb-sep mono" aria-hidden="true">/</span>
        <a href={`${baseUrl}catalogo/`} className="breadcrumb-link">
          <span>Catálogo</span>
        </a>
        <span className="breadcrumb-sep mono" aria-hidden="true">/</span>
        <span className="breadcrumb-current">{product.nombre}</span>
      </nav>

      {/* Product Content */}
      <div className="product-content">
        {/* Gallery */}
        <div className="product-gallery-section">
          <div className="gallery-main">
            <div className="image-container">
              <div className="image-bg" aria-hidden="true" />
              {imagenSrc ? (
                <img src={imagenSrc} alt={product.nombre} />
              ) : (
                <div className="image-placeholder detail-placeholder">
                  <span className="placeholder-name">{product.nombre}</span>
                </div>
              )}
            </div>
          </div>
          <div className="gallery-info">
            <span className="info-item mono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
              </svg>
              Impresión 3D
            </span>
            <span className="info-item mono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {tieneStock ? 'En stock' : 'Bajo demanda'}
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info-section">
          <div className="info-header">
            {product.categoria && (
              <span className="product-category-label mono">{product.categoria}</span>
            )}
            <span className="info-line" aria-hidden="true" />
            <span className="product-ref mono">REF: #{numRef}</span>
          </div>

          <h1 className="product-title">{product.nombre}</h1>

          {/* Price Block */}
          <div className="price-block">
            <div className="price-main">
              <span className="price-current-detail mono">
                {precio.toFixed(2)}€
              </span>
            </div>
            <span className="price-note">Precio orientativo · IVA incluido</span>
          </div>

          {/* Stock Status */}
          <div className="product-stock-status">
            <span className={`stock-indicator ${tieneStock ? 'in-stock' : 'on-demand'}`}>
              <span className="stock-dot" />
              {tieneStock ? `En stock (${product.stock} uds.)` : 'Fabricación bajo pedido'}
            </span>
          </div>

          {/* Video */}
          {product.video && (
            <div className="product-video-section">
              <a
                href={product.video}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary video-link"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Ver vídeo del producto
              </a>
            </div>
          )}

          {/* WhatsApp CTA */}
          <div className="product-actions">
            <a
              href={`https://wa.me/34693846562?text=Hola! Me interesa el producto: ${product.nombre} (Ref: ${numRef})`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary whatsapp-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Consultar por WhatsApp
            </a>

            <p className="response-hint mono">
              <span className="pulse-dot" aria-hidden="true" />
              Te respondemos en menos de 24h
            </p>
          </div>

          {/* Features */}
          <div className="product-features-section">
            <h3 className="features-title">
              <span className="title-index mono">01</span>
              Características
            </h3>
            <div className="features-grid">
              {features.map((feature) => (
                <div key={feature.icon} className="feature-item">
                  <span className="feature-icon-box" aria-hidden="true">
                    {feature.icon === 'material' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 21c3-3 6-11 14-14-3 8-11 11-14 14zM6 21V10" />
                      </svg>
                    )}
                    {feature.icon === 'print' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
                        <path d="M12 12l8-5M12 12l-8-5M12 12v10" />
                      </svg>
                    )}
                    {feature.icon === 'color' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                    )}
                    {feature.icon === 'ship' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 3h15v13H1zM16 8h4l3 4v5h-7V8z" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                    )}
                  </span>
                  <div className="feature-text">
                    <span className="feature-label">{feature.label}</span>
                    <span className="feature-value mono">{feature.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="related-products">
          <div className="related-header">
            <div className="related-title-group">
              <span className="section-index mono">02</span>
              <h2>Productos relacionados</h2>
            </div>
            <a href={`${baseUrl}catalogo/`} className="link-ver-todos">
              <span>Ver catálogo</span>
              <span className="link-arrow mono">→</span>
            </a>
          </div>
          <div className="products-grid">
            {related.map((p, index) => {
              const pImg = getImageSrc(p);
              const pPrecio =
                typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio;
              const pRef = (p.ref || 0).toString().padStart(4, '0');
              const pSlug = slugify(p.nombre);

              return (
                <div
                  key={p.id}
                  className="product-item"
                  style={{ '--index': index } as React.CSSProperties}
                >
                  <article className="product-card">
                    <a
                      href={`${baseUrl}producto/?slug=${pSlug}`}
                      className="product-link"
                    >
                      <div className="card-glow" aria-hidden="true" />
                      <div className="product-image">
                        <div className="image-wrapper">
                          <img
                            src={pImg}
                            alt={p.nombre}
                            loading="lazy"
                            width="400"
                            height="400"
                          />
                        </div>
                      </div>
                      <div className="product-info">
                        <div className="info-top">
                          <span className="product-category mono">#{pRef}</span>
                          <div className="category-line" aria-hidden="true" />
                        </div>
                        <h3 className="product-name">{p.nombre}</h3>
                        <div className="product-footer">
                          <div className="product-pricing">
                            <span className="price-current mono">
                              {pPrecio.toFixed(2)}€
                            </span>
                          </div>
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
        </div>
      )}
    </>
  );
}
