export interface ParsedTransaction {
  amount: number;
  merchant: string;
  date: Date;
  type: 'expense' | 'income';
}

export interface CloudEvent {
  specVersion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  dataContentType?: string;
  dataSchema?: string;
  subject?: string;
  data: any;
}

export class CloudEventParser {
  parse(cloudEvent: CloudEvent): ParsedTransaction | null {
    if (!cloudEvent.data) {
      return null;
    }

    const data = cloudEvent.data;
    
    const amount = this.extractAmount(data);
    if (!amount) {
      return null;
    }

    const merchant = this.extractMerchant(data);
    const date = this.extractDate(data, cloudEvent.time);
    const type = this.determineType(data, cloudEvent.type);

    return {
      amount,
      merchant,
      date,
      type
    };
  }

  private extractAmount(data: any): number | null {
    if (typeof data.monto === 'number') {
      return data.monto;
    }

    if (typeof data.monto === 'string') {
      const cleanedAmount = data.monto.replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(cleanedAmount);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    if (typeof data.amount === 'number') {
      return data.amount;
    }

    if (typeof data.amount === 'string') {
      const cleanedAmount = data.amount.replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(cleanedAmount);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    if (data.valor && typeof data.valor === 'number') {
      return data.valor;
    }

    return null;
  }

  private extractMerchant(data: any): string {
    if (data.comercio && typeof data.comercio === 'string') {
      return data.comercio.trim();
    }

    if (data.merchant && typeof data.merchant === 'string') {
      return data.merchant.trim();
    }

    if (data.establecimiento && typeof data.establecimiento === 'string') {
      return data.establecimiento.trim();
    }

    if (data.descripcion && typeof data.descripcion === 'string') {
      return data.descripcion.trim();
    }

    if (data.concepto && typeof data.concepto === 'string') {
      return data.concepto.trim();
    }

    return 'Banco de Chile';
  }

  private extractDate(data: any, eventTime: string): Date {
    if (data.fecha && typeof data.fecha === 'string') {
      const parsedDate = this.parseDateString(data.fecha);
      if (parsedDate) {
        return parsedDate;
      }
    }

    if (data.date && typeof data.date === 'string') {
      const parsedDate = this.parseDateString(data.date);
      if (parsedDate) {
        return parsedDate;
      }
    }

    if (data.fechaTransaccion && typeof data.fechaTransaccion === 'string') {
      const parsedDate = this.parseDateString(data.fechaTransaccion);
      if (parsedDate) {
        return parsedDate;
      }
    }

    try {
      const eventDate = new Date(eventTime);
      if (!isNaN(eventDate.getTime())) {
        return eventDate;
      }
    } catch {
      // Fall through to current date
    }

    return new Date();
  }

  private parseDateString(dateString: string): Date | null {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (isoDatePattern.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const datePattern = /(\d{4})-(\d{2})-(\d{2})/;
    const match = dateString.match(datePattern);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }

    return null;
  }

  private determineType(data: any, eventType: string): 'expense' | 'income' {
    const eventTypeLower = eventType.toLowerCase();
    
    if (eventTypeLower.includes('cargo') || eventTypeLower.includes('debito') || eventTypeLower.includes('pago') || eventTypeLower.includes('egreso')) {
      return 'expense';
    }

    if (eventTypeLower.includes('abono') || eventTypeLower.includes('credito') || eventTypeLower.includes('ingreso') || eventTypeLower.includes('deposito')) {
      return 'income';
    }

    if (data.tipo && typeof data.tipo === 'string') {
      const tipoLower = data.tipo.toLowerCase();
      if (tipoLower.includes('cargo') || tipoLower.includes('debito') || tipoLower.includes('egreso')) {
        return 'expense';
      }
      if (tipoLower.includes('abono') || tipoLower.includes('credito') || tipoLower.includes('ingreso')) {
        return 'income';
      }
    }

    if (data.tipoMovimiento && typeof data.tipoMovimiento === 'string') {
      const tipoLower = data.tipoMovimiento.toLowerCase();
      if (tipoLower.includes('cargo') || tipoLower.includes('debito') || tipoLower.includes('egreso')) {
        return 'expense';
      }
      if (tipoLower.includes('abono') || tipoLower.includes('credito') || tipoLower.includes('ingreso')) {
        return 'income';
      }
    }

    if (typeof data.monto === 'number' && data.monto < 0) {
      return 'expense';
    }

    return 'expense';
  }
}
