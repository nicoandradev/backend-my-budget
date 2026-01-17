# Cómo Configurar tu Cuenta del Banco de Chile

Esta guía explica cómo asociar tu cuenta del Banco de Chile con tu usuario en la aplicación para recibir notificaciones automáticas de tus movimientos bancarios.

## 📋 Requisitos Previos

1. Tener una cuenta registrada en la aplicación
2. Tener acceso a la API del Banco de Chile (sandbox o producción)
3. Obtener tu `publicKey` del Banco de Chile

## 🔑 ¿Qué es el publicKey?

El `publicKey` es un identificador único que el Banco de Chile usa para asociar notificaciones con tu cuenta bancaria. Este key permite que el banco sepa a qué usuario enviar las notificaciones cuando ocurre un movimiento en tu cuenta.

## 📝 Paso a Paso

### Paso 1: Obtener tu publicKey

El `publicKey` puede venir de diferentes fuentes dependiendo de cómo el Banco de Chile te lo proporcione:

- **Opción A**: El banco te proporciona el publicKey cuando te registras en su plataforma de API
- **Opción B**: Generas tu propio par de claves (pública/privada) y registras la pública en el banco
- **Opción C**: El banco genera el publicKey automáticamente cuando configuras notificaciones

**Nota**: Si no estás seguro de cómo obtener tu publicKey, contacta al soporte del Banco de Chile o revisa su documentación de API.

### Paso 2: Asociar tu publicKey en la aplicación

Una vez que tengas tu `publicKey`, sigue estos pasos:

1. **Inicia sesión** en la aplicación para obtener tu token JWT

```bash
curl -X POST https://tu-app.run.app/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@example.com",
    "password": "tu-password"
  }'
```

2. **Asocia tu publicKey** usando el token obtenido:

```bash
curl -X POST https://tu-app.run.app/bancochile/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "publicKey": "tu-public-key-aqui"
  }'
```

**Respuesta exitosa (201)**:
```json
{
  "id": "uuid-de-la-asociacion",
  "userId": "tu-user-id",
  "publicKey": "tu-public-key-aqui",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### Paso 3: Verificar tus keys asociadas

Puedes listar todos tus publicKeys asociados:

```bash
curl -X GET https://tu-app.run.app/bancochile/keys \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

**Respuesta**:
```json
[
  {
    "id": "uuid-1",
    "userId": "tu-user-id",
    "publicKey": "public-key-1",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### Paso 4: Configurar notificaciones en el Banco de Chile

Una vez que tu publicKey está asociado, necesitas configurar el Banco de Chile para que envíe notificaciones a tu webhook.

**Importante**: Necesitas la URL pública de tu aplicación desplegada. Si estás en desarrollo local, usa ngrok o similar.

```bash
curl -X POST https://gw.apistore.bancochile.cl/banco-chile/sandbox/v1/api-store/notificaciones/movimientos/enviar \
  -H "Content-Type: application/json" \
  -H "Client-Id: TU_CLIENT_ID" \
  -H "Client-Secret: TU_CLIENT_SECRET" \
  -d '{
    "publicKey": "tu-public-key-aqui",
    "url": "https://tu-app.run.app/webhooks/bancochile"
  }'
```

### Paso 5: Verificar que funciona

Una vez configurado, cuando ocurra un movimiento en tu cuenta bancaria:

1. El Banco de Chile enviará un CloudEvent a tu webhook
2. El sistema buscará tu usuario por el `publicKey` en el evento
3. Se creará automáticamente un expense o income en tu cuenta
4. Podrás verlo al hacer login en la aplicación

## 🔍 Ver tus Expenses e Incomes

Después de recibir notificaciones, puedes ver tus movimientos:

```bash
# Ver expenses
curl -X GET https://tu-app.run.app/expenses \
  -H "Authorization: Bearer TU_TOKEN_JWT"

# Ver incomes
curl -X GET https://tu-app.run.app/incomes \
  -H "Authorization: Bearer TU_TOKEN_JWT"

# Ver resumen
curl -X GET https://tu-app.run.app/summary \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## 🗑️ Eliminar una asociación

Si necesitas eliminar una asociación de publicKey:

```bash
curl -X DELETE https://tu-app.run.app/bancochile/keys/UUID_DE_LA_KEY \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## ❓ Preguntas Frecuentes

### ¿Puedo tener múltiples publicKeys?

Sí, puedes asociar múltiples publicKeys a tu cuenta. Esto es útil si tienes múltiples cuentas bancarias.

### ¿Qué pasa si olvido mi publicKey?

Puedes listar todos tus publicKeys asociados usando el endpoint `GET /bancochile/keys`.

### ¿Cómo sé si las notificaciones están funcionando?

1. Verifica que tu publicKey esté asociado: `GET /bancochile/keys`
2. Verifica que el banco esté configurado para enviar a tu webhook
3. Realiza un movimiento de prueba en tu cuenta bancaria
4. Revisa tus expenses/incomes en la aplicación

### ¿Qué pasa si cambio de cuenta bancaria?

Simplemente asocia un nuevo publicKey y elimina el anterior si ya no lo necesitas.

## 🐛 Solución de Problemas

### Error: "Esta publicKey ya está asociada a otro usuario"

Significa que ese publicKey ya está en uso por otro usuario. Verifica que estés usando el publicKey correcto.

### Error: "Usuario no encontrado" al recibir notificaciones

Asegúrate de:
1. Haber asociado tu publicKey correctamente
2. Que el publicKey en el CloudEvent coincida con el que registraste
3. Que tu cuenta de usuario exista en el sistema

### Las notificaciones no llegan

Verifica:
1. Que el banco esté configurado para enviar a la URL correcta
2. Que la URL del webhook sea accesible públicamente (HTTPS)
3. Que el publicKey en la configuración del banco coincida con el registrado

## 📞 Soporte

Si tienes problemas, verifica:
- Los logs del servidor para ver errores
- Que tu publicKey esté correctamente formateado
- Que el webhook esté recibiendo las notificaciones (revisa los logs)
