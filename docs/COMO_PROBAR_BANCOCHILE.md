# Cómo Probar la Integración con Banco de Chile

Esta guía explica cómo probar la integración con la API del Banco de Chile para recibir notificaciones de movimientos bancarios.

## 📋 Prerrequisitos

1. **Servidor corriendo**: El backend debe estar ejecutándose
   ```bash
   cd backend
   npm run dev
   ```
   El servidor estará en `http://localhost:3000`

2. **Base de datos configurada**: Asegúrate de tener un usuario creado en la base de datos

3. **Variables de entorno**: Ya tienes los valores por defecto para `BANCOCHILE_CLIENT_ID` y `BANCOCHILE_CLIENT_SECRET`

## 🧪 Opción 1: Probar el Webhook Directamente (Local)

Esta es la forma más rápida de probar sin usar la API del banco.

### Paso 1: Crear un usuario de prueba

Primero, crea un usuario en tu sistema:

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Usuario Test"
  }'
```

### Paso 2: Enviar un CloudEvent de prueba al webhook

Simula una notificación del banco enviando un CloudEvent directamente:

```bash
curl -X POST http://localhost:3000/webhooks/bancochile \
  -H "Content-Type: application/json" \
  -d '{
    "specVersion": "1.0",
    "type": "movimiento.cargo",
    "source": "bancochile.cl",
    "id": "test-event-123",
    "time": "2024-01-15T10:00:00Z",
    "data": {
      "monto": 15000,
      "comercio": "Supermercado Lider",
      "fecha": "2024-01-15",
      "email": "test@example.com"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Evento procesado exitosamente"
}
```

### Paso 3: Verificar que se creó el expense

```bash
# Primero obtén el token de autenticación
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Copia el token y úsalo para listar expenses:

```bash
curl -X GET http://localhost:3000/expenses \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Deberías ver el expense creado con monto 15000 y merchant "Supermercado Lider".

### Probar un Income (Abono)

```bash
curl -X POST http://localhost:3000/webhooks/bancochile \
  -H "Content-Type: application/json" \
  -d '{
    "specVersion": "1.0",
    "type": "movimiento.abono",
    "source": "bancochile.cl",
    "id": "test-event-456",
    "time": "2024-01-15T10:00:00Z",
    "data": {
      "monto": 50000,
      "comercio": "Transferencia recibida",
      "fecha": "2024-01-15",
      "email": "test@example.com"
    }
  }'
```

## 🌐 Opción 2: Usar la API del Banco de Chile

### Paso 1: Generar un CloudEvent de ejemplo

El endpoint `/generar` te permite ver cómo es un CloudEvent sin enviarlo:

```bash
curl -X POST https://gw.apistore.bancochile.cl/banco-chile/sandbox/v1/api-store/notificaciones/movimientos/generar \
  -H "Content-Type: application/json" \
  -H "Client-Id: 1eefa2540a7d25adf35dfbe9243e1ab4" \
  -H "Client-Secret: 68d5456ffe7555920a724a361290a14d" \
  -d '{
    "publicKey": "test-key"
  }'
```

Esto te devolverá un CloudEvent de ejemplo que puedes usar para entender la estructura.

### Paso 2: Enviar notificación real (requiere URL pública)

Para que el banco envíe una notificación real a tu webhook, necesitas:

1. **Exponer tu servidor local** usando ngrok o similar:
   ```bash
   # Instala ngrok si no lo tienes
   # https://ngrok.com/
   
   ngrok http 3000
   ```

2. **Copia la URL pública** que ngrok te da (ej: `https://abc123.ngrok.io`)

3. **Envía la notificación** usando el endpoint `/enviar`:
   ```bash
   curl -X POST https://gw.apistore.bancochile.cl/banco-chile/sandbox/v1/api-store/notificaciones/movimientos/enviar \
     -H "Content-Type: application/json" \
     -H "Client-Id: 1eefa2540a7d25adf35dfbe9243e1ab4" \
     -H "Client-Secret: 68d5456ffe7555920a724a361290a14d" \
     -d '{
       "publicKey": "test-key",
       "url": "https://abc123.ngrok.io/webhooks/bancochile"
     }'
   ```

   El banco enviará un CloudEvent a tu webhook en `https://abc123.ngrok.io/webhooks/bancochile`

## 🔍 Opción 3: Usar Postman o Insomnia

### Importar la colección

1. Abre Postman/Insomnia
2. Crea una nueva request POST a `http://localhost:3000/webhooks/bancochile`
3. En el body, selecciona "raw" y "JSON"
4. Pega este ejemplo:

```json
{
  "specVersion": "1.0",
  "type": "movimiento.cargo",
  "source": "bancochile.cl",
  "id": "postman-test-123",
  "time": "2024-01-15T10:00:00Z",
  "data": {
    "monto": 25000,
    "comercio": "Farmacia Ahumada",
    "fecha": "2024-01-15",
    "email": "test@example.com"
  }
}
```

5. Envía la request y verifica la respuesta

## 📝 Ejemplos de CloudEvent

### Cargo (Expense)
```json
{
  "specVersion": "1.0",
  "type": "movimiento.cargo",
  "source": "bancochile.cl",
  "id": "event-cargo-001",
  "time": "2024-01-15T10:00:00Z",
  "data": {
    "monto": 15000,
    "comercio": "Supermercado",
    "fecha": "2024-01-15",
    "email": "usuario@example.com"
  }
}
```

### Abono (Income)
```json
{
  "specVersion": "1.0",
  "type": "movimiento.abono",
  "source": "bancochile.cl",
  "id": "event-abono-001",
  "time": "2024-01-15T10:00:00Z",
  "data": {
    "monto": 50000,
    "comercio": "Transferencia",
    "fecha": "2024-01-15",
    "email": "usuario@example.com"
  }
}
```

### Con tipoMovimiento en data
```json
{
  "specVersion": "1.0",
  "type": "movimiento",
  "source": "bancochile.cl",
  "id": "event-001",
  "time": "2024-01-15T10:00:00Z",
  "data": {
    "monto": 30000,
    "tipoMovimiento": "CARGO",
    "establecimiento": "Tienda XYZ",
    "fechaTransaccion": "2024-01-15",
    "email": "usuario@example.com"
  }
}
```

## 🐛 Debugging

### Ver logs del servidor

El servidor mostrará errores en la consola. Si algo falla, revisa:
- Los logs del servidor donde ejecutaste `npm run dev`
- La respuesta HTTP del webhook
- Los logs de la base de datos

### Verificar en la base de datos

```sql
-- Ver expenses creados
SELECT * FROM expenses ORDER BY created_at DESC LIMIT 10;

-- Ver incomes creados
SELECT * FROM incomes ORDER BY created_at DESC LIMIT 10;
```

### Errores comunes

1. **"Usuario no encontrado"**: Asegúrate de que el email en el CloudEvent existe en la tabla `users`
2. **"No se pudo determinar el email del usuario"**: El CloudEvent debe tener el email en `data.email` o configurar `BANCOCHILE_USER_EMAIL` en `.env`
3. **"No se pudo parsear la transacción"**: Verifica que el campo `monto` esté presente y sea válido

## ✅ Checklist de Pruebas

- [ ] Servidor corriendo en `http://localhost:3000`
- [ ] Usuario creado en la base de datos
- [ ] Webhook responde correctamente a CloudEvent de cargo
- [ ] Se crea un expense en la base de datos
- [ ] Webhook responde correctamente a CloudEvent de abono
- [ ] Se crea un income en la base de datos
- [ ] Los montos se parsean correctamente
- [ ] Las fechas se extraen correctamente
- [ ] Los merchants se extraen correctamente

## 🚀 Próximos Pasos

Una vez que funcione localmente:
1. Despliega tu backend a producción
2. Configura la URL pública del webhook en el Banco de Chile
3. Usa el endpoint `/enviar` para que el banco envíe notificaciones reales
