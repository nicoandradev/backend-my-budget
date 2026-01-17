import { BancoChileClient, CloudEvent } from '../../../src/infrastructure/bancochile/BancoChileClient';

describe('The BancoChileClient', () => {
  let client: BancoChileClient;

  beforeEach(() => {
    client = new BancoChileClient();
  });

  describe('when testing connection to Banco de Chile API', () => {
    it('can reach the API endpoint and receives a response', async () => {
      const testPublicKey = 'test-key-123';

      try {
        const cloudEvent = await client.generateNotification({ publicKey: testPublicKey });

        expect(cloudEvent).toBeDefined();
        expect(cloudEvent.specVersion).toBeDefined();
        expect(cloudEvent.type).toBeDefined();
        expect(cloudEvent.source).toBeDefined();
        expect(cloudEvent.id).toBeDefined();
        expect(cloudEvent.time).toBeDefined();
        expect(cloudEvent.data).toBeDefined();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('fetch failed') || errorMessage.includes('redirect')) {
          throw new Error(
            `No se pudo conectar a la API del Banco de Chile. ` +
            `Esto puede deberse a: problemas de red, credenciales inválidas, o la API está temporalmente no disponible. ` +
            `Error original: ${errorMessage}`
          );
        }
        
        if (errorMessage.includes('BancoChile API error')) {
          const statusMatch = errorMessage.match(/(\d{3})/);
          const status = statusMatch ? statusMatch[1] : 'unknown';
          
          throw new Error(
            `La API del Banco de Chile respondió con error ${status}. ` +
            `Verifica que las credenciales (BANCOCHILE_CLIENT_ID y BANCOCHILE_CLIENT_SECRET) sean correctas. ` +
            `Error original: ${errorMessage}`
          );
        }
        
        throw error;
      }
    }, 30000);

    it('receives a valid CloudEvent structure when connection succeeds', async () => {
      const testPublicKey = 'test-key-456';

      try {
        const cloudEvent = await client.generateNotification({ publicKey: testPublicKey });

        expect(typeof cloudEvent.specVersion).toBe('string');
        expect(typeof cloudEvent.type).toBe('string');
        expect(typeof cloudEvent.source).toBe('string');
        expect(typeof cloudEvent.id).toBe('string');
        expect(typeof cloudEvent.time).toBe('string');
        expect(cloudEvent.data).toBeInstanceOf(Object);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('fetch failed') || errorMessage.includes('redirect')) {
          console.warn('⚠️  No se pudo conectar a la API. Verifica tu conexión a internet y las credenciales.');
        }
        
        throw error;
      }
    }, 30000);
  });

  describe('when credentials are missing', () => {
    it('throws an error with descriptive message', () => {
      const originalClientId = process.env.BANCOCHILE_CLIENT_ID;
      const originalClientSecret = process.env.BANCOCHILE_CLIENT_SECRET;

      delete process.env.BANCOCHILE_CLIENT_ID;
      delete process.env.BANCOCHILE_CLIENT_SECRET;

      const invalidClient = new BancoChileClient();

      expect(() => {
        invalidClient.generateNotification({ publicKey: 'test-key' });
      }).rejects.toThrow('BancoChile credentials missing');

      process.env.BANCOCHILE_CLIENT_ID = originalClientId;
      process.env.BANCOCHILE_CLIENT_SECRET = originalClientSecret;
    });
  });
});
