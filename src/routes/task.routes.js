const express = require('express');
const taskController = require('../controllers/task.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');
const {
    createTaskSchema,
    updateTaskSchema,
    changeTaskStatusSchema,
    assignTaskSchema
} = require('../validators/task.validator');

const router = express.Router();

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Crear nueva tarea
 *     description: Permite a administradores y coordinadores crear una nueva tarea en un proyecto.
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - projectId
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Implementar autenticación JWT"
 *               description:
 *                 type: string
 *                 example: "Desarrollar sistema de autenticación con tokens JWT"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "project-123"
 *               assignedUserId:
 *                 type: string
 *                 format: uuid
 *                 example: "user-456"
 *               priority:
 *                 type: string
 *                 enum: [BAJA, MEDIA, ALTA, URGENTE]
 *                 default: MEDIA
 *                 example: "ALTA"
 *               estimatedHours:
 *                 type: number
 *                 format: float
 *                 minimum: 0.1
 *                 example: 8.5
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-15"
 *               status:
 *                 type: string
 *                 enum: [PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA]
 *                 default: PENDIENTE
 *                 example: "PENDIENTE"
 *     responses:
 *       201:
 *         description: Tarea creada exitosamente
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
 *                   example: "Tarea creada exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    validate(createTaskSchema),
    taskController.createTask
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Obtener lista de tareas
 *     description: Retorna una lista paginada de tareas con filtros opcionales. Los usuarios ven tareas según sus permisos.
 *     tags: [Tareas]
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
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por proyecto
 *       - in: query
 *         name: assignedUserId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario asignado
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA]
 *         description: Filtrar por estado de la tarea
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [BAJA, MEDIA, ALTA, URGENTE]
 *         description: Filtrar por prioridad
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título o descripción
 *     responses:
 *       200:
 *         description: Lista de tareas obtenida exitosamente
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
 *                   example: "Tareas obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
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
 *                           example: 85
 *                         pages:
 *                           type: integer
 *                           example: 9
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
    authenticateToken,
    taskController.getTasks
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Obtener tarea por ID
 *     description: Retorna la información detallada de una tarea específica.
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tarea
 *     responses:
 *       200:
 *         description: Tarea obtenida exitosamente
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
 *                   example: "Tarea obtenida exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id',
    authenticateToken,
    taskController.getTaskById
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Actualizar tarea
 * @access  Private (Administrador/Coordinador del área/Usuario asignado)
 */
router.put('/:id',
    authenticateToken,
    validate(updateTaskSchema),
    taskController.updateTask
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Eliminar tarea (soft delete)
 * @access  Private (Administrador/Coordinador del área)
 */
router.delete('/:id',
    authenticateToken,
    taskController.deleteTask
);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Cambiar estado de la tarea
 * @access  Private (Administrador/Coordinador del área/Usuario asignado)
 */
router.patch('/:id/status',
    authenticateToken,
    validate(changeTaskStatusSchema),
    taskController.changeTaskStatus
);

/**
 * @route   PATCH /api/tasks/:id/assign
 * @desc    Asignar tarea a usuario
 * @access  Private (Administrador/Coordinador del área)
 */
router.patch('/:id/assign',
    authenticateToken,
    validate(assignTaskSchema),
    taskController.assignTask
);

/**
 * @route   GET /api/tasks/:id/time-entries
 * @desc    Obtener registros de tiempo de una tarea
 * @access  Private
 */
router.get('/:id/time-entries',
    authenticateToken,
    taskController.getTaskTimeEntries
);

/**
 * @route   GET /api/tasks/:id/stats
 * @desc    Obtener estadísticas de una tarea
 * @access  Private
 */
router.get('/:id/stats',
    authenticateToken,
    taskController.getTaskStats
);

/**
 * @route   GET /api/tasks/user/:userId
 * @desc    Obtener tareas asignadas a un usuario
 * @access  Private
 */
router.get('/user/:userId',
    authenticateToken,
    taskController.getUserTasks
);

module.exports = router;
