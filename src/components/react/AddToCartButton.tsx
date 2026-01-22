import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { useToast } from './ui/Toast';
import { MAX_CART_ITEM_QUANTITY } from '../../lib/constants';

interface Props {
  productId: string;
  slug: string;
  nombre: string;
  precio: number;
  imagen: string;
}

export default function AddToCartButton({
  productId,
  slug,
  nombre,
  precio,
  imagen,
}: Props) {
  const [cantidad, setCantidad] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const toast = useToast();

  const handleDecrease = () => {
    if (cantidad > 1) {
      setCantidad(cantidad - 1);
    }
  };

  const handleIncrease = () => {
    if (cantidad < MAX_CART_ITEM_QUANTITY) {
      setCantidad(cantidad + 1);
    }
  };

  const handleAddToCart = () => {
    setIsAdding(true);

    addItem({
      productId,
      slug,
      nombre,
      precio,
      cantidad,
      imagen,
    });

    // Mostrar toast de confirmación
    toast.success(`${nombre} añadido al carrito`);

    // Reset cantidad y mostrar feedback visual
    setTimeout(() => {
      setCantidad(1);
      setIsAdding(false);
    }, 300);
  };

  return (
    <div className="add-to-cart">
      <div className="quantity-selector">
        <button
          onClick={handleDecrease}
          className="qty-btn"
          disabled={cantidad <= 1}
          aria-label="Reducir cantidad"
        >
          −
        </button>
        <span className="qty-value">{cantidad}</span>
        <button
          onClick={handleIncrease}
          className="qty-btn"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAddToCart}
        className={`add-btn ${isAdding ? 'adding' : ''}`}
        disabled={isAdding}
      >
        {isAdding ? (
          <>
            <svg
              className="check-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Añadido
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="m1 1 4 4h16l-2.5 7.5H7.5" />
              <path d="M6.5 12.5 5 19h14" />
            </svg>
            Añadir al carrito
          </>
        )}
      </button>

      <style>{`
        .add-to-cart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          overflow: hidden;
          width: fit-content;
        }

        .qty-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          color: #1a1a1a;
          transition: background 0.15s ease;
        }

        .qty-btn:hover:not(:disabled) {
          background: #e5e5e5;
        }

        .qty-btn:disabled {
          color: #ccc;
          cursor: not-allowed;
        }

        .qty-value {
          width: 50px;
          text-align: center;
          font-size: 1rem;
          font-weight: 600;
        }

        .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 32px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-btn:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .add-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .add-btn.adding {
          background: #22c55e;
        }

        .add-btn:disabled {
          cursor: not-allowed;
        }

        .check-icon {
          animation: checkPop 0.3s ease;
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        @media (max-width: 480px) {
          .add-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
