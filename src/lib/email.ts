import nodemailer from 'nodemailer';
import { config } from './env';

let transporter: any = null;

export async function initializeEmailTransport() {
  if (transporter) return transporter;

  const smtpHost = config.smtp.host;
  const smtpPort = config.smtp.port;
  const smtpUser = config.smtp.user;
  const smtpPass = config.smtp.pass;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️ SMTP no configurado. Los emails no se enviarán.');
    return null;
  }

  const port = parseInt(smtpPort);
  
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: port,
    secure: false,  // false para puerto 587 (STARTTLS)
    requireTLS: true,  // Forzar TLS
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

export async function sendContactEmail(
  nombre: string,
  email: string,
  mensaje: string
) {
  const transporter = await initializeEmailTransport();
  
  if (!transporter) {
    console.log('📧 Email simulado (SMTP no configurado):', { nombre, email, mensaje });
    return { success: true, message: 'Email guardado (modo simulación)' };
  }

  try {
    const contactEmail = config.contactEmail || 'info@jaldelareina.es';

    await transporter.sendMail({
      from: config.smtp.from || config.smtp.user,
      to: contactEmail,
      replyTo: email,
      subject: `[JLR Solutions] Nuevo contacto de ${nombre}`,
      html: `
        <h2>Nuevo contacto recibido</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje.replace(/\n/g, '<br>')}</p>
      `,
    });

    // Email de confirmación al usuario
    await transporter.sendMail({
      from: config.smtp.from || config.smtp.user,
      to: email,
      subject: 'Hemos recibido tu mensaje - JLR Solutions',
      html: `
        <h2>¡Gracias por contactar!</h2>
        <p>Hola ${nombre},</p>
        <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.</p>
        <p>Un saludo,<br>El equipo de JLR Solutions</p>
      `,
    });

    console.log(`✅ Email enviado a ${contactEmail} desde ${email}`);
    return { success: true, message: 'Email enviado correctamente' };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, message: 'Error al enviar el email' };
  }
}
