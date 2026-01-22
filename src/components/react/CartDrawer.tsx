import { useEffect, useRef } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { formatPrice } from '../../types';
import CartItem from './CartItem';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface Props {
  baseUrl: string;
}

export default function CartDrawer({ baseUrl }: Props) {
  const { items, isOpen, closeCart, clearCart, getSubtotal, getTax, getTotal } =
    useCartStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap para accesibilidad - mantiene el foco dentro del drawer
  const drawerRef = useFocusTrap<HTMLElement>({
    isActive: isOpen,
    onEscape: closeCart,
    initialFocusRef: closeButtonRef,
    returnFocusOnDeactivate: true,
  });

  // Prevenir scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={`cart-drawer ${isOpen ? 'open' : ''}`}
        aria-label="Carrito de compra"
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cart-header">
          <h2 id="cart-drawer-title">Tu carrito</h2>
          <button ref={closeButtonRef} onClick={closeCart} className="close-btn" aria-label="Cerrar carrito">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="cart-content">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccc"
                strokeWidth="1.5"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="m1 1 4 4h16l-2.5 7.5H7.5" />
                <path d="M6.5 12.5 5 19h14" />
              </svg>
              <p>Tu carrito está vacío</p>
              <a href={`${baseUrl}catalogo/`} className="btn-browse" onClick={closeCart}>
                Ver catálogo
              </a>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {items.map((item) => (
                  <CartItem key={item.productId} item={item} baseUrl={baseUrl} />
                ))}
              </div>

              {items.length > 0 && (
                <button onClick={clearCart} className="clear-cart-btn">
                  Vaciar carrito
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer with totals */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>IVA (21%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <a href={`${baseUrl}checkout/`} className="checkout-btn">
              Finalizar compra
            </a>

            <p className="cart-note">
              Debes iniciar sesión para completar tu compra
            </p>
          </div>
        )}
      </aside>

      <style>{`
        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
          z-index: 998;
        }

        .cart-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .cart-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 420px;
          background: white;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .cart-drawer.open {
          transform: translateX(0);
        }

        .cart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5e5;
          flex-shrink: 0;
        }

        .cart-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .close-btn:hover {
          color: #1a1a1a;
        }

        .cart-content {
          flex: 1;
          overflow-y: auto;
          padding: 0 24px;
        }

        .cart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #666;
        }

        .cart-empty svg {
          margin-bottom: 16px;
        }

        .cart-empty p {
          margin: 0 0 20px;
          font-size: 1rem;
        }

        .btn-browse {
          display: inline-block;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.15s ease;
        }

        .btn-browse:hover {
          background: #1d4ed8;
        }

        .cart-items {
          padding: 8px 0;
        }

        .clear-cart-btn {
          display: block;
          width: 100%;
          padding: 10px;
          margin: 8px 0 16px;
          background: none;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          color: #666;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .clear-cart-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .cart-footer {
          border-top: 1px solid #e5e5e5;
          padding: 20px 24px;
          flex-shrink: 0;
          background: #fafafa;
        }

        .cart-totals {
          margin-bottom: 16px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.9rem;
          color: #666;
        }

        .total-final {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
          padding-top: 12px;
          margin-top: 8px;
          border-top: 1px solid #e5e5e5;
        }

        .checkout-btn {
          display: block;
          width: 100%;
          padding: 14px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .checkout-btn:hover {
          background: #1d4ed8;
        }

        .cart-note {
          margin: 12px 0 0;
          font-size: 0.8rem;
          color: #888;
          text-align: center;
        }

        @media (max-width: 480px) {
          .cart-drawer {
            max-width: 100%;
          }

          .cart-header,
          .cart-content,
          .cart-footer {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </>
  );
}
