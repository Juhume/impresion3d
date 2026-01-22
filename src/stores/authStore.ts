import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '../lib/firebase';
import type { User as UserProfile } from '../types';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  clearError: () => void;

  // Computed
  isAuthenticated: () => boolean;
  isEmailVerified: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: () => {
    if (!isFirebaseConfigured()) {
      set({ isInitialized: true, isLoading: false });
      return () => {};
    }

    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obtener perfil de usuario de Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            set({
              user,
              userProfile: { uid: user.uid, ...userDoc.data() } as UserProfile,
              isInitialized: true,
              isLoading: false,
            });

            // Sincronizar carrito con Firestore
            useCartStore.getState().syncWithFirestore(user.uid);
          } else {
            // Crear perfil si no existe (nuevo usuario de Google)
            const newProfile: Omit<UserProfile, 'uid'> = {
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              role: 'user',
              emailVerified: user.emailVerified,
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
            };

            await setDoc(doc(db, 'users', user.uid), {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            set({
              user,
              userProfile: { uid: user.uid, ...newProfile } as UserProfile,
              isInitialized: true,
              isLoading: false,
            });

            // Sincronizar carrito con Firestore (usuario nuevo)
            useCartStore.getState().syncWithFirestore(user.uid);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          set({
            user,
            userProfile: null,
            isInitialized: true,
            isLoading: false,
          });
        }
      } else {
        // Usuario deslogueado - desconectar carrito
        useCartStore.getState().disconnectUser();

        set({
          user: null,
          userProfile: null,
          isInitialized: true,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },

  loginWithEmail: async (email, password) => {
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase no está configurado' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  registerWithEmail: async (email, password, displayName) => {
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase no está configurado' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();

      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Crear perfil en Firestore
      const newProfile = {
        email: user.email || '',
        displayName,
        role: 'user',
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deleted: false,
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);

      // Enviar email de verificación
      await sendEmailVerification(user);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  loginWithGoogle: async () => {
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase no está configurado' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    if (!isFirebaseConfigured()) return;

    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  },

  resetPassword: async (email) => {
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase no está configurado' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  resendVerificationEmail: async () => {
    const { user } = get();
    if (!user) return;

    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
    }
  },

  clearError: () => set({ error: null }),

  isAuthenticated: () => get().user !== null,
  isEmailVerified: () => get().user?.emailVerified ?? false,
  isAdmin: () => get().userProfile?.role === 'admin',
}));

// Helper para traducir errores de Firebase
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'Email no válido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Inténtalo más tarde',
    'auth/popup-closed-by-user': 'Ventana cerrada. Inténtalo de nuevo',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
  };

  return messages[code] || 'Ha ocurrido un error. Inténtalo de nuevo';
}
