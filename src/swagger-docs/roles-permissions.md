# Documentación de Roles y Permisos - TeamTime API

## Sistema de Roles Jerárquico

La API de TeamTime implementa un sistema de roles jerárquico con tres niveles:

### ADMINISTRADOR
- **Alcance completo**: Acceso a todos los recursos del sistema
- **Gestión de usuarios**: Crear, editar, activar/desactivar usuarios
- **Gestión de áreas**: CRUD completo de áreas organizacionales
- **Supervisión global**: Ver todos los proyectos, tareas y registros de tiempo
- **Estadísticas**: Acceso a todas las métricas y reportes del sistema

### COORDINADOR
- **Alcance por área**: Acceso limitado a su área asignada
- **Gestión de equipo**: Crear y gestionar usuarios de su área
- **Gestión de proyectos**: CRUD de proyectos en su área
- **Asignación de tareas**: Crear y asignar tareas a colaboradores
- **Supervisión de área**: Ver registros de tiempo de su área

### COLABORADOR
- **Alcance personal**: Solo puede gestionar sus propios recursos
- **Registros de tiempo**: CRUD de sus registros de tiempo
- **Tareas asignadas**: Ver y actualizar estado de sus tareas
- **Perfil propio**: Editar información de perfil limitada

## Control de Acceso por Endpoints

### Endpoints Públicos (sin autenticación)
- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Autenticación
- `GET /health` - Health check del sistema
- `GET /api/docs` - Documentación Swagger

### Endpoints Protegidos (requieren autenticación)

#### Solo ADMINISTRADOR
- `GET /users/stats` - Estadísticas de usuarios
- `DELETE /users/:id` - Eliminar usuarios
- `POST /areas` - Crear áreas
- `PUT /areas/:id` - Actualizar áreas
- `DELETE /areas/:id` - Eliminar áreas

#### ADMINISTRADOR + COORDINADOR
- `POST /users` - Crear usuarios
- `GET /users` - Listar usuarios (filtrado por área para coordinadores)
- `PUT /users/:id` - Actualizar usuarios
- `POST /projects` - Crear proyectos
- `PUT /projects/:id` - Actualizar proyectos
- `DELETE /projects/:id` - Eliminar proyectos
- `POST /tasks` - Crear tareas
- `PUT /tasks/:id` - Actualizar tareas (si es de su área)
- `DELETE /tasks/:id` - Eliminar tareas

#### Todos los usuarios autenticados
- `GET /auth/profile` - Ver perfil propio
- `PUT /auth/profile` - Actualizar perfil propio
- `POST /auth/change-password` - Cambiar contraseña
- `POST /auth/logout` - Cerrar sesión
- `GET /areas` - Listar áreas
- `GET /areas/:id` - Ver área específica
- `GET /projects` - Listar proyectos (filtrado por área)
- `GET /projects/:id` - Ver proyecto específico
- `GET /tasks` - Listar tareas (filtrado por permisos)
- `GET /tasks/:id` - Ver tarea específica
- `PUT /tasks/:id` - Actualizar tarea propia
- `POST /time-entries` - Crear registro de tiempo
- `GET /time-entries` - Listar registros (filtrado por permisos)
- `GET /time-entries/:id` - Ver registro específico
- `PUT /time-entries/:id` - Actualizar registro propio
- `DELETE /time-entries/:id` - Eliminar registro propio

## Filtrado de Datos por Permisos

### Usuarios
- **ADMINISTRADOR**: Ve todos los usuarios
- **COORDINADOR**: Ve solo usuarios de su área
- **COLABORADOR**: Ve solo su propio perfil

### Proyectos
- **ADMINISTRADOR**: Ve todos los proyectos
- **COORDINADOR**: Ve solo proyectos de su área
- **COLABORADOR**: Ve solo proyectos de su área

### Tareas
- **ADMINISTRADOR**: Ve todas las tareas
- **COORDINADOR**: Ve tareas de proyectos de su área
- **COLABORADOR**: Ve solo tareas asignadas a él

### Registros de Tiempo
- **ADMINISTRADOR**: Ve todos los registros
- **COORDINADOR**: Ve registros de usuarios de su área
- **COLABORADOR**: Ve solo sus propios registros

## Headers de Autenticación

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <jwt-token>
```

El token se obtiene del endpoint `POST /auth/login` y debe incluirse en todas las peticiones subsecuentes.

## Códigos de Error de Autorización

- **401 Unauthorized**: Token faltante, inválido o expirado
- **403 Forbidden**: Token válido pero permisos insuficientes
- **404 Not Found**: Recurso no existe o sin permisos para verlo

## Validación de Permisos

La validación se realiza en múltiples niveles:

1. **Middleware de autenticación**: Verifica token JWT válido
2. **Middleware de roles**: Verifica rol mínimo requerido
3. **Lógica de servicio**: Filtra datos según área de usuario
4. **Validación de recursos**: Verifica ownership de recursos específicos

## Ejemplos de Uso

### Obtener token de autenticación
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@telecomcorp.com", "password": "password123"}'
```

### Usar token en petición protegida
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Crear registro de tiempo
```bash
curl -X POST http://localhost:3000/api/time-entries \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-123",
    "date": "2025-07-04",
    "hours": 4.5,
    "description": "Desarrollo de funcionalidad"
  }'
```
