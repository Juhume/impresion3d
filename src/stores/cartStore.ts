import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '../types';
import { getUserCart, saveUserCart, clearUserCart, mergeCartItems } from '../lib/firestore';
import { TAX_RATE, CART_SAVE_DEBOUNCE_MS, MAX_CART_ITEM_QUANTITY } from '../lib/constants';
import { debounce } from '../lib/utils';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isSyncing: boolean;
  currentUserId: string | null;

  // Actions
  addItem: (item: Omit<CartItem, 'addedAt'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, cantidad: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Sync actions
  syncWithFirestore: (userId: string) => Promise<void>;
  saveToFirestore: () => Promise<void>;
  saveToFirestoreImmediate: () => Promise<void>;
  disconnectUser: () => void;

  // Computed (getters)
  getItemCount: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

// Función debounced para guardar en Firestore (evita writes excesivos)
let debouncedSave: ReturnType<typeof debounce> | null = null;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isSyncing: false,
      currentUserId: null,

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId
          );

          let newItems: CartItem[];

          if (existingIndex >= 0) {
            // Producto ya existe, aumentar cantidad (con límite máximo)
            newItems = [...state.items];
            const newQuantity = Math.min(
              newItems[existingIndex].cantidad + item.cantidad,
              MAX_CART_ITEM_QUANTITY
            );
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              cantidad: newQuantity,
            };
          } else {
            // Producto nuevo
            newItems = [
              ...state.items,
              { ...item, cantidad: Math.min(item.cantidad, MAX_CART_ITEM_QUANTITY), addedAt: new Date() },
            ];
          }

          return { items: newItems, isOpen: true };
        });

        // Guardar en Firestore si el usuario está logueado (debounced)
        const { currentUserId } = get();
        if (currentUserId) {
          get().saveToFirestore();
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));

        // Guardar en Firestore si el usuario está logueado
        const { currentUserId } = get();
        if (currentUserId) {
          get().saveToFirestore();
        }
      },

      updateQuantity: (productId, cantidad) => {
        if (cantidad <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, cantidad } : item
          ),
        }));

        // Guardar en Firestore si el usuario está logueado
        const { currentUserId } = get();
        if (currentUserId) {
          get().saveToFirestore();
        }
      },

      clearCart: () => {
        const { currentUserId } = get();
        set({ items: [] });

        // Limpiar en Firestore si el usuario está logueado
        if (currentUserId) {
          clearUserCart(currentUserId).catch(console.error);
        }
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Sincronizar carrito al hacer login
      syncWithFirestore: async (userId: string) => {
        set({ isSyncing: true, currentUserId: userId });

        try {
          const localItems = get().items;
          const remoteItems = await getUserCart(userId);

          // Si hay items locales y remotos, combinarlos
          if (localItems.length > 0 && remoteItems.length > 0) {
            const mergedItems = mergeCartItems(localItems, remoteItems);
            set({ items: mergedItems });
            // Guardar el carrito combinado
            await saveUserCart(userId, mergedItems);
          } else if (localItems.length > 0) {
            // Solo items locales, guardarlos en Firestore
            await saveUserCart(userId, localItems);
          } else if (remoteItems.length > 0) {
            // Solo items remotos, cargarlos
            set({ items: remoteItems });
          }
          // Si ambos están vacíos, no hacer nada
        } catch (error) {
          console.error('Error syncing cart with Firestore:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Guardar carrito inmediatamente (sin debounce)
      saveToFirestoreImmediate: async () => {
        const { currentUserId, items } = get();
        if (!currentUserId) return;

        try {
          await saveUserCart(currentUserId, items);
        } catch (error) {
          console.error('Error saving cart to Firestore:', error);
        }
      },

      // Guardar carrito actual en Firestore (con debounce para evitar writes excesivos)
      saveToFirestore: async () => {
        const { currentUserId, items } = get();
        if (!currentUserId) return;

        // Crear debounced function si no existe
        if (!debouncedSave) {
          debouncedSave = debounce(async () => {
            const { currentUserId: userId, items: currentItems } = get();
            if (!userId) return;
            try {
              await saveUserCart(userId, currentItems);
            } catch (error) {
              console.error('Error saving cart to Firestore:', error);
            }
          }, CART_SAVE_DEBOUNCE_MS);
        }

        debouncedSave();
      },

      // Desconectar usuario (logout)
      disconnectUser: () => {
        set({ currentUserId: null });
        // El carrito local se mantiene, no se borra
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0
        );
      },

      getTax: () => {
        return get().getSubtotal() * TAX_RATE;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = subtotal * TAX_RATE;
        return subtotal + tax;
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        currentUserId: state.currentUserId,
      }),
    }
  )
);

// Hook para usar fuera de React (ej: en Astro)
export const cartStore = useCartStore;
