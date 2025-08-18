const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const SystemConfigService = require('./services/systemConfig.service');

/**
 * Crear aplicación Express
 */
const app = express();

/**
 * Configurar middlewares de seguridad
 */
if (config.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
} else {
    // Configuración más permisiva para desarrollo - deshabilitar CSP completamente
    app.use(helmet({
        contentSecurityPolicy: false, // Deshabilitar CSP completamente en desarrollo
        hsts: false, // Deshabilitar HSTS en desarrollo
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false
    }));
}

/**
 * Configurar CORS
 */
app.use(cors({
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',') : [
        'http://localhost:3000',  // React por defecto
        'http://localhost:5173',  // Vite por defecto
        'http://localhost:4173',  // Vite preview
        'http://localhost:3001',  // Alternativo común
        'http://127.0.0.1:5173',  // Localhost alias
        'http://127.0.0.1:3000'   // Localhost alias
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Disposition'] // Para descargas de archivos
}));

/**
 * Configurar sesiones para manejo temporal de reportes
 */
app.use(session({
    secret: config.JWT_SECRET || 'temp-session-secret-for-error-reports',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 minutos - suficiente para descargar reportes
    }
}));

/**
 * Rate limiting (excluir documentación en desarrollo)
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // límite de 100 requests por ventana por IP
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // En desarrollo, excluir rutas de documentación del rate limiting
        if (config.NODE_ENV !== 'production') {
            return req.path.startsWith('/api/docs') || req.path.startsWith('/swagger-ui-assets');
        }
        return false;
    }
});

app.use('/api', limiter);

/**
 * Middlewares de parseo y compresión
 */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging de requests
 */
if (config.NODE_ENV === 'production') {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
} else {
    app.use(morgan('dev'));
}

/**
 * Configuración de Swagger UI para documentación de API
 */
app.use('/api/docs', (req, res, next) => {
    // Headers específicos para Safari y otros navegadores
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Forzar protocolo HTTP en desarrollo
    if (config.NODE_ENV !== 'production') {
        res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https:; img-src 'self' data: http: https:; style-src 'self' 'unsafe-inline' http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:;");
    }
    next();
}, swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

/**
 * Endpoint para obtener especificación OpenAPI en formato JSON
 */
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(specs);
});

/**
 * Endpoint de salud para verificar estado del servidor
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        data: {
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: config.NODE_ENV,
            version: '1.0.0'
        }
    });
});

/**
 * Servir assets de Swagger UI de forma local para evitar problemas SSL
 */
if (config.NODE_ENV !== 'production') {
    const path = require('path');
    const swaggerUiAssetPath = path.dirname(require.resolve('swagger-ui-dist/package.json'));
    app.use('/swagger-ui-assets', express.static(swaggerUiAssetPath));

    // Ruta alternativa para Safari con HTML personalizado
    app.get('/api/docs-safari', (req, res) => {
        const fs = require('fs');
        const htmlPath = path.join(__dirname, 'views', 'swagger-custom.html');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(htmlPath);
    });
}

/**
 * Rutas de la aplicación
 */
app.use('/api', routes);

/**
 * Ruta raíz
 */
app.get('/', (req, res) => {
    res.json({
        message: 'TeamTime API',
        version: '1.0.0',
        status: 'running',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

/**
 * Middleware de manejo de errores (debe ir al final)
 */
app.use(errorHandler);

/**
 * Manejar rutas no encontradas
 */
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

/**
 * Manejo de errores no capturados
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

/**
 * Inicializar configuraciones del sistema
 */
const initializeSystemConfigs = async () => {
    try {
        const systemConfigService = new SystemConfigService();
        
        // Buscar un usuario administrador para inicializar configuraciones
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMINISTRADOR' }
        });
        
        if (adminUser) {
            await systemConfigService.initializeDefaultConfigs(adminUser.id);
            logger.info('Configuraciones del sistema inicializadas');
        } else {
            logger.warn('No se encontró usuario administrador para inicializar configuraciones');
        }
        
        await prisma.$disconnect();
    } catch (error) {
        logger.error('Error al inicializar configuraciones del sistema:', error);
    }
};

/**
 * Función para iniciar el servidor
 */
const startServer = async () => {
    try {
        const PORT = config.PORT || 3000;

        app.listen(PORT, async () => {
            logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
            logger.info(`📝 Ambiente: ${config.NODE_ENV}`);
            logger.info(`🔗 API disponible en: http://localhost:${PORT}/api`);
            logger.info(`� Documentación Swagger: http://localhost:${PORT}/api/docs`);
            logger.info(`� OpenAPI JSON: http://localhost:${PORT}/api/docs.json`);
            logger.info(`💾 Base de datos: PostgreSQL`);
            
            // Inicializar configuraciones del sistema después de que el servidor esté listo
            await initializeSystemConfigs();
        });
    } catch (error) {
        logger.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Iniciar servidor solo si este archivo es ejecutado directamente
if (require.main === module) {
    startServer();
}

module.exports = app;
