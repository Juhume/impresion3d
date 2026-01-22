import { useCartStore } from '../../stores/cartStore';
import type { CartItem as CartItemType } from '../../types';
import { formatPrice } from '../../types';

interface Props {
  item: CartItemType;
  baseUrl: string;
}

export default function CartItem({ item, baseUrl }: Props) {
  const { updateQuantity, removeItem } = useCartStore();

  const handleDecrease = () => {
    if (item.cantidad > 1) {
      updateQuantity(item.productId, item.cantidad - 1);
    } else {
      removeItem(item.productId);
    }
  };

  const handleIncrease = () => {
    updateQuantity(item.productId, item.cantidad + 1);
  };

  // Construir URL de imagen con base URL
  const imageUrl = item.imagen.startsWith('/')
    ? `${baseUrl}${item.imagen.slice(1)}`
    : item.imagen;

  return (
    <div className="cart-item">
      <a href={`${baseUrl}producto/?slug=${item.slug}`} className="cart-item-image">
        <img src={imageUrl} alt={item.nombre} />
      </a>

      <div className="cart-item-info">
        <a href={`${baseUrl}producto/?slug=${item.slug}`} className="cart-item-name">
          {item.nombre}
        </a>
        <div className="cart-item-price">{formatPrice(item.precio)}</div>

        <div className="cart-item-actions">
          <div className="quantity-controls">
            <button
              onClick={handleDecrease}
              className="quantity-btn"
              aria-label="Reducir cantidad"
            >
              −
            </button>
            <span className="quantity-value">{item.cantidad}</span>
            <button
              onClick={handleIncrease}
              className="quantity-btn"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          <button
            onClick={() => removeItem(item.productId)}
            className="remove-btn"
            aria-label="Eliminar producto"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="cart-item-subtotal">
        {formatPrice(item.precio * item.cantidad)}
      </div>

      <style>{`
        .cart-item {
          display: flex;
          gap: 12px;
          padding: 16px 0;
          border-bottom: 1px solid #e5e5e5;
        }

        .cart-item-image {
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          background: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cart-item-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .cart-item-info {
          flex: 1;
          min-width: 0;
        }

        .cart-item-name {
          font-weight: 500;
          color: #1a1a1a;
          text-decoration: none;
          display: block;
          margin-bottom: 4px;
          font-size: 0.95rem;
        }

        .cart-item-name:hover {
          color: #2563eb;
        }

        .cart-item-price {
          color: #666;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          overflow: hidden;
        }

        .quantity-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #1a1a1a;
          transition: background 0.15s ease;
        }

        .quantity-btn:hover {
          background: #e5e5e5;
        }

        .quantity-value {
          width: 32px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .remove-btn:hover {
          color: #ef4444;
        }

        .cart-item-subtotal {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 0.95rem;
          text-align: right;
          min-width: 70px;
        }
      `}</style>
    </div>
  );
}
