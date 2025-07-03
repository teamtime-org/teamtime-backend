const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger');

/**
 * Crear aplicación Express
 */
const app = express();

/**
 * Configurar middlewares de seguridad
 */
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

/**
 * Configurar CORS
 */
app.use(cors({
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

/**
 * Rate limiting
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 requests por ventana por IP
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
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
 * Función para iniciar el servidor
 */
const startServer = async () => {
    try {
        const PORT = config.PORT || 3000;

        app.listen(PORT, () => {
            logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
            logger.info(`📝 Ambiente: ${config.NODE_ENV}`);
            logger.info(`🔗 API disponible en: http://localhost:${PORT}/api`);
            logger.info(`💾 Base de datos: PostgreSQL`);

            if (config.NODE_ENV === 'development') {
                logger.info(`📚 Documentación: http://localhost:${PORT}/api/docs`);
            }
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
