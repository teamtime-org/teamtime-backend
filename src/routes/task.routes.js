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
 * @route   POST /api/tasks
 * @desc    Crear nueva tarea
 * @access  Private (Administrador/Coordinador)
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    validate(createTaskSchema),
    taskController.createTask
);

/**
 * @route   GET /api/tasks
 * @desc    Obtener todas las tareas con filtros y paginación
 * @access  Private
 */
router.get('/',
    authenticateToken,
    taskController.getTasks
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Obtener tarea por ID
 * @access  Private
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
