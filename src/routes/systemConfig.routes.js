const express = require('express');
const systemConfigController = require('../controllers/systemConfig.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const Joi = require('joi');

const router = express.Router();

// Esquemas de validación
const configSchema = Joi.object({
    key: Joi.string().required().min(1).max(100)
        .messages({
            'string.empty': 'La clave es requerida',
            'string.max': 'La clave no puede tener más de 100 caracteres'
        }),
    value: Joi.string().required().allow('')
        .messages({
            'string.empty': 'El valor es requerido'
        }),
    description: Joi.string().optional().allow('').max(500)
        .messages({
            'string.max': 'La descripción no puede tener más de 500 caracteres'
        })
});

const futureDaysSchema = Joi.object({
    days: Joi.number().integer().min(0).max(365).required()
        .messages({
            'number.base': 'Los días deben ser un número',
            'number.integer': 'Los días deben ser un número entero',
            'number.min': 'Los días no pueden ser negativos',
            'number.max': 'Los días no pueden ser más de 365',
            'any.required': 'Los días son requeridos'
        })
});

const dateRestrictionSchema = Joi.object({
    enabled: Joi.boolean().required()
        .messages({
            'boolean.base': 'El campo enabled debe ser un valor booleano',
            'any.required': 'El campo enabled es requerido'
        }),
    futureDaysAllowed: Joi.when('enabled', {
        is: true,
        then: Joi.number().integer().min(0).max(365).required()
            .messages({
                'number.base': 'Los días futuros deben ser un número',
                'number.integer': 'Los días futuros deben ser un número entero',
                'number.min': 'Los días futuros no pueden ser negativos',
                'number.max': 'Los días futuros no pueden ser más de 365',
                'any.required': 'Los días futuros son requeridos cuando las restricciones están habilitadas'
            }),
        otherwise: Joi.optional()
    }),
    pastDaysAllowed: Joi.when('enabled', {
        is: true,
        then: Joi.number().integer().min(0).max(365).required()
            .messages({
                'number.base': 'Los días pasados deben ser un número',
                'number.integer': 'Los días pasados deben ser un número entero',
                'number.min': 'Los días pasados no pueden ser negativos',
                'number.max': 'Los días pasados no pueden ser más de 365',
                'any.required': 'Los días pasados son requeridos cuando las restricciones están habilitadas'
            }),
        otherwise: Joi.optional()
    })
});

/**
 * @swagger
 * /system-config:
 *   get:
 *     summary: Obtener todas las configuraciones del sistema
 *     description: Obtiene todas las configuraciones del sistema. Solo accesible para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuraciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Configuraciones obtenidas exitosamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: TIME_ENTRY_FUTURE_DAYS
 *                       value:
 *                         type: string
 *                         example: "7"
 *                       description:
 *                         type: string
 *                         example: Días futuros permitidos para registro de tiempo
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/',
    authenticateToken,
    systemConfigController.getSystemConfigs
);

/**
 * @swagger
 * /system-config/future-days:
 *   get:
 *     summary: Obtener configuración de días futuros permitidos
 *     description: Obtiene el número de días futuros permitidos para registro de tiempo.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     futureDaysAllowed:
 *                       type: number
 *                       example: 7
 */
router.get('/future-days',
    authenticateToken,
    systemConfigController.getFutureDaysConfig
);

/**
 * @swagger
 * /system-config/future-days:
 *   put:
 *     summary: Configurar días futuros permitidos
 *     description: Configura el número de días futuros permitidos para registro de tiempo. Solo para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - days
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 365
 *                 example: 7
 *                 description: Número de días futuros permitidos
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/future-days',
    authenticateToken,
    validate(futureDaysSchema),
    systemConfigController.setFutureDaysConfig
);

/**
 * @swagger
 * /system-config/initialize:
 *   post:
 *     summary: Inicializar configuraciones por defecto
 *     description: Inicializa las configuraciones por defecto del sistema. Solo para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuraciones inicializadas exitosamente
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
/**
 * @swagger
 * /system-config/date-restrictions:
 *   get:
 *     summary: Obtener configuraciones de restricciones de fecha
 *     description: Obtiene las configuraciones completas de restricciones de fecha para timesheet.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuraciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     futureDaysAllowed:
 *                       type: number
 *                       example: 7
 *                     pastDaysAllowed:
 *                       type: number
 *                       example: 30
 */
router.get('/date-restrictions',
    authenticateToken,
    systemConfigController.getDateRestrictionConfigs
);

/**
 * @swagger
 * /system-config/date-restrictions:
 *   put:
 *     summary: Configurar restricciones de fecha para timesheet
 *     description: Configura las restricciones de fecha para registro de tiempo. Solo para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 example: true
 *                 description: Habilitar o deshabilitar restricciones de fecha
 *               futureDaysAllowed:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 365
 *                 example: 7
 *                 description: Días futuros permitidos (requerido si enabled=true)
 *               pastDaysAllowed:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 365
 *                 example: 30
 *                 description: Días pasados permitidos (requerido si enabled=true)
 *     responses:
 *       200:
 *         description: Configuraciones actualizadas exitosamente
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/date-restrictions',
    authenticateToken,
    validate(dateRestrictionSchema),
    systemConfigController.setDateRestrictionConfigs
);

/**
 * @swagger
 * /system-config/validate-date:
 *   get:
 *     summary: Validar fecha para registro de tiempo
 *     description: Valida si una fecha específica es permitida para registro de tiempo según las configuraciones actuales.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a validar (formato YYYY-MM-DD)
 *         example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Validación completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     reason:
 *                       type: string
 *                       example: "Fecha no permitida por restricciones del sistema"
 *                       description: Razón por la cual la fecha no es válida (solo si isValid=false)
 */
router.get('/validate-date',
    authenticateToken,
    systemConfigController.validateDateForTimeEntry
);

router.post('/initialize',
    authenticateToken,
    systemConfigController.initializeDefaults
);

/**
 * @swagger
 * /system-config/{key}:
 *   get:
 *     summary: Obtener configuración específica
 *     description: Obtiene una configuración específica por su clave.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave de la configuración
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *       404:
 *         description: Configuración no encontrada
 */
router.get('/:key',
    authenticateToken,
    systemConfigController.getSystemConfig
);

/**
 * @swagger
 * /system-config:
 *   post:
 *     summary: Crear o actualizar configuración
 *     description: Crea una nueva configuración o actualiza una existente. Solo para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *                 maxLength: 100
 *                 example: CUSTOM_CONFIG_KEY
 *               value:
 *                 type: string
 *                 example: "custom_value"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Descripción de la configuración personalizada
 *     responses:
 *       201:
 *         description: Configuración creada/actualizada exitosamente
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
    authenticateToken,
    validate(configSchema),
    systemConfigController.setSystemConfig
);

/**
 * @swagger
 * /system-config/{key}:
 *   delete:
 *     summary: Eliminar configuración
 *     description: Elimina una configuración específica. Solo para administradores.
 *     tags: [Configuración del Sistema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave de la configuración a eliminar
 *     responses:
 *       200:
 *         description: Configuración eliminada exitosamente
 *       404:
 *         description: Configuración no encontrada
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.delete('/:key',
    authenticateToken,
    systemConfigController.deleteSystemConfig
);

module.exports = router;