import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { isStripeConfigured, getStripePublishableKey } from '../../lib/stripe';

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

// Componente interno que usa los hooks de Stripe
function PaymentFormInner({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/impresion3d/checkout/confirmacion/`,
        },
      });

      if (error) {
        onError(error.message || 'Error al procesar el pago');
        setIsProcessing(false);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      onError('Error al procesar el pago');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <button
        type="submit"
        className="btn-pay"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Procesando...' : 'Pagar ahora'}
      </button>

      <style>{`
        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .btn-pay {
          padding: 14px 24px;
          background-color: #2563eb;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s;
          margin-top: 8px;
        }

        .btn-pay:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .btn-pay:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}

// Componente wrapper que carga Stripe Elements
export default function PaymentForm({
  clientSecret,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    if (isStripeConfigured()) {
      const key = getStripePublishableKey();
      if (key) {
        setStripePromise(loadStripe(key));
      }
    }
  }, []);

  if (!isStripeConfigured()) {
    return (
      <div className="stripe-not-configured">
        <div className="warning-icon">⚠️</div>
        <h4>Stripe no configurado</h4>
        <p>Los pagos no están disponibles en este momento.</p>
        <p className="hint">Configura las variables de entorno de Stripe para habilitar pagos.</p>
        <style>{`
          .stripe-not-configured {
            text-align: center;
            padding: 32px;
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 12px;
          }

          .warning-icon {
            font-size: 2rem;
            margin-bottom: 12px;
          }

          .stripe-not-configured h4 {
            font-size: 1rem;
            font-weight: 600;
            color: #92400e;
            margin: 0 0 8px 0;
          }

          .stripe-not-configured p {
            color: #92400e;
            margin: 0;
            font-size: 0.9rem;
          }

          .hint {
            margin-top: 8px;
            font-size: 0.8rem;
            opacity: 0.8;
          }
        `}</style>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Preparando el pago...</p>
        <style>{`
          .payment-loading {
            text-align: center;
            padding: 32px;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e5e5e5;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 12px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .payment-loading p {
            color: #6b7280;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner
        onSuccess={onSuccess}
        onError={onError}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    </Elements>
  );
}
