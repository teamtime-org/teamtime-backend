# Guía de Uso de la API TeamTime con Swagger

## Acceso a la Documentación

### Swagger UI (Recomendado)
La interfaz interactiva de Swagger está disponible en:
```
http://localhost:3000/api/docs
```

### Especificación OpenAPI
- **JSON**: http://localhost:3000/api/docs.json
- **YAML**: Archivo disponible en `/src/docs/openapi.yaml`

## Primeros Pasos

### 1. Explorar la Documentación
1. Abre http://localhost:3000/api/docs en tu navegador
2. Verás todos los endpoints organizados por módulos:
   - **Autenticación**: Login, registro, perfil
   - **Usuarios**: Gestión de usuarios
   - **Áreas**: Gestión de áreas organizacionales
   - **Proyectos**: Gestión de proyectos
   - **Tareas**: Gestión de tareas
   - **Registros de Tiempo**: Gestión de tiempo trabajado
   - **Sistema**: Health checks y utilidades

### 2. Autenticación
Para usar la mayoría de endpoints, necesitas autenticarte:

1. **Expandir el endpoint** `POST /auth/login`
2. **Hacer clic en "Try it out"**
3. **Llenar el ejemplo** con credenciales válidas:
   ```json
   {
     "email": "admin@teamtime.com",
     "password": "admin123"
   }
   ```
4. **Ejecutar** haciendo clic en "Execute"
5. **Copiar el token** de la respuesta
6. **Hacer clic en "Authorize"** (candado en la parte superior)
7. **Pegar el token** en el formato: `Bearer <tu-token>`
8. **Hacer clic en "Authorize"**

### 3. Probar Endpoints
Una vez autenticado, puedes probar cualquier endpoint:

1. **Expandir el endpoint** que quieres probar
2. **Hacer clic en "Try it out"**
3. **Llenar los parámetros** requeridos
4. **Ejecutar** y ver la respuesta

## Ejemplos Prácticos

### Registrar un Nuevo Usuario
```bash
POST /auth/register
{
  "email": "nuevo@ejemplo.com",
  "password": "ContraseñaSegura123",
  "firstName": "María",
  "lastName": "García",
  "areaId": "area-123"
}
```

### Crear un Registro de Tiempo
```bash
POST /time-entries
{
  "taskId": "task-123",
  "date": "2025-07-04",
  "hours": 4.5,
  "description": "Desarrollo de funcionalidad X"
}
```

### Obtener Estadísticas de Tiempo
```bash
GET /time-entries/stats?startDate=2025-07-01&endDate=2025-07-04
```

## Funcionalidades de Swagger UI

### Exploración de Esquemas
- **Modelos**: Ve todos los esquemas de datos en la sección "Schemas"
- **Ejemplos**: Cada esquema incluye ejemplos de datos
- **Validaciones**: Ve las reglas de validación para cada campo

### Pruebas Interactivas
- **Try it out**: Ejecuta peticiones reales contra la API
- **Autorización persistente**: El token se guarda durante la sesión
- **Respuestas en tiempo real**: Ve las respuestas exactas de la API
- **Códigos de estado**: Entiende qué significa cada código de respuesta

### Filtros y Búsqueda
- **Filtrar por tag**: Usa la barra lateral para navegar por módulos
- **Buscar endpoints**: Usa Ctrl+F para buscar endpoints específicos
- **Colapsar/expandir**: Organiza la vista según tus necesidades

## Códigos de Respuesta Importantes

### Éxito
- **200 OK**: Operación exitosa
- **201 Created**: Recurso creado exitosamente

### Errores de Cliente
- **400 Bad Request**: Error de validación en los datos
- **401 Unauthorized**: Token faltante o inválido
- **403 Forbidden**: Permisos insuficientes
- **404 Not Found**: Recurso no encontrado

### Errores de Servidor
- **500 Internal Server Error**: Error interno del servidor

## Roles y Permisos

### ADMINISTRADOR
- Acceso completo a todos los endpoints
- Puede gestionar usuarios, áreas y ver todas las estadísticas

### COORDINADOR
- Acceso a endpoints de su área
- Puede gestionar usuarios de su área y ver estadísticas limitadas

### COLABORADOR
- Acceso limitado a sus propios recursos
- Puede gestionar sus registros de tiempo y perfil

## Tips para Desarrolladores

### 1. Usar el Token de Autorización
- Siempre autorízate primero usando el botón "Authorize"
- El token se mantiene durante toda la sesión de navegación

### 2. Validar Datos
- Lee las validaciones en cada esquema antes de enviar datos
- Los campos requeridos están marcados con asterisco (*)

### 3. Manejar Errores
- Revisa los posibles códigos de error en cada endpoint
- Los errores 400 incluyen detalles específicos sobre validaciones

### 4. Filtros y Paginación
- Muchos endpoints GET soportan paginación (page, limit)
- Usa filtros para obtener datos específicos

### 5. Fechas y Formato
- Las fechas deben estar en formato ISO (YYYY-MM-DD)
- Los UUIDs deben seguir el formato estándar

## Integración con Herramientas Externas

### Postman
1. Exporta la especificación OpenAPI desde /api/docs.json
2. Importa en Postman como colección
3. Configura las variables de entorno necesarias

### Cliente HTTP (VS Code)
```http
### Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@teamtime.com",
  "password": "admin123"
}

### Usar token en siguiente petición
GET http://localhost:3000/api/users
Authorization: Bearer {{token}}
```

### curl
```bash
# Login y obtener token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teamtime.com","password":"admin123"}' \
  | jq -r '.data.token')

# Usar token en petición
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## Solución de Problemas

### Error 401: Unauthorized
- Verifica que hayas incluido el token de autorización
- Asegúrate de que el token no haya expirado (24h por defecto)

### Error 403: Forbidden
- Tu rol no tiene permisos para este endpoint
- Contacta al administrador para revisar permisos

### Error 404: Not Found
- Verifica que el endpoint existe
- Revisa que los IDs en la URL sean correctos

### Error 400: Bad Request
- Revisa la documentación del esquema para campos requeridos
- Verifica el formato de los datos (emails, fechas, UUIDs)

## Recursos Adicionales

- **Documentación de OpenAPI**: https://swagger.io/docs/
- **Especificación OpenAPI 3.0**: https://spec.openapis.org/oas/v3.0.3
- **Repositorio del proyecto**: https://github.com/your-org/teamtime-backend

---

¿Necesitas ayuda? Contacta al equipo de desarrollo en desarrollo@teamtime.com
