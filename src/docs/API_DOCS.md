# TeamTime API Documentation

## Descripción

Esta documentación describe la API REST de TeamTime, un sistema de gestión de tiempo y proyectos empresariales.

## Información de la API

- **Versión**: 1.0.0
- **Título**: TeamTime API
- **Descripción**: API REST para gestión de tiempo, proyectos y recursos humanos con sistema de roles jerárquico

## Servidores

- **Servidor de desarrollo**: http://localhost:3000/api
- **Servidor de producción**: https://api.teamtime.com/api

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Para acceder a endpoints protegidos:

1. Obtén un token mediante `POST /auth/login`
2. Incluye el token en el header de autorización: `Authorization: Bearer <token>`

## Módulos de la API

### Autenticación
Endpoints de autenticación y gestión de sesiones

### Usuarios
Gestión de usuarios del sistema

### Áreas
Gestión de áreas organizacionales

### Proyectos
Gestión de proyectos por área

### Tareas
Gestión de tareas de proyectos

### Registros de Tiempo
Gestión de registros de tiempo trabajado

### Sistema
Endpoints de utilidades y salud del sistema

## Esquemas de Datos

Los siguientes esquemas están disponibles en la API:

- `Error`
- `Success`
- `User`
- `Area`
- `Project`
- `Task`
- `TimeEntry`
- `LoginRequest`
- `LoginResponse`
- `RegisterRequest`

## Códigos de Respuesta Comunes

- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Error de validación en la petición
- **401**: Token de autenticación requerido o inválido
- **403**: Permisos insuficientes
- **404**: Recurso no encontrado
- **500**: Error interno del servidor

## Enlaces Útiles

- [Documentación Interactiva (Swagger UI)](http://localhost:3000/api/docs)
- [Especificación OpenAPI (JSON)](http://localhost:3000/api/docs.json)
- [Repositorio del Proyecto](https://github.com/your-org/teamtime-backend)

## Contacto

- **Email**: desarrollo@teamtime.com
- **URL**: https://github.com/your-org/teamtime-backend

---

Generado automáticamente el 7/7/2025, 23:31:37
