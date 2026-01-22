/**
 * Firebase Cloud Functions para el ecommerce
 *
 * Funciones disponibles:
 * - createPaymentIntent: Crear un Payment Intent de Stripe
 * - stripeWebhook: Procesar webhooks de Stripe
 * - checkPaymentStatus: Verificar estado de un pago
 * - onUserCreated: Trigger al crear usuario (email de bienvenida)
 * - onOrderStatusChanged: Trigger al cambiar estado de pedido (emails)
 *
 * Para desplegar:
 * cd firebase/functions && npm run deploy
 *
 * Configurar secrets:
 * firebase functions:secrets:set STRIPE_SECRET_KEY
 * firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 * firebase functions:secrets:set RESEND_API_KEY
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { sendEmail } from './email/sendEmail';
import {
  welcomeEmail,
  orderConfirmationEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  lowStockAlertEmail,
} from './email/templates';
import {
  CartItem,
  calculateSubtotal,
  calculateTax,
  calculateShipping,
  calculateTotal,
  validatePaymentAmount,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_COST,
} from './types/shared';

// Inicializar Firebase Admin
admin.initializeApp();

// Secrets (configurar con firebase functions:secrets:set)
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const resendApiKey = defineSecret('RESEND_API_KEY');

// Región para Cloud Functions
const REGION = 'europe-west1';

// Email del administrador para alertas
const ADMIN_EMAIL = 'admin@impresion3d.com';

/**
 * Crear un Payment Intent de Stripe
 * Callable function que recibe amount, currency y metadata
 *
 * SEGURIDAD: Valida que el monto coincida con el carrito real en Firestore
 */
export const createPaymentIntent = onCall(
  {
    region: REGION,
    secrets: [stripeSecretKey],
  },
  async (request) => {
    // Verificar autenticación
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { amount, currency, metadata } = request.data;
    const userId = request.auth.uid;

    // Validaciones básicas
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Cantidad inválida');
    }

    if (!currency) {
      throw new HttpsError('invalid-argument', 'Moneda no especificada');
    }

    const db = admin.firestore();

    try {
      // VALIDACIÓN CRÍTICA: Obtener carrito real desde Firestore
      const cartDoc = await db.collection('carts').doc(userId).get();
      const cartData = cartDoc.data();

      if (!cartDoc.exists || !cartData || !cartData.items || cartData.items.length === 0) {
        throw new HttpsError('failed-precondition', 'El carrito está vacío');
      }

      const cartItems = cartData.items as CartItem[];

      // Validar que el monto proporcionado coincide con el carrito
      if (!validatePaymentAmount(amount, cartItems)) {
        const subtotal = calculateSubtotal(cartItems);
        const shipping = calculateShipping(subtotal);
        const expectedTotal = calculateTotal(subtotal, shipping);
        const expectedAmountCents = Math.round(expectedTotal * 100);

        console.error(
          `Amount mismatch for user ${userId}: provided ${amount}, expected ${expectedAmountCents}`
        );
        throw new HttpsError(
          'invalid-argument',
          'El monto no coincide con el carrito. Por favor, recarga la página.'
        );
      }

      // Crear Payment Intent con monto validado
      const stripe = new Stripe(stripeSecretKey.value(), {
        apiVersion: '2023-10-16',
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          ...metadata,
          userId,
          // Guardar info del carrito para auditoría
          cartItemCount: cartItems.length.toString(),
          cartSubtotal: calculateSubtotal(cartItems).toFixed(2),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);

      // Re-lanzar HttpsError si ya es uno
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', 'Error al crear el pago');
    }
  }
);

/**
 * Verificar estado de un pago
 */
export const checkPaymentStatus = onCall(
  {
    region: REGION,
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { paymentIntentId } = request.data;

    if (!paymentIntentId) {
      throw new HttpsError('invalid-argument', 'Payment Intent ID requerido');
    }

    try {
      const stripe = new Stripe(stripeSecretKey.value(), {
        apiVersion: '2023-10-16',
      });

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Verificar que el pago pertenece al usuario
      if (paymentIntent.metadata.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'No autorizado');
      }

      return {
        status: paymentIntent.status,
        orderId: paymentIntent.metadata.orderId,
      };
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      throw new HttpsError('internal', 'Error al verificar el pago');
    }
  }
);

/**
 * Webhook de Stripe para procesar eventos
 * HTTP function (no callable)
 */
export const stripeWebhook = onRequest(
  {
    region: REGION,
    secrets: [stripeSecretKey, stripeWebhookSecret, resendApiKey],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      res.status(400).send('Missing Stripe signature');
      return;
    }

    try {
      const stripe = new Stripe(stripeSecretKey.value(), {
        apiVersion: '2023-10-16',
      });

      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );

      // Procesar el evento
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentSuccess(paymentIntent, stripeSecretKey.value(), resendApiKey.value());
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailure(paymentIntent);
          break;
        }
        default:
          console.log(`Evento no manejado: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);

/**
 * Trigger: Al crear un nuevo usuario
 * Envía email de bienvenida
 */
export const onUserCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    region: REGION,
    secrets: [resendApiKey],
  },
  async (event) => {
    const userData = event.data?.data();

    if (!userData) {
      console.error('No user data found');
      return;
    }

    const userEmail = userData.email;
    const userName = userData.displayName || '';

    if (!userEmail) {
      console.log('No email found for user, skipping welcome email');
      return;
    }

    try {
      const { subject, html } = welcomeEmail(userName);
      const result = await sendEmail(resendApiKey.value(), {
        to: userEmail,
        subject,
        html,
      });

      if (result.success) {
        console.log(`Welcome email sent to ${userEmail}`);
      } else {
        console.error(`Failed to send welcome email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
);

/**
 * Trigger: Al actualizar un pedido
 * Envía emails cuando cambia el estado
 */
export const onOrderStatusChanged = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: REGION,
    secrets: [resendApiKey],
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.error('Missing order data');
      return;
    }

    const previousStatus = beforeData.status;
    const newStatus = afterData.status;

    // Si el estado no cambió, no hacer nada
    if (previousStatus === newStatus) {
      return;
    }

    const userEmail = afterData.userEmail;
    const userName = afterData.userName || '';
    const orderNumber = afterData.orderNumber;

    if (!userEmail) {
      console.log('No email found for order, skipping notification');
      return;
    }

    try {
      let emailData: { subject: string; html: string } | null = null;

      switch (newStatus) {
        case 'shipped':
          emailData = orderShippedEmail(
            orderNumber,
            userName,
            afterData.trackingNumber,
            afterData.trackingUrl
          );
          break;

        case 'delivered':
          emailData = orderDeliveredEmail(orderNumber, userName);
          break;

        // No enviamos email para 'processing' ya que el usuario ya recibió confirmación
        // No enviamos email para 'cancelled' por ahora
      }

      if (emailData) {
        const result = await sendEmail(resendApiKey.value(), {
          to: userEmail,
          subject: emailData.subject,
          html: emailData.html,
        });

        if (result.success) {
          console.log(`Status change email (${newStatus}) sent to ${userEmail}`);
        } else {
          console.error(`Failed to send status email: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error sending status change email:', error);
    }
  }
);

/**
 * Función callable para enviar alerta de stock bajo
 * Puede ser llamada desde el admin panel
 */
export const sendLowStockAlert = onCall(
  {
    region: REGION,
    secrets: [resendApiKey],
  },
  async (request) => {
    // Verificar que el usuario es admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== 'admin' && userData.isAdmin !== true)) {
      throw new HttpsError('permission-denied', 'No tienes permisos de administrador');
    }

    // Obtener productos con bajo stock
    const productsSnap = await db.collection('products').get();
    const lowStockProducts = productsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p: any) => (p.stock || 0) < 5)
      .map((p: any) => ({ nombre: p.nombre, stock: p.stock || 0 }));

    if (lowStockProducts.length === 0) {
      return { success: true, message: 'No hay productos con bajo stock' };
    }

    try {
      const { subject, html } = lowStockAlertEmail(lowStockProducts);
      const result = await sendEmail(resendApiKey.value(), {
        to: ADMIN_EMAIL,
        subject,
        html,
      });

      if (result.success) {
        return { success: true, message: `Alerta enviada. ${lowStockProducts.length} productos con bajo stock.` };
      } else {
        throw new HttpsError('internal', `Error enviando alerta: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error sending low stock alert:', error);
      throw new HttpsError('internal', 'Error enviando alerta de stock');
    }
  }
);

/**
 * Manejar pago exitoso
 */
async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  stripeKey: string,
  emailApiKey: string
) {
  const { userId, addressId } = paymentIntent.metadata;

  if (!userId) {
    console.error('No userId in payment metadata');
    return;
  }

  const db = admin.firestore();

  try {
    // Obtener datos del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Obtener carrito del usuario
    const cartDoc = await db.collection('carts').doc(userId).get();
    const cartData = cartDoc.data();

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      console.error('No cart items found for user:', userId);
      return;
    }

    // Obtener dirección
    let shippingAddress: any = null;
    if (addressId) {
      const addressDoc = await db
        .collection('users')
        .doc(userId)
        .collection('addresses')
        .doc(addressId)
        .get();
      shippingAddress = addressDoc.data();
    }

    // Calcular totales usando funciones compartidas con tipado
    const items = cartData.items as CartItem[];
    const subtotal = calculateSubtotal(items);
    const tax = calculateTax(subtotal);
    const shippingCost = calculateShipping(subtotal);
    const total = calculateTotal(subtotal, shippingCost);

    // Generar número de pedido
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Crear pedido
    const orderRef = await db.collection('orders').add({
      orderNumber,
      userId,
      userEmail: userData?.email || '',
      userName: userData?.displayName || '',
      status: 'paid',
      paymentStatus: 'succeeded',
      stripePaymentIntentId: paymentIntent.id,
      shippingAddress: shippingAddress || {},
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.nombre,
        productImage: item.imagen,
        price: item.precio,
        quantity: item.cantidad,
        subtotal: item.precio * item.cantidad,
      })),
      subtotal,
      tax,
      shippingCost,
      total,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar el Payment Intent con el orderId
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        orderId: orderRef.id,
      },
    });

    // Limpiar carrito
    await db.collection('carts').doc(userId).delete();

    console.log(`Order ${orderRef.id} created successfully for user ${userId}`);

    // Enviar email de confirmación
    if (userData?.email && shippingAddress) {
      try {
        const orderItems = items.map((item: any) => ({
          productName: item.nombre,
          quantity: item.cantidad,
          price: item.precio,
          subtotal: item.precio * item.cantidad,
        }));

        const { subject, html } = orderConfirmationEmail(
          orderNumber,
          userData.displayName || '',
          orderItems,
          subtotal,
          tax,
          shippingCost,
          total,
          {
            nombre: shippingAddress.nombre,
            direccion: shippingAddress.direccion,
            ciudad: shippingAddress.ciudad,
            codigoPostal: shippingAddress.codigoPostal,
            provincia: shippingAddress.provincia,
          }
        );

        const result = await sendEmail(emailApiKey, {
          to: userData.email,
          subject,
          html,
        });

        if (result.success) {
          console.log(`Order confirmation email sent to ${userData.email}`);
        } else {
          console.error(`Failed to send order confirmation: ${result.error}`);
        }
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
        // No lanzamos error aquí para no afectar el flujo del pedido
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Manejar pago fallido
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { userId } = paymentIntent.metadata;

  console.log(`Payment failed for user ${userId}:`, paymentIntent.id);

  // Opcionalmente: enviar notificación al usuario
  // Opcionalmente: crear registro de intento fallido
}

/**
 * Health check endpoint
 */
export const healthCheck = onRequest(
  { region: REGION },
  (req, res) => {
    res.json({
      status: 'ok',
      message: 'Cloud Functions configuradas correctamente',
      timestamp: new Date().toISOString(),
    });
  }
);
