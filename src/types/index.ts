// Tipos compartidos para el ecommerce

export interface Product {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  descripcionCorta?: string;
  precio: number;
  precioOferta?: number | null;
  categoria: string;
  categoriaRef?: string;
  imagenes: ProductImage[];
  imagenPrincipal: string;
  stock: number;
  sku?: string;
  activo: boolean;
  destacado: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  url: string;
  path: string;
  order: number;
}

export interface Category {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}

export interface Address {
  id: string;
  alias: string;
  calle: string;
  numero: string;
  piso?: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  slug: string;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  imagen: string;
  addedAt: Date;
}

export interface Cart {
  items: CartItem[];
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string;
  shippingAddress: Address;
  shippingCost: number;
  subtotal: number;
  tax: number;
  total: number;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface StoreConfig {
  storeName: string;
  contactEmail: string;
  freeShippingThreshold: number;
  shippingCost: number;
  taxRate: number;
}

// Re-exportar constantes y helpers desde el módulo centralizado
// para mantener compatibilidad con código existente
export {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_COST,
  calculateTax,
  calculateShipping,
  calculateTotal,
  formatPrice,
} from '../lib/constants';

// Helper adicional para calcular subtotal del carrito
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}
