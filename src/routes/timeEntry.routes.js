const express = require('express');
const timeEntryController = require('../controllers/timeEntry.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateFutureDate } = require('../middleware/dateValidation.middleware');
const {
    createTimeEntrySchema,
    updateTimeEntrySchema
} = require('../validators/timeEntry.validator');

const router = express.Router();

/**
 * @swagger
 * /time-entries:
 *   post:
 *     summary: Crear registro de tiempo
 *     description: Permite crear un nuevo registro de tiempo trabajado en una tarea específica.
 *     tags: [Registros de Tiempo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - date
 *               - hours
 *             properties:
 *               taskId:
 *                 type: string
 *                 format: uuid
 *                 example: task-123
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Si no se especifica, se usa el usuario autenticado
 *                 example: user-456
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-04"
 *               hours:
 *                 type: number
 *                 format: float
 *                 minimum: 0.1
 *                 maximum: 24
 *                 example: 4.5
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Desarrollo de funcionalidad X
 *     responses:
 *       201:
 *         description: Registro de tiempo creado exitosamente
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
 *                   example: Registro de tiempo creado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/TimeEntry'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
    authenticateToken,
    validate(createTimeEntrySchema),
    validateFutureDate,
    timeEntryController.createTimeEntry
);

/**
 * @swagger
 * /time-entries:
 *   get:
 *     summary: Obtener registros de tiempo
 *     description: Retorna una lista paginada de registros de tiempo con filtros opcionales. Los usuarios ven solo sus registros, coordinadores ven los de su área.
 *     tags: [Registros de Tiempo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de elementos por página
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por tarea
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por proyecto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango
 *     responses:
 *       200:
 *         description: Registros de tiempo obtenidos exitosamente
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
 *                   example: Registros de tiempo obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeEntries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimeEntry'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         pages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
    authenticateToken,
    timeEntryController.getTimeEntries
);

/**
 * @swagger
 * /time-entries/stats:
 *   get:
 *     summary: Obtener estadísticas de tiempo
 *     description: Retorna estadísticas de tiempo trabajado basadas en los permisos del usuario.
 *     tags: [Registros de Tiempo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario específico
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por proyecto específico
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                   example: Estadísticas obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalHours:
 *                       type: number
 *                       format: float
 *                       example: 156.5
 *                     totalEntries:
 *                       type: integer
 *                       example: 45
 *                     averageHoursPerDay:
 *                       type: number
 *                       format: float
 *                       example: 7.8
 *                     hoursByProject:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectName:
 *                             type: string
 *                             example: Sistema de Gestión
 *                           hours:
 *                             type: number
 *                             format: float
 *                             example: 48.5
 *                     hoursByUser:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userName:
 *                             type: string
 *                             example: Juan Pérez
 *                           hours:
 *                             type: number
 *                             format: float
 *                             example: 32.0
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/stats',
    authenticateToken,
    timeEntryController.getTimeStats
);

/**
 * @swagger
 * /time-entries/user/{userId}/date/{date}:
 *   get:
 *     summary: Obtener registros por usuario y fecha
 *     description: Retorna todos los registros de tiempo de un usuario específico en una fecha determinada.
 *     tags: [Registros de Tiempo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha en formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Registros obtenidos exitosamente
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
 *                   example: Registros obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeEntries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimeEntry'
 *                     totalHours:
 *                       type: number
 *                       format: float
 *                       example: 8.5
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-07-04"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/user/:userId/date/:date',
    authenticateToken,
    timeEntryController.getTimeEntriesByDate
);

/**
 * @route   GET /api/time-entries/user/:userId/summary
 * @desc    Obtener resumen de tiempo por usuario
 * @access  Private
 */
router.get('/user/:userId/summary',
    authenticateToken,
    timeEntryController.getUserTimeSummary
);

/**
 * @route   GET /api/time-entries/project/:projectId/report
 * @desc    Obtener reporte de tiempo por proyecto
 * @access  Private
 */
router.get('/project/:projectId/report',
    authenticateToken,
    timeEntryController.getProjectTimeReport
);

/**
 * @route   GET /api/time-entries/range/:startDate/:endDate
 * @desc    Obtener registros de tiempo por rango de fechas
 * @access  Private
 */
router.get('/range/:startDate/:endDate',
    authenticateToken,
    timeEntryController.getTimeEntriesByDateRange
);

/**
 * @route   GET /api/time-entries/:id
 * @desc    Obtener registro de tiempo por ID
 * @access  Private
 */
router.get('/:id',
    authenticateToken,
    timeEntryController.getTimeEntryById
);

/**
 * @route   PUT /api/time-entries/:id
 * @desc    Actualizar registro de tiempo
 * @access  Private
 */
router.put('/:id',
    authenticateToken,
    validate(updateTimeEntrySchema),
    timeEntryController.updateTimeEntry
);

/**
 * @route   DELETE /api/time-entries/:id
 * @desc    Eliminar registro de tiempo
 * @access  Private
 */
router.delete('/:id',
    authenticateToken,
    timeEntryController.deleteTimeEntry
);

module.exports = router;
