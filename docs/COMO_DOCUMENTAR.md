# Cómo Documentar Endpoints

Esta guía explica cómo documentar nuevos endpoints usando Swagger/OpenAPI.

## Formato de Documentación

La documentación se escribe directamente en el código usando comentarios JSDoc con anotaciones `@swagger`. Swagger-jsdoc los convierte automáticamente en especificación OpenAPI.

## Ejemplo Básico

```typescript
/**
 * @swagger
 * /ruta:
 *   post:
 *     summary: Descripción breve del endpoint
 *     tags: [Nombre del Tag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NombreSchema'
 *     responses:
 *       200:
 *         description: Descripción de la respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 */
router.post('/ruta', async (request, response) => {
  // Implementación
});
```

## Elementos Importantes

### 1. Métodos HTTP

- `get`, `post`, `put`, `patch`, `delete`

### 2. Tags

Agrupa endpoints relacionados:
```typescript
tags: [Autenticación]
tags: [Usuarios]
tags: [Presupuestos]
```

### 3. Schemas Reutilizables

Define schemas en `swaggerConfig.ts` bajo `components.schemas`:

```typescript
components: {
  schemas: {
    MiSchema: {
      type: 'object',
      properties: {
        campo: {
          type: 'string',
          example: 'valor ejemplo'
        }
      }
    }
  }
}
```

Luego referencia con `$ref: '#/components/schemas/MiSchema'`

### 4. Respuestas de Error

```typescript
responses:
  400:
    description: Error de validación
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
        examples:
          campoFaltante:
            value:
              error: Campo requerido
```

### 5. Autenticación (Bearer Token)

Para endpoints que requieren autenticación:

```typescript
security:
  - bearerAuth: []
```

Y en el código, valida el token JWT.

## Ejemplo Completo

```typescript
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtiene un usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:id', async (request, response) => {
  // Implementación
});
```

## Ver la Documentación

1. Inicia el servidor: `npm run dev`
2. Abre: http://localhost:3000/api-docs
3. Explora y prueba los endpoints directamente

## Exportar para Modelos de IA

```bash
npm run docs:export
```

Esto genera `docs/openapi.json` y `docs/openapi.yaml` que puedes:
- Pasar a ChatGPT/Claude como contexto
- Importar en Postman/Insomnia
- Usar con herramientas de generación de código

## Mejores Prácticas

1. **Siempre documenta nuevos endpoints** - Mantén la documentación actualizada
2. **Usa tags para organizar** - Agrupa endpoints relacionados
3. **Define schemas reutilizables** - Evita duplicación
4. **Incluye ejemplos** - Facilita el entendimiento
5. **Documenta errores** - Todos los códigos de estado posibles

