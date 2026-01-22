import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { getStorageUrl } from '../../lib/firebase';

interface AddToCartButtonProps {
  productId: string;
  nombre: string;
  precio: number;
  imagen: string;
  slug: string;
  className?: string;
}

export default function AddToCartButton({
  productId,
  nombre,
  precio,
  imagen,
  slug,
  className = '',
}: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      productId,
      slug,
      nombre,
      precio,
      cantidad: 1,
      imagen: imagen ? getStorageUrl(imagen) : '',
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className={`btn btn-primary add-to-cart-btn ${added ? 'added' : ''} ${className}`}
      disabled={added}
    >
      {added ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Añadido
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          Añadir al carrito
        </>
      )}
    </button>
  );
}
