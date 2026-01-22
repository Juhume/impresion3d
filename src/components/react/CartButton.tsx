import { useCartStore } from '../../stores/cartStore';

export default function CartButton() {
  const { toggleCart, getItemCount } = useCartStore();
  const itemCount = getItemCount();

  return (
    <button
      onClick={toggleCart}
      className="cart-button"
      aria-label={`Carrito (${itemCount} productos)`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {itemCount > 0 && (
        <span className="cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>
      )}

      <style>{`
        .cart-button {
          position: relative;
          width: 40px;
          height: 40px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cart-button:hover {
          color: var(--color-accent-light);
          border-color: var(--color-accent);
          background: var(--color-accent-glow);
        }

        .cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--color-accent);
          color: var(--color-bg);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px var(--color-bg);
        }

        @media (max-width: 480px) {
          .cart-button {
            width: 36px;
            height: 36px;
          }

          .cart-button svg {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </button>
  );
}
