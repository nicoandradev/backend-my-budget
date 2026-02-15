import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendInvitationEmail(email: string, inviteToken: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const registerUrl = `${frontendUrl}/register?token=${inviteToken}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Budget App'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Invitación a Budget App',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #9B59B6 0%, #3498DB 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #9B59B6 0%, #3498DB 100%);
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Has sido invitado!</h1>
              </div>
              <div class="content">
                <p>Hola,</p>
                <p>Has sido invitado a unirte a <strong>Budget App</strong>. Para completar tu registro, haz clic en el siguiente botón:</p>
                <p style="text-align: center;">
                  <a href="${registerUrl}" class="button">Registrarse</a>
                </p>
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #3498DB;">${registerUrl}</p>
                <p>Una vez que completes el registro, podrás comenzar a usar la aplicación.</p>
                <p>Saludos,<br>El equipo de Budget App</p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        ¡Has sido invitado a Budget App!
        
        Para completar tu registro, visita: ${registerUrl}
        
        Una vez que completes el registro, podrás comenzar a usar la aplicación.
        
        Saludos,
        El equipo de Budget App
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error: any) {
      const errorMessage = error?.response || error?.message || 'Error desconocido al enviar email';
      
      // Error específico de Mailgun sandbox
      if (errorMessage.includes('not allowed to send') || errorMessage.includes('Free accounts are for test purposes')) {
        throw new Error('El email no puede ser enviado. La cuenta de Mailgun es gratuita y solo permite enviar a destinatarios autorizados. Por favor, agrega este email a la lista de destinatarios autorizados en Mailgun o verifica tu dominio.');
      }
      
      // Otros errores de SMTP
      if (error?.code === 'EENVELOPE' || error?.code === 'ECONNECTION') {
        throw new Error(`Error al enviar email: ${errorMessage}`);
      }
      
      throw error;
    }
  }

  async sendPasswordRecoveryEmail(email: string, recoveryToken: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${recoveryToken}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Budget App'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Recuperar contraseña - Budget App',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #9B59B6 0%, #3498DB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #9B59B6 0%, #3498DB 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>Recuperar contraseña</h1></div>
              <div class="content">
                <p>Hola,</p>
                <p>Has solicitado restablecer tu contraseña en <strong>Budget App</strong>. Haz clic en el siguiente botón para crear una nueva:</p>
                <p style="text-align: center;"><a href="${resetUrl}" class="button">Restablecer contraseña</a></p>
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #3498DB;">${resetUrl}</p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                <p>Saludos,<br>El equipo de Budget App</p>
              </div>
              <div class="footer"><p>Este es un correo automático, por favor no respondas.</p></div>
            </div>
          </body>
        </html>
      `,
      text: `
        Recuperar contraseña - Budget App
        
        Restablece tu contraseña visitando: ${resetUrl}
        
        Si no solicitaste este cambio, puedes ignorar este correo.
        
        Saludos,
        El equipo de Budget App
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error: any) {
      const errorMessage = error?.response || error?.message || 'Error desconocido al enviar email';
      if (errorMessage.includes('not allowed to send') || errorMessage.includes('Free accounts are for test purposes')) {
        throw new Error('El email no puede ser enviado. La cuenta de Mailgun es gratuita y solo permite enviar a destinatarios autorizados.');
      }
      if (error?.code === 'EENVELOPE' || error?.code === 'ECONNECTION') {
        throw new Error(`Error al enviar email: ${errorMessage}`);
      }
      throw error;
    }
  }
}
