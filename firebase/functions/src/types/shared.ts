/**
 * Tipos compartidos entre frontend y Cloud Functions
 * Estos tipos deben mantenerse sincronizados con src/types/index.ts
 */

// Constantes compartidas
export const TAX_RATE = 0.21; // 21% IVA español
export const FREE_SHIPPING_THRESHOLD = 50;
export const DEFAULT_SHIPPING_COST = 4.99;

export interface CartItem {
  productId: string;
  slug: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
  addedAt: Date | FirebaseFirestore.Timestamp;
}

export interface Address {
  id?: string;
  alias: string;
  nombre?: string;
  calle: string;
  numero: string;
  piso?: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono?: string;
  direccion?: string; // Campo legacy
  isDefault: boolean;
  createdAt?: Date | FirebaseFirestore.Timestamp;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface Order {
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string;
  shippingAddress: Partial<Address>;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  shippedAt?: FirebaseFirestore.Timestamp;
  deliveredAt?: FirebaseFirestore.Timestamp;
}

// Helpers de cálculo
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE;
}

export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
}

export function calculateTotal(subtotal: number, shipping: number): number {
  const tax = calculateTax(subtotal);
  return subtotal + tax + shipping;
}

// Tolerancia para comparación de montos (1 céntimo)
export const AMOUNT_TOLERANCE_CENTS = 1;

/**
 * Valida que el monto proporcionado coincida con el carrito
 * @param providedAmount Monto en céntimos proporcionado por el cliente
 * @param cartItems Items del carrito desde Firestore
 * @returns true si el monto es válido
 */
export function validatePaymentAmount(providedAmount: number, cartItems: CartItem[]): boolean {
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping(subtotal);
  const expectedTotal = calculateTotal(subtotal, shipping);
  const expectedAmountCents = Math.round(expectedTotal * 100);

  // Permitir pequeña tolerancia por redondeos
  return Math.abs(providedAmount - expectedAmountCents) <= AMOUNT_TOLERANCE_CENTS;
}
