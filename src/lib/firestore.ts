/**
 * Helpers para acceder a Firestore
 *
 * En build time: carga datos para SSG
 * En runtime: queries dinámicas
 *
 * Si Firebase no está configurado, usa datos locales como fallback
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import type { Product, Category, Order, User, Address, StoreConfig, CartItem } from '../types';

// Importar datos locales como fallback
import productosLocales from '../data/productos.json';

// ============================================
// PRODUCTOS
// ============================================

export async function getProducts(options?: {
  categoria?: string;
  destacados?: boolean;
  activos?: boolean;
  limite?: number;
}): Promise<Product[]> {
  // Fallback a datos locales si Firebase no está configurado
  if (!isFirebaseConfigured()) {
    return getLocalProducts(options);
  }

  try {
    const db = getFirebaseDb();
    const constraints: QueryConstraint[] = [];

    // Por defecto solo productos activos y no eliminados
    if (options?.activos !== false) {
      constraints.push(where('activo', '==', true));
      constraints.push(where('deleted', '==', false));
    }

    if (options?.categoria) {
      constraints.push(where('categoria', '==', options.categoria));
    }

    if (options?.destacados) {
      constraints.push(where('destacado', '==', true));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    if (options?.limite) {
      constraints.push(limit(options.limite));
    }

    const q = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products from Firestore:', error);
    // Fallback a datos locales en caso de error
    return getLocalProducts(options);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isFirebaseConfigured()) {
    return getLocalProductBySlug(slug);
  }

  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'products'),
      where('slug', '==', slug),
      where('activo', '==', true),
      where('deleted', '==', false),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Product;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return getLocalProductBySlug(slug);
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  if (!isFirebaseConfigured()) {
    return null; // No tenemos IDs en datos locales
  }

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as Product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
}

// ============================================
// CATEGORÍAS
// ============================================

export async function getCategories(): Promise<Category[]> {
  if (!isFirebaseConfigured()) {
    return getLocalCategories();
  }

  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'categories'),
      where('activo', '==', true),
      orderBy('orden', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return getLocalCategories();
  }
}

// ============================================
// CONFIGURACIÓN
// ============================================

export async function getStoreConfig(): Promise<StoreConfig> {
  const defaultConfig: StoreConfig = {
    storeName: 'Mi Tienda 3D',
    contactEmail: 'contacto@mitienda3d.com',
    freeShippingThreshold: 50,
    shippingCost: 4.99,
    taxRate: 0.21,
  };

  if (!isFirebaseConfigured()) {
    return defaultConfig;
  }

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'config', 'settings');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return defaultConfig;
    }

    return { ...defaultConfig, ...docSnap.data() } as StoreConfig;
  } catch (error) {
    console.error('Error fetching store config:', error);
    return defaultConfig;
  }
}

// ============================================
// DATOS LOCALES (FALLBACK)
// ============================================

function getLocalProducts(options?: {
  categoria?: string;
  destacados?: boolean;
  limite?: number;
}): Product[] {
  let products = productosLocales.map((p) => ({
    id: p.slug, // Usar slug como ID temporal
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    descripcionCorta: p.descripcion.substring(0, 100) + '...',
    precio: parseFloat(p.precio),
    precioOferta: null,
    categoria: p.categoria,
    imagenes: [{ url: p.imagen, path: p.imagen, order: 0 }],
    imagenPrincipal: p.imagen,
    stock: 10, // Default
    sku: '',
    activo: true,
    destacado: p.destacado,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as Product[];

  if (options?.categoria) {
    products = products.filter((p) => p.categoria === options.categoria);
  }

  if (options?.destacados) {
    products = products.filter((p) => p.destacado);
  }

  if (options?.limite) {
    products = products.slice(0, options.limite);
  }

  return products;
}

function getLocalProductBySlug(slug: string): Product | null {
  const p = productosLocales.find((p) => p.slug === slug);

  if (!p) return null;

  return {
    id: p.slug,
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    descripcionCorta: p.descripcion.substring(0, 100) + '...',
    precio: parseFloat(p.precio),
    precioOferta: null,
    categoria: p.categoria,
    imagenes: [{ url: p.imagen, path: p.imagen, order: 0 }],
    imagenPrincipal: p.imagen,
    stock: 10,
    sku: '',
    activo: true,
    destacado: p.destacado,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function getLocalCategories(): Category[] {
  const categorias = [...new Set(productosLocales.map((p) => p.categoria))];

  return categorias.map((cat, index) => ({
    id: cat,
    nombre: cat.charAt(0).toUpperCase() + cat.slice(1),
    slug: cat,
    orden: index,
    activo: true,
  }));
}

// ============================================
// USUARIOS (solo Firestore)
// ============================================

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured()) return null;

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      uid,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as User;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<User>
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  const docRef = doc(db, 'users', uid);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// DIRECCIONES
// ============================================

export async function getUserAddresses(uid: string): Promise<Address[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'users', uid, 'addresses'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Address[];
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
}

export async function addUserAddress(
  uid: string,
  address: Omit<Address, 'id' | 'createdAt'>
): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');

  const db = getFirebaseDb();

  // Si es la primera dirección o marcada como default, desmarcar otras
  if (address.isDefault) {
    const existing = await getUserAddresses(uid);
    for (const addr of existing) {
      if (addr.isDefault) {
        await updateDoc(doc(db, 'users', uid, 'addresses', addr.id), {
          isDefault: false,
        });
      }
    }
  }

  const docRef = await addDoc(collection(db, 'users', uid, 'addresses'), {
    ...address,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateUserAddress(
  uid: string,
  addressId: string,
  data: Partial<Address>
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();

  // Si se marca como default, desmarcar otras
  if (data.isDefault) {
    const existing = await getUserAddresses(uid);
    for (const addr of existing) {
      if (addr.isDefault && addr.id !== addressId) {
        await updateDoc(doc(db, 'users', uid, 'addresses', addr.id), {
          isDefault: false,
        });
      }
    }
  }

  await updateDoc(doc(db, 'users', uid, 'addresses', addressId), data);
}

export async function deleteUserAddress(
  uid: string,
  addressId: string
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'users', uid, 'addresses', addressId));
}

// ============================================
// PEDIDOS
// ============================================

export async function getUserOrders(uid: string): Promise<Order[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      paidAt: doc.data().paidAt?.toDate() || null,
      shippedAt: doc.data().shippedAt?.toDate() || null,
      deliveredAt: doc.data().deliveredAt?.toDate() || null,
    })) as Order[];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (!isFirebaseConfigured()) return null;

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      paidAt: docSnap.data().paidAt?.toDate() || null,
      shippedAt: docSnap.data().shippedAt?.toDate() || null,
      deliveredAt: docSnap.data().deliveredAt?.toDate() || null,
    } as Order;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

// ============================================
// CARRITO
// ============================================

export async function getUserCart(uid: string): Promise<CartItem[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'carts', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return [];
    }

    const data = docSnap.data();
    return (data.items || []).map((item: any) => ({
      ...item,
      addedAt: item.addedAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching cart:', error);
    return [];
  }
}

export async function saveUserCart(uid: string, items: CartItem[]): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'carts', uid);

    await setDoc(docRef, {
      items: items.map(item => ({
        ...item,
        addedAt: item.addedAt instanceof Date ? item.addedAt : new Date(),
      })),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving cart:', error);
    throw error;
  }
}

export async function clearUserCart(uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'carts', uid);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}

// Función para combinar carritos (local + remoto)
export function mergeCartItems(localItems: CartItem[], remoteItems: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();

  // Primero agregar items remotos
  for (const item of remoteItems) {
    merged.set(item.productId, { ...item });
  }

  // Luego combinar con items locales (sumar cantidades si existe)
  for (const item of localItems) {
    const existing = merged.get(item.productId);
    if (existing) {
      merged.set(item.productId, {
        ...existing,
        cantidad: existing.cantidad + item.cantidad,
      });
    } else {
      merged.set(item.productId, { ...item });
    }
  }

  return Array.from(merged.values());
}
