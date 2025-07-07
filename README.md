# TeamTime Backend - Sistema de Gestión de Tiempo y Proyectos

## Descripción del Proyecto

TeamTime Backend es una API REST robusta desarrollada en Node.js para la gestión integral de tiempo, proyectos y recursos humanos. El sistema implementa un modelo de permisos jerárquico basado en roles (Administrador, Coordinador, Colaborador) con control de acceso por áreas organizacionales.

### Características Principales

- 🏗️ **Arquitectura en capas** con separación clara de responsabilidades
- 🔐 **Sistema de autenticación JWT** con roles y permisos granulares
- 📊 **Gestión completa** de usuarios, áreas, proyectos, tareas y registros de tiempo
- 🧪 **Suite completa de tests unitarios** (178 tests) con alta cobertura
- 📝 **Validación de datos** con Joi schemas
- 🗄️ **ORM Prisma** para acceso type-safe a PostgreSQL
- 📋 **Logging estructurado** con Winston
- 🔄 **Middleware personalizado** para autenticación y manejo de errores

## Especificación Técnica

### Stack Tecnológico

- **Runtime:** Node.js 18.0.0+
- **Framework:** Express.js 4.x
- **Base de Datos:** PostgreSQL 13+
- **ORM:** Prisma 5.x
- **Autenticación:** JSON Web Tokens (JWT)
- **Validación:** Joi
- **Testing:** Jest + Supertest
- **Logging:** Winston
- **Hash de contraseñas:** bcrypt

### Arquitectura del Sistema

```
TeamTime Backend Architecture
├── Presentation Layer (Controllers)
├── Business Logic Layer (Services)
├── Data Access Layer (Repositories)
├── Database Layer (PostgreSQL + Prisma)
└── Cross-cutting Concerns (Auth, Validation, Logging)
```

### Pre-requisitos

1. **Node.js** (versión 18.0.0 o superior)
2. **npm** o **yarn**
3. **PostgreSQL** (versión 13.0 o superior)
4. **Git** para control de versiones

## Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/your-org/teamtime-backend.git
cd teamtime-backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

**⚠️ IMPORTANTE:** Nunca commitear el archivo `.env` con datos reales. Siempre usar `.env.example` como plantilla.

Variables principales:
```env
# Base de datos
DATABASE_URL="postgresql://username:password@hostname:5432/database_name"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Servidor
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

> **Nota de Seguridad:** Las credenciales reales de base de datos y secrets deben configurarse mediante variables de entorno seguras en cada ambiente (desarrollo, staging, producción).

### 4. Configurar base de datos
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Poblar base de datos (opcional)
npm run db:seed
```

### 5. Verificar instalación
```bash
# Ejecutar tests
npm test

# Iniciar servidor de desarrollo
npm run dev
```

## Comandos Disponibles

### Desarrollo
```bash
npm run dev          # Iniciar servidor en modo desarrollo con hot-reload
npm start           # Iniciar servidor en modo producción
npm run dev:debug   # Iniciar con debugger de Node.js
```

### Base de datos
```bash
npm run db:migrate    # Ejecutar migraciones pendientes
npm run db:seed      # Poblar base de datos con datos de ejemplo
npm run db:studio    # Abrir Prisma Studio (GUI para BD)
npm run db:generate  # Generar cliente Prisma actualizado
npm run db:reset     # Resetear base de datos completamente
npm run db:deploy    # Aplicar migraciones en producción
```

### Testing
```bash
npm test                    # Ejecutar suite completa de tests
npm run test:watch         # Ejecutar tests en modo watch
npm run test:coverage      # Ejecutar tests con reporte de cobertura
npm run test:unit          # Ejecutar solo tests unitarios
npm run test:integration   # Ejecutar tests de integración
npm run test:services      # Ejecutar tests de servicios específicamente
npm run test:controllers   # Ejecutar tests de controladores
```

### Calidad de código
```bash
npm run lint        # Verificar código con ESLint
npm run lint:fix    # Corregir automáticamente problemas de linting
npm run format      # Formatear código con Prettier
npm run type-check  # Verificar tipos (si usando TypeScript)
```

### Utilidades
```bash
npm run logs        # Ver logs de la aplicación
npm run clean       # Limpiar archivos temporales y cache
npm run build       # Construir para producción (si aplica)
```

## Configuración de Base de Datos

### Conexión Principal
- **Host:** Configurar en variables de entorno
- **Base de datos:** Configurar en variables de entorno
- **Usuario:** Configurar en variables de entorno
- **Puerto:** 5432 (estándar PostgreSQL)
- **SSL:** Requerido en producción

### Variables de Entorno Requeridas
```env
DATABASE_URL="postgresql://username:password@hostname:5432/database_name"
```

### Schema Principal
```sql
-- Tablas principales
areas               # Áreas organizacionales
users               # Usuarios del sistema
projects            # Proyectos por área
tasks               # Tareas de proyectos
time_entries        # Registros de tiempo
```

### Migraciones
El sistema utiliza Prisma Migrate para gestión de esquema:
- Migraciones versionadas en `/prisma/migrations/`
- Schema definido en `/prisma/schema.prisma`
- Seeder disponible en `/prisma/seed.js`

## Arquitectura del Proyecto

### Estructura de Directorios
```
teamtime-backend/
├── prisma/                 # Configuración de base de datos
│   ├── schema.prisma      # Schema de base de datos
│   ├── seed.js           # Datos iniciales
│   └── migrations/       # Migraciones versionadas
├── src/                   # Código fuente principal
│   ├── config/           # Configuraciones (DB, JWT, etc.)
│   ├── controllers/      # Controladores HTTP (req/res)
│   ├── middleware/       # Middlewares de Express
│   ├── repositories/     # Acceso a datos (Prisma)
│   ├── routes/          # Definición de rutas de API
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades (logger, constantes)
│   ├── validators/      # Validadores Joi
│   └── server.js        # Punto de entrada de la aplicación
├── tests/                # Suite completa de tests
│   ├── controllers/     # Tests de controladores
│   ├── middleware/      # Tests de middlewares
│   ├── services/        # Tests de servicios (lógica negocio)
│   ├── setup.js         # Configuración global de tests
│   └── app.test.js      # Tests de integración
├── logs/                 # Archivos de log
├── coverage/            # Reportes de cobertura de tests
├── jest.config.json     # Configuración de Jest
├── package.json         # Dependencias y scripts
└── README.md           # Documentación
```

### Patrón de Arquitectura en Capas

#### 1. **Capa de Presentación (Controllers)**
- Manejo de requests/responses HTTP
- Validación inicial de datos
- Transformación de datos para respuesta
- Manejo de errores HTTP

#### 2. **Capa de Lógica de Negocio (Services)**
- Implementación de reglas de negocio
- Validación de permisos y autorización
- Coordinación entre repositorios
- Lógica de validación compleja

#### 3. **Capa de Acceso a Datos (Repositories)**
- Interacción directa con base de datos
- Queries optimizadas con Prisma
- Transformación de datos de BD
- Manejo de transacciones

#### 4. **Capa de Datos (Database)**
- PostgreSQL con Prisma ORM
- Migraciones versionadas
- Índices optimizados
- Constraints de integridad

### Componentes Transversales

#### **Middleware Stack**
```javascript
// Stack de middlewares globales
app.use(cors())                    // CORS policy
app.use(express.json())            // JSON parser
app.use(morgan('combined'))        // HTTP logging
app.use('/api', routes)            // API routes
app.use(errorHandler)              // Error handling
```

#### **Sistema de Autenticación**
- JWT tokens con expiración configurable
- Middleware de autenticación reutilizable
- Control de acceso basado en roles (RBAC)
- Validación de permisos por área

#### **Logging Estructurado**
```javascript
// Configuración de Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});
```

## Sistema de Roles y Permisos

### Jerarquía de Roles

#### **ADMINISTRADOR**
- Acceso completo a todas las funcionalidades
- Gestión de áreas, usuarios y configuración global
- Supervisión de todos los proyectos y registros de tiempo
- Permisos de lectura/escritura en toda la aplicación

#### **COORDINADOR**
- Gestión de usuarios en su área asignada
- Creación y supervisión de proyectos de su área
- Asignación de tareas a colaboradores
- Visualización de registros de tiempo de su área

#### **COLABORADOR**
- Gestión de sus propios registros de tiempo
- Actualización de estado de tareas asignadas
- Visualización de proyectos de su área
- Edición limitada de su perfil

### Control de Acceso por Área

```javascript
// Ejemplo de validación de permisos
const canUserAccessProject = (user, project) => {
  if (user.role === 'ADMINISTRADOR') return true;
  if (user.role === 'COORDINADOR' && user.areaId === project.areaId) return true;
  if (user.role === 'COLABORADOR' && user.areaId === project.areaId) return true;
  return false;
};
```

## API Documentation

### Base URL
```
Desarrollo: http://localhost:3000/api
Producción: https://your-domain.com/api
```

### Autenticación
Todas las rutas (excepto register/login) requieren header de autorización:
```
Authorization: Bearer <jwt-token>
```

### Endpoints por Módulo

#### **Autenticación y Perfil**
```http
POST   /api/auth/register           # Registrar nuevo usuario
POST   /api/auth/login              # Iniciar sesión (retorna JWT)
GET    /api/auth/profile            # Obtener perfil del usuario autenticado
PUT    /api/auth/profile            # Actualizar perfil propio
POST   /api/auth/change-password    # Cambiar contraseña
POST   /api/auth/logout             # Cerrar sesión (invalidar token)
```

#### **Gestión de Usuarios** 
```http
GET    /api/users                   # Listar usuarios (con filtros y paginación)
POST   /api/users                   # Crear nuevo usuario [ADMIN/COORD]
GET    /api/users/:id               # Obtener usuario específico
PUT    /api/users/:id               # Actualizar usuario [ADMIN/COORD]
DELETE /api/users/:id               # Eliminar usuario [ADMIN]
PATCH  /api/users/:id/toggle-status # Activar/desactivar usuario [ADMIN]
GET    /api/users/stats             # Estadísticas de usuarios [ADMIN]
```

#### **Gestión de Áreas**
```http
GET    /api/areas                   # Listar áreas
POST   /api/areas                   # Crear nueva área [ADMIN]
GET    /api/areas/:id               # Obtener área específica
PUT    /api/areas/:id               # Actualizar área [ADMIN]
DELETE /api/areas/:id               # Eliminar área [ADMIN]
GET    /api/areas/:id/users         # Usuarios de un área
GET    /api/areas/:id/projects      # Proyectos de un área
```

#### **Gestión de Proyectos**
```http
GET    /api/projects                # Listar proyectos (filtrados por área)
POST   /api/projects                # Crear nuevo proyecto [ADMIN/COORD]
GET    /api/projects/:id            # Obtener proyecto específico
PUT    /api/projects/:id            # Actualizar proyecto [ADMIN/COORD]
DELETE /api/projects/:id            # Eliminar proyecto [ADMIN/COORD]
GET    /api/projects/:id/tasks      # Tareas de un proyecto
GET    /api/projects/:id/time-entries # Registros de tiempo del proyecto
```

#### **Gestión de Tareas**
```http
GET    /api/tasks                   # Listar tareas (filtradas por permisos)
POST   /api/tasks                   # Crear nueva tarea [ADMIN/COORD]
GET    /api/tasks/:id               # Obtener tarea específica
PUT    /api/tasks/:id               # Actualizar tarea [ADMIN/COORD/OWNER]
DELETE /api/tasks/:id               # Eliminar tarea [ADMIN/COORD]
PATCH  /api/tasks/:id/status        # Cambiar estado de tarea
POST   /api/tasks/:id/assign        # Asignar tarea a usuario [ADMIN/COORD]
GET    /api/tasks/user/:userId      # Tareas asignadas a usuario
```

#### **Registros de Tiempo**
```http
GET    /api/time-entries            # Listar registros (filtrados por permisos)
POST   /api/time-entries            # Crear registro de tiempo
GET    /api/time-entries/:id        # Obtener registro específico
PUT    /api/time-entries/:id        # Actualizar registro [OWNER/ADMIN/COORD]
DELETE /api/time-entries/:id        # Eliminar registro [OWNER/ADMIN/COORD]
GET    /api/time-entries/user/:userId/date/:date # Registros por usuario/fecha
GET    /api/time-entries/reports    # Reportes de tiempo [ADMIN/COORD]
```

#### **Utilidades y Sistema**
```http
GET    /api/health                  # Health check del servicio
GET    /api/version                 # Versión de la API
GET    /api/stats                   # Estadísticas generales [ADMIN]
```

### Formatos de Request/Response

#### **Autenticación - Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}

# Response
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "user": {
      "id": "user-123",
      "email": "usuario@ejemplo.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "COLABORADOR",
      "areaId": "area-456"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **Crear Registro de Tiempo**
```http
POST /api/time-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "task-123",
  "userId": "user-456",
  "date": "2025-07-04",
  "hours": 4.5,
  "description": "Desarrollo de funcionalidad X"
}

# Response
{
  "success": true,
  "message": "Registro de tiempo creado exitosamente",
  "data": {
    "id": "entry-789",
    "taskId": "task-123",
    "userId": "user-456",
    "date": "2025-07-04T00:00:00.000Z",
    "hours": 4.5,
    "description": "Desarrollo de funcionalidad X",
    "createdAt": "2025-07-04T10:30:00.000Z"
  }
}
```

#### **Error Response Format**
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "code": "INVALID_FORMAT"
  }
}
```

## Testing y Quality Assurance

### Suite de Tests Unitarios

El proyecto incluye **178 tests unitarios** organizados por módulos:

```bash
# Estadísticas de testing
Test Suites: 8 passed, 8 total
Tests:       178 passed, 178 total
Coverage:    High coverage en lógica de negocio crítica
```

#### **Tests por Módulo:**
- **AreaService:** 11 tests - CRUD, permisos, validaciones
- **UserService:** 15 tests - autenticación, gestión, permisos
- **ProjectService:** 17 tests - lifecycle, control de acceso
- **TaskService:** 41 tests - gestión completa, estados, asignaciones
- **TimeEntryService:** 53 tests - registros, validaciones, límites
- **UserController:** 18 tests - endpoints, manejo de errores
- **AuthMiddleware:** 20 tests - autenticación, autorización
- **Integration:** 3 tests - health checks, endpoints básicos

#### **Características de Testing:**
- ✅ **Mocking completo** de dependencias externas (Prisma, bcrypt, JWT)
- ✅ **Validación de permisos** por roles y áreas
- ✅ **Casos edge** y manejo de errores
- ✅ **Lógica de negocio** crítica cubierta
- ✅ **Tests en español** para mantenibilidad

#### **Ejecutar Tests:**
```bash
npm test                    # Suite completa
npm run test:coverage      # Con reporte de cobertura
npm run test:watch         # Modo desarrollo
npm run test:services      # Solo servicios
npm run test:controllers   # Solo controladores
```

### Validación de Código

#### **ESLint Configuration**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'node',
    'prettier'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error'
  }
};
```

#### **Prettier Configuration**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## Performance y Optimización

### Base de Datos
- **Índices optimizados** en campos de búsqueda frecuente
- **Queries eficientes** con Prisma ORM
- **Lazy loading** para relaciones complejas
- **Connection pooling** configurado

### Caching Strategy
```javascript
// Redis para cache (configuración futura)
const cacheConfig = {
  ttl: 300, // 5 minutos
  keys: ['user-sessions', 'project-data', 'area-stats']
};
```

### Monitoring y Logging
- **Winston** para logging estructurado
- **Morgan** para logs HTTP
- **Error tracking** centralizado
- **Performance metrics** disponibles

## Seguridad

### Autenticación y Autorización
- **JWT tokens** con expiración configurable
- **bcrypt** para hash de contraseñas (salt rounds: 12)
- **CORS** configurado para origins permitidos
- **Rate limiting** implementado

### Validación de Datos
```javascript
// Ejemplo de validador Joi
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('ADMINISTRADOR', 'COORDINADOR', 'COLABORADOR')
});
```

### Headers de Seguridad
- **helmet.js** para headers HTTP seguros
- **express-rate-limit** para prevenir ataques
- **express-validator** para sanitización
- **SQL injection** prevención vía Prisma ORM

### Manejo de Secretos y Configuración
- **Variables de entorno** para todas las credenciales
- **Archivo .env** excluido del control de versiones (.gitignore)
- **Rotación de JWT secrets** en producción
- **Encriptación de datos sensibles** en base de datos
- **Logs sin información sensible** (passwords, tokens)

```javascript
// Ejemplo de configuración segura
const config = {
  database: {
    url: process.env.DATABASE_URL, // Nunca hardcodear
  },
  jwt: {
    secret: process.env.JWT_SECRET, // Rotar periódicamente
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};
```

## Deployment

### Configuración de Producción

#### **Variables de Entorno (Producción)**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@prod-hostname:5432/database_name
JWT_SECRET=super-secure-production-secret-key
LOG_LEVEL=warn
CORS_ORIGIN=https://your-domain.com
```

#### **Docker Configuration**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

#### **Process Manager (PM2)**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'teamtime-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: echo "Deploying to production"
```

## Contribución y Desarrollo

### Flujo de Desarrollo
1. **Fork** del repositorio
2. **Branch** desde `develop`: `git checkout -b feature/nueva-funcionalidad`
3. **Desarrollo** con tests incluidos
4. **Pull Request** con descripción detallada
5. **Code Review** requerido antes de merge

### Estándares de Código
- **Commits** siguiendo [Conventional Commits](https://www.conventionalcommits.org/)
- **Tests** obligatorios para nueva funcionalidad
- **Documentación** actualizada en README
- **ESLint** sin errores ni warnings

### Branch Strategy
```
main        # Producción
├── develop # Desarrollo activo
├── feature/* # Nuevas funcionalidades
├── bugfix/*  # Corrección de bugs
└── hotfix/*  # Fixes urgentes de producción
```

## Troubleshooting

### Problemas Comunes

#### **Error de Conexión a BD**
```bash
# Verificar conexión
npx prisma db pull

# Regenerar cliente
npx prisma generate

# Reset completo
npm run db:reset
```

#### **Tests Failing**
```bash
# Limpiar cache de Jest
npm test -- --clearCache

# Ejecutar tests específicos
npm test -- tests/services/user.service.test.js

# Debug mode
npm test -- --verbose --detectOpenHandles
```

#### **JWT Token Issues**
```javascript
// Verificar configuración JWT
console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
```

### Logs de Debug
```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Logs de error específicos
grep ERROR logs/app.log

# Logs por nivel
LOG_LEVEL=debug npm run dev
```

## Roadmap y Futuras Mejoras

### Próximas Funcionalidades
- [ ] **Notificaciones en tiempo real** (WebSockets)
- [ ] **Sistema de reportes avanzados** (PDF/Excel)
- [ ] **API de integración** con herramientas externas
- [ ] **Dashboard de analytics** en tiempo real
- [ ] **Sistema de backup automático**

### Optimizaciones Técnicas
- [ ] **Redis caching** para mejor performance
- [ ] **Microservicios** para escalabilidad
- [ ] **GraphQL** como alternativa a REST
- [ ] **Elasticsearch** para búsquedas avanzadas
- [ ] **Docker containers** para deployment

### Mejoras de UX/DX
- [ ] **Swagger/OpenAPI** documentation
- [ ] **Postman collections** automáticas
- [ ] **SDK cliente** para JavaScript/Python
- [ ] **Webhooks** para integraciones
- [ ] **CLI tools** para administración

## Recursos Adicionales

### Documentación Técnica
- [TESTING_SUMMARY.md](./TESTING_SUMMARY.md) - Documentación completa de tests
- [API_DOCS.md](./docs/API_DOCS.md) - Documentación detallada de API
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Guía de despliegue
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía de contribución

### Enlaces Útiles
- **Prisma Docs:** https://www.prisma.io/docs/
- **Jest Testing:** https://jestjs.io/docs/getting-started
- **Express.js:** https://expressjs.com/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices

### Soporte
- **Issues:** [GitHub Issues](https://github.com/your-org/teamtime-backend/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/teamtime-backend/discussions)
- **Email:** desarrollo@your-domain.com

---

## Licencia

Este proyecto está licenciado bajo la [MIT License](./LICENSE).

## Changelog

### v1.0.0 (2025-07-04)
- ✅ **Implementación inicial** de API REST completa
- ✅ **Sistema de autenticación** JWT con roles
- ✅ **Suite de tests unitarios** (178 tests)
- ✅ **Documentación completa** de API y arquitectura
- ✅ **Base de datos** PostgreSQL con Prisma ORM
- ✅ **Middleware de seguridad** y validación

---

**TeamTime Backend** - Sistema robusto y escalable para gestión de tiempo y proyectos empresariales.
