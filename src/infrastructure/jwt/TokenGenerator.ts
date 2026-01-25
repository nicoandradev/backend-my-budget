import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export class TokenGenerator {
  generate(userId: string, email: string, role: 'root' | 'admin' | 'user' = 'user'): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const expiresIn: string = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign(
      { userId, email, role },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }
}

