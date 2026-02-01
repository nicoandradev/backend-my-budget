import { google } from 'googleapis';
import { GmailAuth } from './GmailAuth';

const gmailAuth = new GmailAuth();

export interface WatchResult {
  historyId: string;
  expiration: string;
}

export interface GmailMessage {
  id: string;
  from: string;
  snippet: string;
  body: string;
}

export async function watchGmail(refreshToken: string, topicName: string): Promise<WatchResult> {
  const accessToken = await gmailAuth.getAccessToken(refreshToken);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName
    }
  });

  if (!response.data.historyId || !response.data.expiration) {
    throw new Error('Respuesta inválida de Gmail watch');
  }

  return {
    historyId: String(response.data.historyId),
    expiration: response.data.expiration
  };
}

export async function stopGmailWatch(refreshToken: string): Promise<void> {
  const accessToken = await gmailAuth.getAccessToken(refreshToken);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.stop({ userId: 'me' });
}

export async function listHistoryMessageIds(
  refreshToken: string,
  startHistoryId: string
): Promise<string[]> {
  const accessToken = await gmailAuth.getAccessToken(refreshToken);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded']
  });

  const messageIds: string[] = [];
  const history = response.data.history || [];

  for (const record of history) {
    const messages = record.messagesAdded || [];
    for (const msg of messages) {
      if (msg.message?.id) {
        messageIds.push(msg.message.id);
      }
    }
  }

  return messageIds;
}

export async function getMessage(
  refreshToken: string,
  messageId: string
): Promise<GmailMessage | null> {
  const accessToken = await gmailAuth.getAccessToken(refreshToken);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  const message = response.data;
  if (!message || !message.id) {
    return null;
  }

  let from = '';
  const headers = message.payload?.headers || [];
  for (const h of headers) {
    if (h.name?.toLowerCase() === 'from' && h.value) {
      from = h.value;
      break;
    }
  }

  let body = '';
  const parts = message.payload?.parts || [];

  if (parts.length > 0) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      }
    }
    if (!body) {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }
  } else if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  return {
    id: message.id,
    from,
    snippet: message.snippet || '',
    body
  };
}

export async function getProfileEmail(refreshToken: string): Promise<string> {
  const accessToken = await gmailAuth.getAccessToken(refreshToken);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.getProfile({ userId: 'me' });
  const email = response.data.emailAddress;
  if (!email) {
    throw new Error('No se pudo obtener email del perfil de Gmail');
  }
  return email;
}
