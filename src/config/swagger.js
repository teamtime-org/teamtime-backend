const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Configuración básica de Swagger
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TeamTime API',
            version: '1.0.0',
            description: 'API REST para gestión de tiempo, proyectos y recursos humanos con sistema de roles jerárquico',
            contact: {
                name: 'TeamTime Development Team',
                email: 'desarrollo@teamtime.com',
                url: 'https://github.com/your-org/teamtime-backend'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Servidor de desarrollo'
            },
            {
                url: 'https://api.teamtime.com/api',
                description: 'Servidor de producción'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtenido del endpoint /auth/login'
                }
            },
            schemas: {
                // Esquemas de datos comunes
                Error: {
                    type: 'object',
                    required: ['success', 'message'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Descripción del error'
                        },
                        error: {
                            type: 'string',
                            example: 'VALIDATION_ERROR'
                        },
                        details: {
                            type: 'object',
                            properties: {
                                field: {
                                    type: 'string',
                                    example: 'email'
                                },
                                code: {
                                    type: 'string',
                                    example: 'INVALID_FORMAT'
                                }
                            }
                        }
                    }
                },
                Success: {
                    type: 'object',
                    required: ['success', 'message'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operación exitosa'
                        },
                        data: {
                            type: 'object',
                            description: 'Datos de respuesta específicos del endpoint'
                        }
                    }
                },
                User: {
                    type: 'object',
                    required: ['id', 'email', 'firstName', 'lastName', 'role'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'user-123'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'usuario@ejemplo.com'
                        },
                        firstName: {
                            type: 'string',
                            example: 'Juan'
                        },
                        lastName: {
                            type: 'string',
                            example: 'Pérez'
                        },
                        role: {
                            type: 'string',
                            enum: ['ADMINISTRADOR', 'COORDINADOR', 'COLABORADOR'],
                            example: 'COLABORADOR'
                        },
                        areaId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'area-456'
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        }
                    }
                },
                Area: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'area-123'
                        },
                        name: {
                            type: 'string',
                            example: 'Desarrollo'
                        },
                        description: {
                            type: 'string',
                            example: 'Área de desarrollo de software'
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        }
                    }
                },
                Project: {
                    type: 'object',
                    required: ['id', 'name', 'areaId'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'project-123'
                        },
                        name: {
                            type: 'string',
                            example: 'Sistema de Gestión'
                        },
                        description: {
                            type: 'string',
                            example: 'Desarrollo del sistema de gestión empresarial'
                        },
                        areaId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'area-456'
                        },
                        status: {
                            type: 'string',
                            enum: ['PLANIFICADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'],
                            example: 'EN_PROGRESO'
                        },
                        startDate: {
                            type: 'string',
                            format: 'date',
                            example: '2025-07-01'
                        },
                        endDate: {
                            type: 'string',
                            format: 'date',
                            example: '2025-12-31'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        }
                    }
                },
                Task: {
                    type: 'object',
                    required: ['id', 'title', 'projectId'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'task-123'
                        },
                        title: {
                            type: 'string',
                            example: 'Implementar autenticación JWT'
                        },
                        description: {
                            type: 'string',
                            example: 'Desarrollar sistema de autenticación con tokens JWT'
                        },
                        projectId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'project-456'
                        },
                        assignedUserId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'user-789'
                        },
                        status: {
                            type: 'string',
                            enum: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'],
                            example: 'EN_PROGRESO'
                        },
                        priority: {
                            type: 'string',
                            enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'],
                            example: 'ALTA'
                        },
                        estimatedHours: {
                            type: 'number',
                            format: 'float',
                            example: 8.5
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date',
                            example: '2025-07-10'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        }
                    }
                },
                TimeEntry: {
                    type: 'object',
                    required: ['id', 'taskId', 'userId', 'date', 'hours'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'entry-123'
                        },
                        taskId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'task-456'
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'user-789'
                        },
                        date: {
                            type: 'string',
                            format: 'date',
                            example: '2025-07-04'
                        },
                        hours: {
                            type: 'number',
                            format: 'float',
                            minimum: 0.1,
                            maximum: 24,
                            example: 4.5
                        },
                        description: {
                            type: 'string',
                            example: 'Desarrollo de funcionalidad X'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-04T10:30:00.000Z'
                        }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'usuario@ejemplo.com'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            example: 'contraseña123'
                        }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Autenticación exitosa'
                        },
                        data: {
                            type: 'object',
                            properties: {
                                user: {
                                    $ref: '#/components/schemas/User'
                                },
                                token: {
                                    type: 'string',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                                }
                            }
                        }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'firstName', 'lastName'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'nuevo@ejemplo.com'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
                            example: 'ContraseñaSegura123'
                        },
                        firstName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            example: 'María'
                        },
                        lastName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            example: 'García'
                        },
                        areaId: {
                            type: 'string',
                            format: 'uuid',
                            example: 'area-123'
                        }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Token de autenticación inválido o faltante',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Token de autenticación requerido',
                                error: 'UNAUTHORIZED'
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Permisos insuficientes para realizar la operación',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'No tienes permisos para realizar esta acción',
                                error: 'FORBIDDEN'
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Recurso no encontrado',
                                error: 'NOT_FOUND'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Error de validación en los datos enviados',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Error de validación',
                                error: 'VALIDATION_ERROR',
                                details: {
                                    field: 'email',
                                    code: 'INVALID_FORMAT'
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            {
                name: 'Autenticación',
                description: 'Endpoints de autenticación y gestión de sesiones'
            },
            {
                name: 'Usuarios',
                description: 'Gestión de usuarios del sistema'
            },
            {
                name: 'Áreas',
                description: 'Gestión de áreas organizacionales'
            },
            {
                name: 'Proyectos',
                description: 'Gestión de proyectos por área'
            },
            {
                name: 'Tareas',
                description: 'Gestión de tareas de proyectos'
            },
            {
                name: 'Registros de Tiempo',
                description: 'Gestión de registros de tiempo trabajado'
            },
            {
                name: 'Sistema',
                description: 'Endpoints de utilidades y salud del sistema'
            }
        ]
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../controllers/*.js'),
        path.join(__dirname, '../swagger-docs/*.yaml')
    ]
};

// Generar especificación de Swagger
const specs = swaggerJsdoc(options);

// Opciones de personalización de Swagger UI
const swaggerUiOptions = {
    customCss: `
    .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMmwtMyA5aDlsLTMtOXptMCAxNS41Yy0uNzMgMC0xLjQ4LS4xMS0yLjE5LS4zM2wtMS4xMSAyLjE5Yy45MS4zNSAxLjkuNTQgMi45LjU0czEuOTktLjE5IDIuOS0uNTRsLTEuMTEtMi4xOWMtLjcxLjIyLTEuNDYuMzMtMi4xOS4zM3ptLTQuMS00LjVjLS4zNi0uNzUtLjU5LTEuNTctLjY3LTIuNDNoLTQuMjNjLjEyIDEuNjYuNjIgMy4yIDEuNDIgNC41NWwzLjQ4LTIuMTJ6bTguMi0yLjVoLTQuMjNjLS4wOC44Ni0uMzEgMS42OC0uNjcgMi40M2wzLjQ4IDIuMTJjLjgtMS4zNSAxLjMtMi44OSAxLjQyLTQuNTV6Ii8+PC9zdmc+'); height: 40px; width: auto; }
    .swagger-ui .topbar { background-color: #2c3e50; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #2c3e50; }
  `,
    customSiteTitle: 'TeamTime API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true
    }
};

module.exports = {
    specs,
    swaggerUi,
    swaggerUiOptions
};
