import { CloudEventParser, CloudEvent } from '../../../src/infrastructure/bancochile/CloudEventParser';

describe('CloudEventParser', () => {
  let parser: CloudEventParser;

  beforeEach(() => {
    parser = new CloudEventParser();
  });

  describe('parse', () => {
    test('extrae monto, merchant y fecha de un evento de cargo', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 15500,
          comercio: 'Supermercado Lider',
          fecha: '2024-01-15'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe(15500);
      expect(result?.merchant).toBe('Supermercado Lider');
      expect(result?.type).toBe('expense');
      expect(result?.date).toBeInstanceOf(Date);
    });

    test('extrae monto de un evento con monto como string', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: '25.000',
          comercio: 'Farmacia Ahumada'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe(25000);
    });

    test('identifica un abono como income', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.abono',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 50000,
          comercio: 'Transferencia recibida'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('income');
      expect(result?.amount).toBe(50000);
    });

    test('identifica tipo por el tipo de evento', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.debito',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 10000
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('expense');
    });

    test('identifica tipo por el campo tipo en data', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 30000,
          tipo: 'ABONO'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('income');
    });

    test('extrae merchant de diferentes campos', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 12000,
          establecimiento: 'Falabella'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.merchant).toBe('Falabella');
    });

    test('usa fecha del evento si no hay fecha en data', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-02-10T14:30:00Z',
        data: {
          monto: 5000
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.date).toBeInstanceOf(Date);
      expect(result?.date.getFullYear()).toBe(2024);
      expect(result?.date.getMonth()).toBe(1);
    });

    test('extrae fecha en formato ISO', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 10000,
          fecha: '2024-03-20'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.date.getFullYear()).toBe(2024);
      expect(result?.date.getMonth()).toBe(2);
      expect(result?.date.getDate()).toBe(20);
    });

    test('retorna null si no puede extraer el monto', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          descripcion: 'Notificación sin monto'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).toBeNull();
    });

    test('retorna null si no hay data', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: null as any
      };

      const result = parser.parse(cloudEvent);

      expect(result).toBeNull();
    });

    test('usa merchant por defecto si no se encuentra', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.cargo',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 3500
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.merchant).toBe('Banco de Chile');
    });

    test('identifica depósito como income', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento.deposito',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 75000
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('income');
    });

    test('identifica ingreso como income por tipoMovimiento', () => {
      const cloudEvent: CloudEvent = {
        specVersion: '1.0',
        type: 'movimiento',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z',
        data: {
          monto: 8500,
          tipoMovimiento: 'INGRESO'
        }
      };

      const result = parser.parse(cloudEvent);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('income');
    });
  });
});
