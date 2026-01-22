/**
 * Función helper para enviar emails con Resend
 */

import { Resend } from 'resend';

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

// El API key se pasa como parámetro desde las funciones
export async function sendEmail(
  resendApiKey: string,
  params: EmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resendApiKey) {
    console.error('Resend API key not configured');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: params.from || 'Impresión 3D <noreply@impresion3d.com>',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar email a múltiples destinatarios (por ejemplo, para alertas de admin)
 */
export async function sendBulkEmail(
  resendApiKey: string,
  params: EmailParams[]
): Promise<{ success: boolean; results: Array<{ to: string; success: boolean; id?: string; error?: string }> }> {
  const results = await Promise.all(
    params.map(async (email) => {
      const result = await sendEmail(resendApiKey, email);
      return {
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        ...result,
      };
    })
  );

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}
