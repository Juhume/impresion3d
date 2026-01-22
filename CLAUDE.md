# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Astro + React)
pnpm dev       # Start dev server at localhost:4321
pnpm build     # Build production site to ./dist/
pnpm preview   # Preview production build locally

# Cloud Functions (Firebase)
cd firebase/functions && npm install    # Install function dependencies
cd firebase/functions && npm run build  # Compile TypeScript
firebase emulators:start                # Run local Firebase emulators
firebase deploy --only functions        # Deploy functions to Firebase
```

## Deployment

- **Frontend**: GitHub Pages (SSG) - deploys automatically on push to `main`
- **Backend**: Firebase Cloud Functions - deploy manually with `firebase deploy`

The site is configured with:
- Base URL: `/impresion3d`
- Site: `https://juhume.github.io`

All internal links must use `import.meta.env.BASE_URL` prefix.

## Architecture

Astro static site with React islands for interactivity, Firebase backend.

```
Frontend (GitHub Pages)     Backend (Firebase)
├── Astro SSG pages         ├── Cloud Functions
├── React islands           ├── Firestore
└── Firebase client SDK     ├── Auth
                            └── Storage
```

**Stack:**
- Frontend: Astro 5 + React 19 + Zustand (state)
- Backend: Firebase (Auth, Firestore, Functions, Storage)
- Payments: Stripe Payment Element
- Emails: Resend

## Key Directories

```
src/
├── components/
│   ├── *.astro           # Static Astro components
│   └── react/            # React islands (interactive)
│       └── ui/           # Reusable UI components (Spinner, Toast)
├── hooks/                # Custom React hooks (useFocusTrap)
├── lib/
│   ├── firebase.ts       # Firebase client config
│   ├── stripe.ts         # Stripe client config
│   ├── constants.ts      # Shared constants (TAX_RATE, etc.)
│   └── utils.ts          # Utility functions (debounce, etc.)
├── stores/               # Zustand stores (cart, auth)
├── styles/
│   └── components/       # CSS modules for React components
├── types/                # TypeScript types
└── pages/                # Astro pages (SSG)

firebase/
└── functions/src/
    ├── types/            # Shared types with frontend
    └── email/            # Email templates
```

## Environment Variables

Copy `.env.example` to `.env` and fill with your Firebase/Stripe keys.

Client-side variables use `PUBLIC_` prefix (exposed to browser):
- `PUBLIC_FIREBASE_*` - Firebase client config
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

Server-side variables (Cloud Functions only, in Firebase config):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`

## React Islands Pattern

React components in `src/components/react/` are used as islands in Astro pages:

```astro
---
import CartButton from '../components/react/CartButton';
---
<CartButton client:load />
```

Directives:
- `client:load` - Load immediately (for above-fold interactive elements)
- `client:idle` - Load when browser is idle
- `client:visible` - Load when visible in viewport

## Data Flow

1. **Products**: Firestore → build time → static pages (SSG)
2. **Cart**: Zustand store → localStorage (guest) / Firestore (logged in)
3. **Auth**: Firebase Auth → authStore → React components
4. **Payments**: Stripe Payment Element → Cloud Function → Webhook

## Security Rules

- `firestore.rules` - Firestore access control
- `storage.rules` - Firebase Storage access control

Key patterns:
- Public read for active products/categories
- User-specific access for carts, addresses, orders
- Admin-only write for products, orders management
- **Payment validation**: Cloud Functions validate cart amount before processing

## UI Components

Reusable components in `src/components/react/ui/`:

```tsx
// Toast notifications
import { useToast } from './ui/Toast';
const toast = useToast();
toast.success('Producto añadido');
toast.error('Error al procesar');

// Loading spinner
import { Spinner, SpinnerWithText } from './ui/Spinner';
<Spinner size="md" color="primary" />
<SpinnerWithText text="Cargando..." />
```

## Hooks

Custom hooks in `src/hooks/`:

```tsx
// Focus trap for modals/drawers (accessibility)
import { useFocusTrap } from '../hooks/useFocusTrap';
const containerRef = useFocusTrap({
  isActive: isOpen,
  onEscape: handleClose,
});
```

## Constants

All shared constants in `src/lib/constants.ts`:
- `TAX_RATE` - 21% IVA
- `FREE_SHIPPING_THRESHOLD` - 50€
- `CART_SAVE_DEBOUNCE_MS` - 500ms
- Helper functions: `formatPrice()`, `calculateTax()`, etc.

## Development

```bash
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint issues
pnpm type-check    # TypeScript check
pnpm format        # Format with Prettier
```
