const winston = require('winston');
const path = require('path');
const config = require('../config/index');

// Crear directorio de logs si no existe
const fs = require('fs');
const logDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configuración de formatos
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// Crear logger
const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: logFormat,
    defaultMeta: { service: 'teamtime-backend' },
    transports: [
        // Archivo de logs
        new winston.transports.File({
            filename: config.LOG_FILE,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Archivo de errores
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});

// En desarrollo, también log a consola
if (config.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
