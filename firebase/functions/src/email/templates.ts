/**
 * Email templates para el ecommerce
 */

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ShippingAddress {
  nombre: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  provincia: string;
}

// Estilos base compartidos
const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #111827;
    margin: 0;
    padding: 0;
    background-color: #f3f4f6;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  .card {
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .header {
    text-align: center;
    margin-bottom: 32px;
  }
  .logo {
    font-size: 24px;
    font-weight: 700;
    color: #2563eb;
    text-decoration: none;
  }
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 16px 0;
  }
  p {
    color: #6b7280;
    margin: 0 0 16px 0;
  }
  .btn {
    display: inline-block;
    padding: 14px 28px;
    background: #2563eb;
    color: white !important;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 16px 0;
  }
  .footer {
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    font-size: 14px;
    color: #9ca3af;
  }
`;

/**
 * Email de bienvenida para nuevos usuarios
 */
export function welcomeEmail(userName: string): { subject: string; html: string } {
  const subject = '¡Bienvenido/a a Impresión 3D!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <a href="https://juliopc.github.io/impresion3d/" class="logo">🖨️ Impresión 3D</a>
          </div>

          <h1>¡Hola${userName ? ` ${userName}` : ''}!</h1>
          <p>
            Gracias por registrarte en nuestra tienda. Estamos encantados de tenerte con nosotros.
          </p>
          <p>
            Ahora puedes explorar nuestro catálogo de productos impresos en 3D,
            guardar tus favoritos y realizar compras de forma rápida y segura.
          </p>

          <center>
            <a href="https://juliopc.github.io/impresion3d/catalogo/" class="btn">
              Ver catálogo
            </a>
          </center>

          <p>
            Si tienes alguna pregunta, no dudes en contactarnos por WhatsApp.
          </p>

          <div class="footer">
            <p>© 2024 Impresión 3D. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email de confirmación de pedido
 */
export function orderConfirmationEmail(
  orderNumber: string,
  userName: string,
  items: OrderItem[],
  subtotal: number,
  tax: number,
  shippingCost: number,
  total: number,
  shippingAddress: ShippingAddress
): { subject: string; html: string } {
  const subject = `Pedido ${orderNumber} confirmado - Impresión 3D`;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.productName}</strong><br>
        <span style="color: #6b7280;">Cantidad: ${item.quantity}</span>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${item.subtotal.toFixed(2)}€
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${baseStyles}
        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
        }
        .totals-row td {
          padding: 8px 0;
        }
        .grand-total td {
          font-weight: 700;
          font-size: 18px;
          padding-top: 16px;
          border-top: 2px solid #e5e7eb;
        }
        .address-box {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #dcfce7;
          color: #16a34a;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <a href="https://juliopc.github.io/impresion3d/" class="logo">🖨️ Impresión 3D</a>
          </div>

          <center>
            <span class="status-badge">✓ Pedido confirmado</span>
          </center>

          <h1 style="text-align: center; margin-top: 24px;">¡Gracias por tu pedido!</h1>

          <p style="text-align: center;">
            Hola ${userName}, hemos recibido tu pedido y estamos preparándolo.
          </p>

          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="color: #6b7280; font-size: 14px;">Número de pedido</span><br>
            <strong style="font-size: 20px; color: #2563eb;">${orderNumber}</strong>
          </div>

          <h2 style="font-size: 18px; margin-bottom: 16px;">Resumen del pedido</h2>

          <table class="order-table">
            <tbody>
              ${itemsHtml}
              <tr class="totals-row">
                <td>Subtotal</td>
                <td style="text-align: right;">${subtotal.toFixed(2)}€</td>
              </tr>
              <tr class="totals-row">
                <td>IVA (21%)</td>
                <td style="text-align: right;">${tax.toFixed(2)}€</td>
              </tr>
              <tr class="totals-row">
                <td>Envío</td>
                <td style="text-align: right;">${shippingCost === 0 ? 'Gratis' : `${shippingCost.toFixed(2)}€`}</td>
              </tr>
              <tr class="grand-total">
                <td>Total</td>
                <td style="text-align: right;">${total.toFixed(2)}€</td>
              </tr>
            </tbody>
          </table>

          <h2 style="font-size: 18px; margin-bottom: 16px;">Dirección de envío</h2>
          <div class="address-box">
            <strong>${shippingAddress.nombre}</strong><br>
            ${shippingAddress.direccion}<br>
            ${shippingAddress.codigoPostal} ${shippingAddress.ciudad}<br>
            ${shippingAddress.provincia}
          </div>

          <center>
            <a href="https://juliopc.github.io/impresion3d/cuenta/pedidos/" class="btn">
              Ver mis pedidos
            </a>
          </center>

          <p style="text-align: center; font-size: 14px;">
            ¿Tienes alguna pregunta? <a href="https://wa.me/34693846562" style="color: #2563eb;">Contáctanos por WhatsApp</a>
          </p>

          <div class="footer">
            <p>© 2024 Impresión 3D. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email de pedido enviado
 */
export function orderShippedEmail(
  orderNumber: string,
  userName: string,
  trackingNumber?: string,
  trackingUrl?: string
): { subject: string; html: string } {
  const subject = `Tu pedido ${orderNumber} ha sido enviado - Impresión 3D`;

  const trackingHtml = trackingNumber
    ? `
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="color: #6b7280; font-size: 14px;">Número de seguimiento</span><br>
        <strong style="font-size: 18px; color: #2563eb;">${trackingNumber}</strong>
        ${trackingUrl ? `<br><a href="${trackingUrl}" style="color: #2563eb; font-size: 14px;">Seguir envío →</a>` : ''}
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${baseStyles}
        .shipped-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <a href="https://juliopc.github.io/impresion3d/" class="logo">🖨️ Impresión 3D</a>
          </div>

          <center>
            <span class="shipped-badge">📦 En camino</span>
          </center>

          <h1 style="text-align: center; margin-top: 24px;">¡Tu pedido está en camino!</h1>

          <p style="text-align: center;">
            Hola ${userName}, tu pedido <strong>${orderNumber}</strong> ha sido enviado.
          </p>

          ${trackingHtml}

          <p style="text-align: center;">
            El tiempo de entrega estimado es de 2-5 días laborables dependiendo de tu ubicación.
          </p>

          <center>
            <a href="https://juliopc.github.io/impresion3d/cuenta/pedidos/" class="btn">
              Ver detalles del pedido
            </a>
          </center>

          <div class="footer">
            <p>© 2024 Impresión 3D. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email de pedido entregado
 */
export function orderDeliveredEmail(
  orderNumber: string,
  userName: string
): { subject: string; html: string } {
  const subject = `Tu pedido ${orderNumber} ha sido entregado - Impresión 3D`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${baseStyles}
        .delivered-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #dcfce7;
          color: #16a34a;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <a href="https://juliopc.github.io/impresion3d/" class="logo">🖨️ Impresión 3D</a>
          </div>

          <center>
            <span class="delivered-badge">✓ Entregado</span>
          </center>

          <h1 style="text-align: center; margin-top: 24px;">¡Tu pedido ha llegado!</h1>

          <p style="text-align: center;">
            Hola ${userName}, tu pedido <strong>${orderNumber}</strong> ha sido entregado.
          </p>

          <p style="text-align: center;">
            Esperamos que disfrutes de tu compra. Si tienes alguna pregunta o problema
            con el producto, no dudes en contactarnos.
          </p>

          <center>
            <a href="https://juliopc.github.io/impresion3d/catalogo/" class="btn">
              Seguir comprando
            </a>
          </center>

          <p style="text-align: center; font-size: 14px; margin-top: 24px;">
            ¿Te ha gustado? ¡Comparte tu experiencia con nosotros!<br>
            <a href="https://wa.me/34693846562" style="color: #2563eb;">WhatsApp</a>
          </p>

          <div class="footer">
            <p>© 2024 Impresión 3D. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email de alerta de bajo stock (para admin)
 */
export function lowStockAlertEmail(
  products: Array<{ nombre: string; stock: number }>
): { subject: string; html: string } {
  const subject = '⚠️ Alerta: Productos con bajo stock';

  const productsHtml = products.map(p => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${p.nombre}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${p.stock === 0 ? '#fee2e2' : '#fef3c7'}; color: ${p.stock === 0 ? '#dc2626' : '#b45309'}; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
          ${p.stock === 0 ? 'Sin stock' : `${p.stock} uds`}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <a href="https://juliopc.github.io/impresion3d/" class="logo">🖨️ Impresión 3D</a>
          </div>

          <h1>⚠️ Alerta de stock bajo</h1>

          <p>Los siguientes productos tienen stock bajo o están agotados:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Producto</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Stock</th>
              </tr>
            </thead>
            <tbody>
              ${productsHtml}
            </tbody>
          </table>

          <center>
            <a href="https://juliopc.github.io/impresion3d/admin/productos/" class="btn">
              Gestionar productos
            </a>
          </center>

          <div class="footer">
            <p>Este es un email automático del sistema de gestión.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
