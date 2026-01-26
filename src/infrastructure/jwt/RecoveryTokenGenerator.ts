import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export class RecoveryTokenGenerator {
  generate(email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const expiresIn: string = process.env.RECOVERY_TOKEN_EXPIRES_IN || '1h';

    return jwt.sign(
      { email, purpose: 'password_reset' },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }

  verify(token: string): { email: string } {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const decoded = jwt.verify(token, secret) as { email: string; purpose?: string };
    if (!decoded.email || typeof decoded.email !== 'string') {
      throw new Error('Token de recuperación inválido');
    }
    return { email: decoded.email };
  }
}
