# TeamTime Backend - Instrucciones de Instalación y Configuración

## Pre-requisitos

1. **Node.js** (versión 18.0.0 o superior)
2. **npm** o **yarn**
3. **PostgreSQL** (acceso a la base de datos ya configurada)

## Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
El archivo `.env` ya está configurado con los valores correctos para conectar a la base de datos TeamTime.

### 3. Generar el cliente de Prisma
```bash
npx prisma generate
```

### 4. Ejecutar migraciones
```bash
npx prisma migrate dev --name init
```

### 5. Poblar la base de datos (opcional)
```bash
npm run db:seed
```

## Comandos disponibles

### Desarrollo
```bash
npm run dev          # Iniciar servidor en modo desarrollo
npm start           # Iniciar servidor en modo producción
```

### Base de datos
```bash
npm run db:migrate    # Ejecutar migraciones
npm run db:seed      # Poblar base de datos
npm run db:studio    # Abrir Prisma Studio
npm run db:generate  # Generar cliente Prisma
npm run db:reset     # Resetear base de datos
```

### Testing
```bash
npm test            # Ejecutar tests
npm run test:watch  # Ejecutar tests en modo watch
npm run test:coverage # Ejecutar tests con coverage
```

### Linting y formateo
```bash
npm run lint        # Verificar código
npm run lint:fix    # Corregir problemas de linting
npm run format      # Formatear código
```

## Configuración de Base de Datos

La aplicación está configurada para conectarse a:
- **Host:** prescripto-db.einventiva.dev
- **Base de datos:** teamtimedb_dev
- **Usuario:** usrdbteamtime
- **Puerto:** 5432

## Estructura del Proyecto

```
src/
├── config/           # Configuraciones
├── controllers/      # Controladores HTTP
├── middleware/       # Middlewares de Express
├── repositories/     # Acceso a datos
├── routes/           # Definición de rutas
├── services/         # Lógica de negocio
├── utils/           # Utilidades
├── validators/       # Validadores Joi
└── server.js        # Punto de entrada
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Áreas
- `GET /api/areas` - Listar áreas
- `POST /api/areas` - Crear área
- `GET /api/areas/:id` - Obtener área
- `PUT /api/areas/:id` - Actualizar área
- `DELETE /api/areas/:id` - Eliminar área

### Proyectos
- `GET /api/projects` - Listar proyectos
- `POST /api/projects` - Crear proyecto
- `GET /api/projects/:id` - Obtener proyecto
- `PUT /api/projects/:id` - Actualizar proyecto
- `DELETE /api/projects/:id` - Eliminar proyecto

### Tareas
- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear tarea
- `GET /api/tasks/:id` - Obtener tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea

### Registros de Tiempo
- `GET /api/time-entries` - Listar registros
- `POST /api/time-entries` - Crear registro
- `GET /api/time-entries/:id` - Obtener registro
- `PUT /api/time-entries/:id` - Actualizar registro
- `DELETE /api/time-entries/:id` - Eliminar registro

## Primeros Pasos

1. Una vez instalado Node.js, ejecuta los comandos de instalación
2. La primera migración creará todas las tablas necesarias
3. Usa el seeder para crear datos de ejemplo
4. El servidor estará disponible en `http://localhost:3000`
5. La API estará en `http://localhost:3000/api`

## Verificación de Salud

- `GET /api/health` - Endpoint de verificación de estado del servicio
