# Guía para Generar Frontend con IA

Esta guía explica cómo usar la documentación OpenAPI de esta API para generar un frontend completo usando modelos de IA como ChatGPT, Claude, o cualquier otra herramienta.

## 📋 Contenido de la Documentación

La API incluye los siguientes endpoints:

### Autenticación
- `POST /register` - Registro de usuarios
- `POST /login` - Inicio de sesión

### Gastos (Expenses)
- `POST /expenses` - Crear un nuevo gasto
- `GET /expenses` - Listar todos los gastos del usuario
- `GET /expenses/{id}` - Obtener un gasto por ID
- `PUT /expenses/{id}` - Actualizar un gasto
- `DELETE /expenses/{id}` - Eliminar un gasto

### Sistema
- `GET /health` - Verificar estado del servidor

## 📄 Archivos de Documentación Disponibles

1. **`docs/openapi.json`** - Especificación OpenAPI en formato JSON
2. **`docs/openapi.yaml`** - Especificación OpenAPI en formato YAML

Ambos archivos contienen la misma información, usa el que prefieras.

## 🚀 Cómo Exportar la Documentación

Si necesitas actualizar la documentación después de cambios en la API:

```bash
npm run docs:export
```

Esto generará/actualizará los archivos en `docs/openapi.json` y `docs/openapi.yaml`.

## 🤖 Cómo Usar con IA para Generar Frontend

### Opción 1: ChatGPT / Claude (Anthropic)

**Prompt recomendado:**

```
Necesito que me crees un frontend completo para consumir esta API. Aquí está la especificación OpenAPI:

[Pega aquí el contenido completo de docs/openapi.json o docs/openapi.yaml]

Requisitos del frontend:
- Framework: [React / Vue / Angular / Svelte - elige uno]
- Tipo de aplicación: [Web / Mobile / Desktop - elige uno]
- Características requeridas:
  - Pantalla de login y registro
  - Dashboard para gestionar gastos (CRUD completo)
  - Lista de gastos con filtros y búsqueda
  - Formulario para crear/editar gastos
  - Autenticación con JWT (guardar token en localStorage/sessionStorage)
  - Manejo de errores y validaciones
  - Diseño moderno y responsive

Por favor genera:
1. Estructura completa del proyecto
2. Componentes necesarios
3. Servicios para llamadas a la API
4. Manejo de autenticación
5. Routing si es necesario
6. Estilos CSS/SCSS/Tailwind (indica preferencia)
```

### Opción 2: Usar el Contenido del Archivo Directamente

**Pasos:**

1. Abre el archivo `docs/openapi.json` o `docs/openapi.yaml`
2. Copia TODO el contenido
3. Pégalo en el prompt de la IA junto con tus requisitos

**Ejemplo de prompt estructurado:**

```
Por favor, crea un frontend React con TypeScript que consuma esta API.

ESPECIFICACIÓN OPENAPI:
[Pega el contenido completo de docs/openapi.json aquí]

REQUISITOS:
- React 18+ con TypeScript
- React Router para navegación
- Axios o Fetch para llamadas HTTP
- Context API o Zustand para estado global (autenticación)
- Tailwind CSS para estilos
- Formularios con validación
- Manejo de errores
- Interceptores HTTP para agregar token JWT en headers

FUNCIONALIDADES:
1. Login/Register
2. Dashboard con lista de gastos
3. Crear gasto (formulario con campos: merchant, amount, category, date)
4. Editar gasto
5. Eliminar gasto (con confirmación)
6. Cerrar sesión

Por favor genera código completo y funcional.
```

### Opción 3: Referencia por URL (Si el servidor está corriendo)

Si tienes el servidor corriendo localmente o en producción:

```
Usa esta especificación OpenAPI: http://localhost:3000/api-docs.json

[Copia el prompt de arriba]
```

## 📝 Información Importante para la IA

### Autenticación

- **Tipo**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`
- **Obtener token**: 
  - `POST /register` devuelve `{ token: "..." }`
  - `POST /login` devuelve `{ token: "..." }`
- **Guardar**: localStorage o sessionStorage
- **Incluir en requests**: Todos los endpoints de `/expenses` requieren autenticación

### Endpoints Protegidos

Todos los endpoints bajo `/expenses` requieren autenticación. El frontend debe:
1. Verificar si existe token al cargar
2. Redirigir a login si no hay token
3. Agregar header `Authorization: Bearer <token>` en todas las requests a `/expenses`

### Estructura de Datos

**Expense (Gasto):**
```typescript
interface Expense {
  id: string;           // UUID
  userId: string;       // UUID (no necesario en frontend)
  merchant: string;     // Nombre del comercio
  amount: number;       // Monto (decimal)
  category: string;     // Categoría (texto libre)
  date: string;         // Fecha en formato "YYYY-MM-DD"
  createdAt: string;    // ISO datetime
  updatedAt: string;    // ISO datetime
}
```

**Crear/Actualizar Expense:**
```typescript
interface CreateExpenseRequest {
  merchant: string;     // Requerido
  amount: number;       // Requerido, mínimo 0.01
  category: string;     // Requerido
  date: string;         // Requerido, formato "YYYY-MM-DD"
}
```

### Códigos de Respuesta HTTP

- `200` - Éxito (GET, PUT)
- `201` - Creado (POST /expenses)
- `204` - Sin contenido (DELETE)
- `400` - Error de validación
- `401` - No autenticado
- `403` - No autorizado (gasto de otro usuario)
- `404` - No encontrado
- `409` - Conflicto (email ya existe en registro)

### Validaciones

- **Monto**: Debe ser positivo (mayor a 0)
- **Fecha**: Formato ISO "YYYY-MM-DD"
- **Campos requeridos**: Todos los campos son obligatorios excepto timestamps

## 🎨 Sugerencias de UI/UX

Para que la IA genere un mejor frontend, incluye estas preferencias:

```
DISEÑO:
- Moderno y limpio
- Colores: [indica tu paleta preferida]
- Tipografía: [indica fuentes preferidas]
- Responsive: Mobile-first
- Iconos: [Material Icons / Font Awesome / Heroicons]

COMPONENTES ESPECÍFICOS:
- Tabla de gastos con ordenamiento por fecha/monto
- Filtros por categoría y rango de fechas
- Formulario modal o página separada para crear/editar
- Confirmación antes de eliminar
- Notificaciones/toasts para feedback de acciones
- Loading states en botones y listas
- Empty states cuando no hay gastos
```

## 🔧 Ejemplo de Configuración de Cliente HTTP

La IA debería generar algo similar a esto para las llamadas HTTP:

```typescript
// api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 📦 Stack Tecnológico Recomendado

Para dar más contexto a la IA, especifica tu stack preferido:

```
STACK PREFERIDO:
- Framework: React / Vue / Angular / Svelte
- Lenguaje: TypeScript
- Build Tool: Vite / Create React App / Next.js
- Estado: Context API / Zustand / Redux Toolkit
- HTTP Client: Axios / Fetch / React Query
- Estilos: Tailwind CSS / CSS Modules / Styled Components
- Formularios: React Hook Form / Formik
- Validación: Yup / Zod
- Routing: React Router / Next.js Router
```

## ✅ Checklist para Validar el Frontend Generado

Después de que la IA genere el código, verifica que incluya:

- [ ] Login funcional (POST /login)
- [ ] Registro funcional (POST /register)
- [ ] Lista de gastos (GET /expenses)
- [ ] Crear gasto (POST /expenses)
- [ ] Editar gasto (PUT /expenses/:id)
- [ ] Eliminar gasto (DELETE /expenses/:id)
- [ ] Autenticación con JWT (token en localStorage)
- [ ] Protección de rutas (redirigir a login si no autenticado)
- [ ] Manejo de errores (401, 403, 404, 400)
- [ ] Validación de formularios
- [ ] Loading states
- [ ] Diseño responsive

## 🚀 Próximos Pasos

1. **Copia el contenido de `docs/openapi.json`** o `docs/openapi.yaml`
2. **Elige tu IA preferida** (ChatGPT, Claude, etc.)
3. **Pega el prompt recomendado** con la especificación OpenAPI
4. **Especifica tus requisitos** de diseño y stack tecnológico
5. **Revisa y ajusta** el código generado según necesites
6. **Prueba la integración** con el backend corriendo en `http://localhost:3000`

## 📚 Recursos Adicionales

- **Swagger UI**: Si el servidor está corriendo, visita `http://localhost:3000/api-docs` para ver la documentación interactiva
- **OpenAPI Spec**: Revisa la especificación completa en `docs/openapi.json` o `docs/openapi.yaml`
- **Tests**: Consulta `tests/routes/expensesRoute.test.ts` para ver ejemplos de uso de la API

## 💡 Tips

1. **Sé específico**: Mientras más detalles des sobre diseño y funcionalidad, mejor será el resultado
2. **Itera**: Si el primer resultado no es perfecto, pide mejoras específicas
3. **Prueba**: Siempre prueba la integración con el backend real
4. **Personaliza**: Ajusta el código generado según tus necesidades específicas

