import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isFirebaseConfigured, getFirebaseApp } from './firebase';

let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.warn('Stripe publishable key not configured');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
}

// Verificar si Stripe está configurado
export function isStripeConfigured(): boolean {
  return Boolean(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

// Obtener la clave pública de Stripe
export function getStripePublishableKey(): string | undefined {
  return import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

// Crear Payment Intent a través de Cloud Function
export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured. Cannot create payment intent.');
  }

  if (!isStripeConfigured()) {
    throw new Error('Stripe not configured.');
  }

  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app, 'europe-west1');
    const createPayment = httpsCallable<typeof params, { clientSecret: string }>(
      functions,
      'createPaymentIntent'
    );

    const result = await createPayment(params);
    return result.data.clientSecret;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);

    // Si la Cloud Function no existe aún, mostrar error informativo
    if (error.code === 'functions/not-found') {
      throw new Error(
        'La función de pago no está disponible. Las Cloud Functions necesitan ser desplegadas.'
      );
    }

    throw new Error(error.message || 'Error al crear el pago');
  }
}

// Verificar estado de un pago
export async function checkPaymentStatus(paymentIntentId: string): Promise<{
  status: string;
  orderId?: string;
}> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured.');
  }

  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app, 'europe-west1');
    const checkPayment = httpsCallable<
      { paymentIntentId: string },
      { status: string; orderId?: string }
    >(functions, 'checkPaymentStatus');

    const result = await checkPayment({ paymentIntentId });
    return result.data;
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    throw new Error(error.message || 'Error al verificar el pago');
  }
}
