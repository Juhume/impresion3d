import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import AddressSelector from './AddressSelector';
import PaymentForm from './PaymentForm';
import { getStoreConfig } from '../../lib/firestore';
import { isStripeConfigured, createPaymentIntent } from '../../lib/stripe';
import { formatPrice } from '../../lib/constants';
import type { Address, StoreConfig } from '../../types';

type CheckoutStep = 'address' | 'payment' | 'confirmation';

interface Props {
  baseUrl?: string;
}

export default function CheckoutFlow({ baseUrl = import.meta.env.BASE_URL }: Props) {
  const { user, isLoading: authLoading, isInitialized } = useAuthStore();
  const { items, getSubtotal, getTax, getTotal, clearCart } = useCartStore();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const shippingCost = storeConfig && subtotal >= storeConfig.freeShippingThreshold
    ? 0
    : (storeConfig?.shippingCost || 4.99);
  const finalTotal = total + shippingCost;

  useEffect(() => {
    async function loadConfig() {
      const config = await getStoreConfig();
      setStoreConfig(config);
    }
    loadConfig();
  }, []);

  // Crear Payment Intent cuando se pasa al paso de pago
  const handleContinueToPayment = async () => {
    if (!selectedAddress) {
      setError('Por favor, selecciona una dirección de envío');
      return;
    }

    if (!isStripeConfigured()) {
      setError('Los pagos no están configurados en este momento');
      setCurrentStep('payment');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const secret = await createPaymentIntent({
        amount: Math.round(finalTotal * 100), // Stripe usa centavos
        currency: 'eur',
        metadata: {
          userId: user?.uid || '',
          addressId: selectedAddress.id,
        },
      });

      setClientSecret(secret);
      setCurrentStep('payment');
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Error al preparar el pago. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setCurrentStep('confirmation');
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Loading state
  if (authLoading || !isInitialized) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="checkout-login-required">
        <div className="login-card">
          <h2>Inicia sesión para continuar</h2>
          <p>Necesitas una cuenta para realizar tu compra.</p>
          <div className="login-buttons">
            <a href={`${baseUrl}auth/login/`} className="btn-primary">
              Iniciar sesión
            </a>
            <a href={`${baseUrl}auth/registro/`} className="btn-secondary">
              Crear cuenta
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0 && currentStep !== 'confirmation') {
    return (
      <div className="checkout-empty">
        <h2>Tu carrito está vacío</h2>
        <p>Añade productos antes de continuar con la compra.</p>
        <a href={`${baseUrl}catalogo/`} className="btn-primary">
          Ver catálogo
        </a>
      </div>
    );
  }

  // Confirmation step
  if (currentStep === 'confirmation') {
    return (
      <div className="checkout-confirmation">
        <div className="confirmation-icon">✓</div>
        <h2>¡Pedido realizado con éxito!</h2>
        <p>Hemos recibido tu pedido y te enviaremos un email con los detalles.</p>
        <div className="confirmation-actions">
          <a href={`${baseUrl}cuenta/pedidos/`} className="btn-primary">
            Ver mis pedidos
          </a>
          <a href={baseUrl} className="btn-secondary">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-flow">
      {/* Progress steps */}
      <div className="checkout-steps">
        <div className={`step ${currentStep === 'address' ? 'active' : ''} ${currentStep === 'payment' ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Dirección</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${currentStep === 'payment' ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Pago</span>
        </div>
      </div>

      <div className="checkout-content">
        <div className="checkout-main">
          {currentStep === 'address' && (
            <div className="address-step">
              <AddressSelector
                selectedAddressId={selectedAddress?.id || null}
                onSelect={setSelectedAddress}
              />

              {error && <div className="checkout-error">{error}</div>}

              <button
                type="button"
                className="btn-continue"
                onClick={handleContinueToPayment}
                disabled={!selectedAddress || isProcessing}
              >
                {isProcessing ? 'Procesando...' : 'Continuar al pago'}
              </button>
            </div>
          )}

          {currentStep === 'payment' && (
            <div className="payment-step">
              <div className="selected-address-summary">
                <h4>Envío a:</h4>
                <p>
                  {selectedAddress?.calle}, {selectedAddress?.numero}
                  {selectedAddress?.piso && `, ${selectedAddress.piso}`}
                </p>
                <p>
                  {selectedAddress?.codigoPostal} {selectedAddress?.ciudad}
                </p>
                <button
                  type="button"
                  className="btn-change-address"
                  onClick={() => setCurrentStep('address')}
                >
                  Cambiar
                </button>
              </div>

              {error && <div className="checkout-error">{error}</div>}

              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
          )}
        </div>

        <aside className="checkout-sidebar">
          <div className="order-summary">
            <h3>Resumen del pedido</h3>

            <div className="summary-items">
              {items.map(item => (
                <div key={item.productId} className="summary-item">
                  <span className="item-name">
                    {item.nombre} <span className="item-qty">×{item.cantidad}</span>
                  </span>
                  <span className="item-price">{formatPrice(item.precio * item.cantidad)}</span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>IVA (21%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="total-row">
                <span>Envío</span>
                <span>
                  {shippingCost === 0 ? (
                    <span className="free-shipping">Gratis</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {storeConfig && subtotal < storeConfig.freeShippingThreshold && (
                <div className="shipping-hint">
                  Envío gratis a partir de {formatPrice(storeConfig.freeShippingThreshold)}
                </div>
              )}
              <div className="total-row final">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .checkout-flow {
          width: 100%;
        }

        .checkout-loading,
        .checkout-login-required,
        .checkout-empty,
        .checkout-confirmation {
          text-align: center;
          padding: 48px 24px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-card {
          max-width: 400px;
          margin: 0 auto;
          padding: 32px;
          background-color: var(--color-bg-elevated);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }

        .login-card h2 {
          font-size: 1.25rem;
          margin: 0 0 8px 0;
        }

        .login-card p {
          color: var(--color-text-muted);
          margin: 0 0 24px 0;
        }

        .login-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checkout-empty h2,
        .checkout-confirmation h2 {
          font-size: 1.5rem;
          margin: 0 0 12px 0;
        }

        .checkout-empty p,
        .checkout-confirmation p {
          color: var(--color-text-muted);
          margin: 0 0 24px 0;
        }

        .confirmation-icon {
          width: 64px;
          height: 64px;
          background-color: var(--color-success);
          color: var(--color-bg);
          font-size: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .confirmation-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .checkout-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background-color: var(--color-border);
          color: var(--color-text-muted);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .step.active .step-number {
          background: var(--gradient-primary);
          color: var(--color-bg);
        }

        .step.completed .step-number {
          background-color: var(--color-success);
          color: var(--color-bg);
        }

        .step-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text-muted);
        }

        .step.active .step-label {
          color: var(--color-text);
        }

        .step-connector {
          width: 64px;
          height: 2px;
          background-color: var(--color-border);
          margin: 0 16px;
        }

        .checkout-content {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }

        .checkout-main {
          background-color: var(--color-bg-elevated);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-md);
        }

        .address-step,
        .payment-step {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .checkout-error {
          padding: 12px;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-sm);
          color: var(--color-error-light);
          font-size: 0.875rem;
        }

        .btn-continue {
          padding: 14px 24px;
          background: var(--gradient-primary);
          color: var(--color-bg);
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-glow-sm);
        }

        .btn-continue:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }

        .btn-continue:disabled {
          background: var(--color-border);
          color: var(--color-text-muted);
          cursor: not-allowed;
          box-shadow: none;
        }

        .selected-address-summary {
          background-color: var(--color-surface);
          border-radius: var(--radius-sm);
          padding: 16px;
          position: relative;
        }

        .selected-address-summary h4 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-muted);
          margin: 0 0 6px 0;
        }

        .selected-address-summary p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .btn-change-address {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          background: none;
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .checkout-sidebar {
          position: sticky;
          top: 100px;
        }

        .order-summary {
          background-color: var(--color-bg-elevated);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-md);
        }

        .order-summary h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: var(--color-text);
        }

        .summary-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 16px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }

        .item-name {
          color: var(--color-text-secondary);
        }

        .item-qty {
          color: var(--color-text-muted);
        }

        .item-price {
          font-weight: 500;
          color: var(--color-text);
        }

        .summary-totals {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }

        .total-row.final {
          padding-top: 12px;
          margin-top: 4px;
          border-top: 1px solid var(--color-border);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .free-shipping {
          color: var(--color-success);
          font-weight: 500;
        }

        .shipping-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-align: right;
          margin-top: 4px;
        }

        .btn-primary {
          display: inline-block;
          padding: 12px 24px;
          background: var(--gradient-primary);
          color: var(--color-bg);
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-decoration: none;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-glow-sm);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }

        .btn-secondary {
          display: inline-block;
          padding: 12px 24px;
          background-color: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .btn-secondary:hover {
          background-color: var(--color-surface-hover);
        }

        @media (max-width: 900px) {
          .checkout-content {
            grid-template-columns: 1fr;
          }

          .checkout-sidebar {
            position: static;
          }
        }

        @media (max-width: 480px) {
          .checkout-steps {
            margin-bottom: 24px;
          }

          .step-connector {
            width: 32px;
            margin: 0 8px;
          }

          .checkout-main {
            padding: 16px;
          }

          .order-summary {
            padding: 16px;
          }

          .confirmation-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
