import type { APIRoute } from 'astro';
import { saveContact, checkRateLimit } from '../lib/db';
import { sendContactEmail } from '../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener IP del cliente
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('cf-connecting-ip') ||
               'unknown';

    // Validar rate limit
    const rateLimit = checkRateLimit(ip, 5, 24);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Demasiados intentos. Intenta de nuevo mañana.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parsear formulario
    const formData = await request.formData();
    const nombre = formData.get('nombre')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const mensaje = formData.get('mensaje')?.toString().trim() || '';

    // Validaciones
    if (!nombre || nombre.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nombre inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!mensaje || mensaje.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mensaje muy corto (mínimo 10 caracteres)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Guardar en BD
    saveContact(nombre, email, mensaje, ip);

    // Enviar email
    const emailResult = await sendContactEmail(nombre, email, mensaje);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensaje enviado correctamente. ¡Gracias por contactar!',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en contact API:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error procesando tu solicitud',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
