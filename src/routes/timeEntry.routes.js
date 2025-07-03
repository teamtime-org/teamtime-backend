const express = require('express');
const timeEntryController = require('../controllers/timeEntry.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
    createTimeEntrySchema,
    updateTimeEntrySchema
} = require('../validators/timeEntry.validator');

const router = express.Router();

/**
 * @route   POST /api/time-entries
 * @desc    Crear nuevo registro de tiempo
 * @access  Private
 */
router.post('/',
    authenticateToken,
    validate(createTimeEntrySchema),
    timeEntryController.createTimeEntry
);

/**
 * @route   GET /api/time-entries
 * @desc    Obtener todos los registros de tiempo con filtros y paginación
 * @access  Private
 */
router.get('/',
    authenticateToken,
    timeEntryController.getTimeEntries
);

/**
 * @route   GET /api/time-entries/stats
 * @desc    Obtener estadísticas de tiempo
 * @access  Private
 */
router.get('/stats',
    authenticateToken,
    timeEntryController.getTimeStats
);

/**
 * @route   GET /api/time-entries/user/:userId/date/:date
 * @desc    Obtener registros de tiempo por usuario y fecha
 * @access  Private
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
