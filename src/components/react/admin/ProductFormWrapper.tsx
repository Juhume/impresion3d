import { useState, useEffect } from 'react';
import AdminWrapper from './AdminWrapper';
import ProductForm from './ProductForm';

function ProductFormContent() {
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get product ID from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setProductId(id);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando...</p>
        <style>{`
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
        `}</style>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="error-state">
        <p>No se especificó ningún producto</p>
        <a href="/impresion3d/admin/productos/" className="btn-back">
          Volver a productos
        </a>
        <style>{`
          .error-state {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 12px;
          }
          .error-state p {
            color: #6b7280;
            margin-bottom: 16px;
          }
          .btn-back {
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  return <ProductForm productId={productId} />;
}

export default function ProductFormWrapper() {
  return (
    <AdminWrapper>
      <ProductFormContent />
    </AdminWrapper>
  );
}
