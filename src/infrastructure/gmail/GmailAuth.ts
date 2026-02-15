import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const gmailScope = 'https://www.googleapis.com/auth/gmail.readonly';

export class GmailAuth {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_AUTH_REDIRECT_URI
  );

  generateAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [gmailScope],
      state,
      prompt: 'consent'
    });
  }

  async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('No se obtuvo refresh token de Google');
    }
    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token
    };
  }

  async getAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('No se pudo obtener access token');
    }
    return credentials.access_token;
  }
}
