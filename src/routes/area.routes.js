const express = require('express');
const areaController = require('../controllers/area.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');
const {
    createAreaSchema,
    updateAreaSchema
} = require('../validators/area.validator');

const router = express.Router();

/**
 * @route   POST /api/areas
 * @desc    Crear nueva área
 * @access  Private (Administrador)
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    validate(createAreaSchema),
    areaController.createArea
);

/**
 * @route   GET /api/areas
 * @desc    Obtener todas las áreas con filtros y paginación
 * @access  Private
 */
router.get('/',
    authenticateToken,
    areaController.getAreas
);

/**
 * @route   GET /api/areas/stats
 * @desc    Obtener estadísticas generales de áreas
 * @access  Private (Administrador)
 */
router.get('/stats',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    areaController.getGeneralStats
);

/**
 * @route   GET /api/areas/:id
 * @desc    Obtener área por ID
 * @access  Private
 */
router.get('/:id',
    authenticateToken,
    areaController.getAreaById
);

/**
 * @route   PUT /api/areas/:id
 * @desc    Actualizar área
 * @access  Private (Administrador)
 */
router.put('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    validate(updateAreaSchema),
    areaController.updateArea
);

/**
 * @route   DELETE /api/areas/:id
 * @desc    Eliminar área (soft delete)
 * @access  Private (Administrador)
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    areaController.deleteArea
);

/**
 * @route   GET /api/areas/:id/users
 * @desc    Obtener usuarios de un área
 * @access  Private
 */
router.get('/:id/users',
    authenticateToken,
    areaController.getAreaUsers
);

/**
 * @route   GET /api/areas/:id/projects
 * @desc    Obtener proyectos de un área
 * @access  Private
 */
router.get('/:id/projects',
    authenticateToken,
    areaController.getAreaProjects
);

/**
 * @route   GET /api/areas/:id/stats
 * @desc    Obtener estadísticas de un área
 * @access  Private (Administrador/Coordinador del área)
 */
router.get('/:id/stats',
    authenticateToken,
    areaController.getAreaStats
);

module.exports = router;
