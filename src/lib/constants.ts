/**
 * Constantes compartidas de la aplicación
 * Single source of truth para valores que se usan en múltiples lugares
 */

// Configuración fiscal
export const TAX_RATE = 0.21; // 21% IVA español

// Configuración de envío
export const FREE_SHIPPING_THRESHOLD = 50; // Envío gratis a partir de 50€
export const DEFAULT_SHIPPING_COST = 4.99;

// Configuración de la tienda
export const STORE_NAME = 'Mi Tienda 3D';
export const STORE_EMAIL = 'contacto@mitienda3d.com';
export const CURRENCY = 'EUR';
export const LOCALE = 'es-ES';

// Límites
export const MAX_CART_ITEM_QUANTITY = 99;
export const MIN_CART_ITEM_QUANTITY = 1;

// Debounce delays (ms)
export const CART_SAVE_DEBOUNCE_MS = 500;
export const SEARCH_DEBOUNCE_MS = 300;

// Helpers de cálculo
export function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE;
}

export function calculateShipping(subtotal: number, threshold = FREE_SHIPPING_THRESHOLD, cost = DEFAULT_SHIPPING_COST): number {
  return subtotal >= threshold ? 0 : cost;
}

export function calculateTotal(subtotal: number, shippingCost: number): number {
  const tax = calculateTax(subtotal);
  return subtotal + tax + shippingCost;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
  }).format(price);
}
