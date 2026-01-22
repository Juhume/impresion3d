# Guía de Configuración y Pruebas

Esta guía te ayudará a configurar y probar todas las funcionalidades del ecommerce.

---

## 1. Configuración de Firebase

### Crear proyecto en Firebase Console

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita los servicios necesarios:

**Authentication:**
- Ve a Authentication > Sign-in method
- Habilita "Correo electrónico/contraseña"
- Habilita "Google" (opcional)

**Firestore:**
- Ve a Firestore Database > Crear base de datos
- Selecciona modo de producción o prueba
- Elige región `europe-west1`

**Storage:**
- Ve a Storage > Comenzar
- Selecciona región `europe-west1`

### Obtener credenciales del cliente

1. Ve a Configuración del proyecto (icono engranaje) > General
2. Baja hasta "Tus apps" > Añadir app > Web
3. Copia las credenciales

### Crear archivo .env

```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

Edita `.env` con tus credenciales de Firebase:

```env
# Firebase - Obtener de Firebase Console > Project Settings > Your apps
PUBLIC_FIREBASE_API_KEY=AIzaSy...
PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe - Usar claves de TEST (pk_test_...)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 2. Reglas de Firestore y Storage

Las reglas ya están creadas en:
- `firebase/firestore.rules` - Reglas de Firestore
- `firebase/storage.rules` - Reglas de Storage

Despliégalas con:

```bash
cd firebase
firebase deploy --only firestore:rules,storage
```

---

## 3. Configuración de Stripe

### Crear cuenta y obtener claves

1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Crea cuenta o inicia sesión
3. Asegúrate de estar en **modo Test** (toggle arriba a la derecha)
4. Ve a Developers > API keys
5. Copia:
   - **Publishable key** (pk_test_...) → va en `.env`
   - **Secret key** (sk_test_...) → va en Cloud Functions

### Configurar Webhook

1. Ve a Developers > Webhooks
2. Click "Add endpoint"
3. URL: `https://europe-west1-TU-PROYECTO.cloudfunctions.net/stripeWebhook`
4. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia el **Signing secret** (whsec_...)

---

## 4. Configuración de Resend (Emails)

1. Ve a [resend.com](https://resend.com)
2. Crea cuenta
3. Ve a API Keys > Create API Key
4. Copia la API key

> **Nota:** Para enviar emails reales necesitas verificar un dominio. En desarrollo, puedes enviar solo a tu propio email.

---

## 5. Desplegar Cloud Functions

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Login en Firebase
firebase login

# Ir al directorio firebase
cd firebase

# Inicializar proyecto (selecciona tu proyecto)
firebase use --add

# Configurar secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
# Pega: sk_test_...

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Pega: whsec_...

firebase functions:secrets:set RESEND_API_KEY
# Pega: re_...

# Desplegar reglas y funciones
firebase deploy
```

---

## 6. Crear usuario Admin

Para acceder al panel de admin, necesitas marcar un usuario como admin en Firestore:

1. Regístrate en la web normalmente
2. Ve a Firebase Console > Firestore
3. Encuentra tu documento en `users/{tu-uid}`
4. Añade el campo: `role: "admin"` o `isAdmin: true`

---

## 7. Migrar productos a Firestore

Los productos actualmente están en JSON local. Para migrarlos a Firestore:

1. Edita `scripts/migrateProducts.ts` y cambia `TU-PROJECT-ID` por tu project ID
2. Descarga una service account desde Firebase Console > Project Settings > Service accounts
3. Ejecuta:

```bash
# Instalar dependencias
pnpm add -D firebase-admin tsx

# Ejecutar migración
npx tsx scripts/migrateProducts.ts
```

**Alternativa manual:** Crea los productos desde el panel admin en `/admin/productos/nuevo/`

---

## 8. Probar en local

### Iniciar servidor de desarrollo

```bash
# En la raíz del proyecto
pnpm dev
```

Abre http://localhost:4321/impresion3d/

### Qué probar

#### 1. Catálogo y carrito (sin Firebase)
- Navega por productos
- Añade productos al carrito
- Modifica cantidades
- El carrito persiste al recargar (localStorage)

#### 2. Autenticación
- Regístrate con email/contraseña
- Verifica que puedes hacer login/logout
- Prueba "Olvidé mi contraseña"

#### 3. Perfil de usuario
- Ve a `/cuenta/`
- Edita tu perfil
- Añade direcciones en `/cuenta/direcciones/`

#### 4. Checkout (requiere Stripe configurado)
- Añade productos al carrito
- Ve a checkout
- Selecciona dirección
- Usa tarjeta de prueba: `4242 4242 4242 4242`
  - Fecha: cualquier fecha futura
  - CVC: cualquier 3 dígitos
- Verifica que llegue a la página de confirmación

#### 5. Panel Admin
- Ve a `/admin/`
- Si no eres admin, verás mensaje de error
- Marca tu usuario como admin en Firestore
- Recarga y verás el dashboard
- Prueba crear/editar productos
- Revisa la lista de pedidos

---

## 9. Tarjetas de prueba de Stripe

| Número | Resultado |
|--------|-----------|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 0002` | Tarjeta rechazada |
| `4000 0025 0000 3155` | Requiere autenticación 3DS |
| `4000 0000 0000 9995` | Fondos insuficientes |

Para todas las tarjetas:
- **Fecha:** Cualquier fecha futura (ej: 12/34)
- **CVC:** Cualquier 3 dígitos (ej: 123)
- **Código postal:** Cualquier código válido (ej: 28001)

---

## 10. Estructura de colecciones en Firestore

```
firestore/
├── products/           # Productos del catálogo
│   └── {productId}
│       ├── nombre
│       ├── slug
│       ├── descripcion
│       ├── precio
│       ├── precioOferta
│       ├── categoria
│       ├── stock
│       ├── activo
│       ├── imagenPrincipal
│       ├── imagenes[]
│       └── ...
│
├── categories/         # Categorías
│   └── {categoryId}
│       ├── nombre
│       ├── slug
│       ├── descripcion
│       ├── orden
│       └── activa
│
├── users/              # Perfiles de usuario
│   └── {userId}
│       ├── email
│       ├── displayName
│       ├── role           # "admin" para administradores
│       ├── createdAt
│       └── addresses/     # Subcolección
│           └── {addressId}
│               ├── nombre
│               ├── direccion
│               ├── ciudad
│               ├── codigoPostal
│               ├── provincia
│               ├── telefono
│               └── predeterminada
│
├── carts/              # Carritos (uno por usuario)
│   └── {userId}
│       ├── items[]
│       └── updatedAt
│
└── orders/             # Pedidos
    └── {orderId}
        ├── orderNumber
        ├── userId
        ├── userEmail
        ├── status          # paid, processing, shipped, delivered, cancelled
        ├── paymentStatus
        ├── shippingAddress
        ├── items[]
        ├── subtotal
        ├── tax
        ├── shippingCost
        ├── total
        ├── trackingNumber
        ├── createdAt
        └── ...
```

---

## 11. Desplegar frontend en GitHub Pages

```bash
# Build
pnpm build

# El workflow de GitHub Actions ya está configurado
# Solo haz push a main
git add .
git commit -m "Deploy ecommerce completo"
git push
```

El sitio se desplegará automáticamente en: `https://tu-usuario.github.io/impresion3d/`

---

## 12. Resumen de URLs

### Frontend (Tienda)

| Página | URL |
|--------|-----|
| Inicio | `/impresion3d/` |
| Catálogo | `/impresion3d/catalogo/` |
| Producto | `/impresion3d/producto/{slug}/` |
| Login | `/impresion3d/auth/login/` |
| Registro | `/impresion3d/auth/registro/` |
| Recuperar contraseña | `/impresion3d/auth/recuperar/` |
| Mi cuenta | `/impresion3d/cuenta/` |
| Mis direcciones | `/impresion3d/cuenta/direcciones/` |
| Mis pedidos | `/impresion3d/cuenta/pedidos/` |
| Checkout | `/impresion3d/checkout/` |
| Confirmación | `/impresion3d/checkout/confirmacion/` |

### Panel de Administración

| Página | URL |
|--------|-----|
| Dashboard | `/impresion3d/admin/` |
| Productos | `/impresion3d/admin/productos/` |
| Nuevo producto | `/impresion3d/admin/productos/nuevo/` |
| Editar producto | `/impresion3d/admin/productos/editar/?id={id}` |
| Pedidos | `/impresion3d/admin/pedidos/` |
| Categorías | `/impresion3d/admin/categorias/` |

### Cloud Functions

| Función | Tipo | Descripción |
|---------|------|-------------|
| `createPaymentIntent` | Callable | Crear Payment Intent de Stripe |
| `checkPaymentStatus` | Callable | Verificar estado de un pago |
| `stripeWebhook` | HTTP | Webhook para eventos de Stripe |
| `onUserCreated` | Trigger | Email de bienvenida al registrarse |
| `onOrderStatusChanged` | Trigger | Emails al cambiar estado del pedido |
| `sendLowStockAlert` | Callable | Enviar alerta de stock bajo |
| `healthCheck` | HTTP | Verificar que las functions están activas |

---

## 13. Emails transaccionales

El sistema envía emails automáticamente en estos eventos:

| Evento | Email |
|--------|-------|
| Usuario se registra | Bienvenida |
| Pago completado | Confirmación de pedido |
| Pedido enviado | Notificación con tracking |
| Pedido entregado | Confirmación de entrega |

También hay una función manual para enviar alertas de stock bajo al administrador.

---

## 14. Troubleshooting

### "Firebase no está configurado"
- Verifica que tienes el archivo `.env` con las variables correctas
- Asegúrate de reiniciar el servidor de desarrollo después de crear/modificar `.env`

### No puedo acceder al admin
- Verifica en Firestore que tu usuario tiene `role: "admin"` o `isAdmin: true`
- Asegúrate de estar logueado

### El pago no se procesa
- Verifica que las Cloud Functions están desplegadas
- Revisa los logs en Firebase Console > Functions > Logs
- Asegúrate de que los secrets están configurados

### No recibo emails
- En modo desarrollo, Resend solo permite enviar a tu propio email
- Verifica el API key de Resend
- Revisa los logs de las Cloud Functions

### El carrito no se sincroniza
- Verifica que estás logueado
- Revisa la consola del navegador para errores
- Verifica las reglas de Firestore

---

## 15. Comandos útiles

```bash
# Desarrollo
pnpm dev                    # Iniciar servidor de desarrollo
pnpm build                  # Build para producción
pnpm preview                # Preview del build

# Firebase
cd firebase
firebase deploy             # Desplegar todo
firebase deploy --only functions  # Solo functions
firebase deploy --only firestore  # Solo reglas de Firestore
firebase functions:log      # Ver logs de functions

# Cloud Functions
cd firebase/functions
npm run build              # Compilar TypeScript
npm run deploy             # Desplegar functions
```

---

¿Dudas? Revisa los logs en la consola del navegador (F12) y en Firebase Console.
