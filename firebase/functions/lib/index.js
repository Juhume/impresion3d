"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.sendLowStockAlert = exports.onOrderStatusChanged = exports.onUserCreated = exports.stripeWebhook = exports.checkPaymentStatus = exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const sendEmail_1 = require("./email/sendEmail");
const templates_1 = require("./email/templates");
// Inicializar Firebase Admin
admin.initializeApp();
// Secrets (configurar con firebase functions:secrets:set)
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
const resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
// Región para Cloud Functions
const REGION = 'europe-west1';
// Email del administrador para alertas
const ADMIN_EMAIL = 'admin@impresion3d.com';
/**
 * Crear un Payment Intent de Stripe
 * Callable function que recibe amount, currency y metadata
 */
exports.createPaymentIntent = (0, https_1.onCall)({
    region: REGION,
    secrets: [stripeSecretKey],
}, async (request) => {
    // Verificar autenticación
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const { amount, currency, metadata } = request.data;
    // Validaciones
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Cantidad inválida');
    }
    if (!currency) {
        throw new https_1.HttpsError('invalid-argument', 'Moneda no especificada');
    }
    try {
        const stripe = new stripe_1.default(stripeSecretKey.value(), {
            apiVersion: '2023-10-16',
        });
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata: {
                ...metadata,
                userId: request.auth.uid,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
        };
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        throw new https_1.HttpsError('internal', 'Error al crear el pago');
    }
});
/**
 * Verificar estado de un pago
 */
exports.checkPaymentStatus = (0, https_1.onCall)({
    region: REGION,
    secrets: [stripeSecretKey],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const { paymentIntentId } = request.data;
    if (!paymentIntentId) {
        throw new https_1.HttpsError('invalid-argument', 'Payment Intent ID requerido');
    }
    try {
        const stripe = new stripe_1.default(stripeSecretKey.value(), {
            apiVersion: '2023-10-16',
        });
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        // Verificar que el pago pertenece al usuario
        if (paymentIntent.metadata.userId !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'No autorizado');
        }
        return {
            status: paymentIntent.status,
            orderId: paymentIntent.metadata.orderId,
        };
    }
    catch (error) {
        console.error('Error checking payment status:', error);
        throw new https_1.HttpsError('internal', 'Error al verificar el pago');
    }
});
/**
 * Webhook de Stripe para procesar eventos
 * HTTP function (no callable)
 */
exports.stripeWebhook = (0, https_2.onRequest)({
    region: REGION,
    secrets: [stripeSecretKey, stripeWebhookSecret, resendApiKey],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Missing Stripe signature');
        return;
    }
    try {
        const stripe = new stripe_1.default(stripeSecretKey.value(), {
            apiVersion: '2023-10-16',
        });
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
        // Procesar el evento
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                await handlePaymentSuccess(paymentIntent, stripeSecretKey.value(), resendApiKey.value());
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                await handlePaymentFailure(paymentIntent);
                break;
            }
            default:
                console.log(`Evento no manejado: ${event.type}`);
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
/**
 * Trigger: Al crear un nuevo usuario
 * Envía email de bienvenida
 */
exports.onUserCreated = (0, firestore_1.onDocumentCreated)({
    document: 'users/{userId}',
    region: REGION,
    secrets: [resendApiKey],
}, async (event) => {
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
        const { subject, html } = (0, templates_1.welcomeEmail)(userName);
        const result = await (0, sendEmail_1.sendEmail)(resendApiKey.value(), {
            to: userEmail,
            subject,
            html,
        });
        if (result.success) {
            console.log(`Welcome email sent to ${userEmail}`);
        }
        else {
            console.error(`Failed to send welcome email: ${result.error}`);
        }
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
    }
});
/**
 * Trigger: Al actualizar un pedido
 * Envía emails cuando cambia el estado
 */
exports.onOrderStatusChanged = (0, firestore_1.onDocumentUpdated)({
    document: 'orders/{orderId}',
    region: REGION,
    secrets: [resendApiKey],
}, async (event) => {
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
        let emailData = null;
        switch (newStatus) {
            case 'shipped':
                emailData = (0, templates_1.orderShippedEmail)(orderNumber, userName, afterData.trackingNumber, afterData.trackingUrl);
                break;
            case 'delivered':
                emailData = (0, templates_1.orderDeliveredEmail)(orderNumber, userName);
                break;
            // No enviamos email para 'processing' ya que el usuario ya recibió confirmación
            // No enviamos email para 'cancelled' por ahora
        }
        if (emailData) {
            const result = await (0, sendEmail_1.sendEmail)(resendApiKey.value(), {
                to: userEmail,
                subject: emailData.subject,
                html: emailData.html,
            });
            if (result.success) {
                console.log(`Status change email (${newStatus}) sent to ${userEmail}`);
            }
            else {
                console.error(`Failed to send status email: ${result.error}`);
            }
        }
    }
    catch (error) {
        console.error('Error sending status change email:', error);
    }
});
/**
 * Función callable para enviar alerta de stock bajo
 * Puede ser llamada desde el admin panel
 */
exports.sendLowStockAlert = (0, https_1.onCall)({
    region: REGION,
    secrets: [resendApiKey],
}, async (request) => {
    // Verificar que el usuario es admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || (userData.role !== 'admin' && userData.isAdmin !== true)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permisos de administrador');
    }
    // Obtener productos con bajo stock
    const productsSnap = await db.collection('products').get();
    const lowStockProducts = productsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => (p.stock || 0) < 5)
        .map((p) => ({ nombre: p.nombre, stock: p.stock || 0 }));
    if (lowStockProducts.length === 0) {
        return { success: true, message: 'No hay productos con bajo stock' };
    }
    try {
        const { subject, html } = (0, templates_1.lowStockAlertEmail)(lowStockProducts);
        const result = await (0, sendEmail_1.sendEmail)(resendApiKey.value(), {
            to: ADMIN_EMAIL,
            subject,
            html,
        });
        if (result.success) {
            return { success: true, message: `Alerta enviada. ${lowStockProducts.length} productos con bajo stock.` };
        }
        else {
            throw new https_1.HttpsError('internal', `Error enviando alerta: ${result.error}`);
        }
    }
    catch (error) {
        console.error('Error sending low stock alert:', error);
        throw new https_1.HttpsError('internal', 'Error enviando alerta de stock');
    }
});
/**
 * Manejar pago exitoso
 */
async function handlePaymentSuccess(paymentIntent, stripeKey, emailApiKey) {
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
        let shippingAddress = null;
        if (addressId) {
            const addressDoc = await db
                .collection('users')
                .doc(userId)
                .collection('addresses')
                .doc(addressId)
                .get();
            shippingAddress = addressDoc.data();
        }
        // Calcular totales
        const items = cartData.items;
        const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        const tax = subtotal * 0.21;
        const shippingCost = subtotal >= 50 ? 0 : 4.99;
        const total = subtotal + tax + shippingCost;
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
            items: items.map((item) => ({
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
        const stripe = new stripe_1.default(stripeKey, {
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
                const orderItems = items.map((item) => ({
                    productName: item.nombre,
                    quantity: item.cantidad,
                    price: item.precio,
                    subtotal: item.precio * item.cantidad,
                }));
                const { subject, html } = (0, templates_1.orderConfirmationEmail)(orderNumber, userData.displayName || '', orderItems, subtotal, tax, shippingCost, total, {
                    nombre: shippingAddress.nombre,
                    direccion: shippingAddress.direccion,
                    ciudad: shippingAddress.ciudad,
                    codigoPostal: shippingAddress.codigoPostal,
                    provincia: shippingAddress.provincia,
                });
                const result = await (0, sendEmail_1.sendEmail)(emailApiKey, {
                    to: userData.email,
                    subject,
                    html,
                });
                if (result.success) {
                    console.log(`Order confirmation email sent to ${userData.email}`);
                }
                else {
                    console.error(`Failed to send order confirmation: ${result.error}`);
                }
            }
            catch (emailError) {
                console.error('Error sending order confirmation email:', emailError);
                // No lanzamos error aquí para no afectar el flujo del pedido
            }
        }
    }
    catch (error) {
        console.error('Error handling payment success:', error);
        throw error;
    }
}
/**
 * Manejar pago fallido
 */
async function handlePaymentFailure(paymentIntent) {
    const { userId } = paymentIntent.metadata;
    console.log(`Payment failed for user ${userId}:`, paymentIntent.id);
    // Opcionalmente: enviar notificación al usuario
    // Opcionalmente: crear registro de intento fallido
}
/**
 * Health check endpoint
 */
exports.healthCheck = (0, https_2.onRequest)({ region: REGION }, (req, res) => {
    res.json({
        status: 'ok',
        message: 'Cloud Functions configuradas correctamente',
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=index.js.map