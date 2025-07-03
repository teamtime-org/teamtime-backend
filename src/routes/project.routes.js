const express = require('express');
const projectController = require('../controllers/project.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');
const {
    createProjectSchema,
    updateProjectSchema,
    changeProjectStatusSchema,
    assignUserToProjectSchema
} = require('../validators/project.validator');

const router = express.Router();

/**
 * @route   POST /api/projects
 * @desc    Crear nuevo proyecto
 * @access  Private (Administrador/Coordinador)
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    validate(createProjectSchema),
    projectController.createProject
);

/**
 * @route   GET /api/projects
 * @desc    Obtener todos los proyectos con filtros y paginación
 * @access  Private
 */
router.get('/',
    authenticateToken,
    projectController.getProjects
);

/**
 * @route   GET /api/projects/:id
 * @desc    Obtener proyecto por ID
 * @access  Private
 */
router.get('/:id',
    authenticateToken,
    projectController.getProjectById
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Actualizar proyecto
 * @access  Private (Administrador/Coordinador del área)
 */
router.put('/:id',
    authenticateToken,
    validate(updateProjectSchema),
    projectController.updateProject
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Eliminar proyecto (soft delete)
 * @access  Private (Administrador)
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    projectController.deleteProject
);

/**
 * @route   PATCH /api/projects/:id/status
 * @desc    Cambiar estado del proyecto
 * @access  Private (Administrador/Coordinador del área)
 */
router.patch('/:id/status',
    authenticateToken,
    validate(changeProjectStatusSchema),
    projectController.changeProjectStatus
);

/**
 * @route   GET /api/projects/:id/tasks
 * @desc    Obtener tareas de un proyecto
 * @access  Private
 */
router.get('/:id/tasks',
    authenticateToken,
    projectController.getProjectTasks
);

/**
 * @route   POST /api/projects/:id/users
 * @desc    Asignar usuario a proyecto
 * @access  Private (Administrador/Coordinador del área)
 */
router.post('/:id/users',
    authenticateToken,
    validate(assignUserToProjectSchema),
    projectController.assignUserToProject
);

/**
 * @route   DELETE /api/projects/:id/users/:userId
 * @desc    Remover usuario de proyecto
 * @access  Private (Administrador/Coordinador del área)
 */
router.delete('/:id/users/:userId',
    authenticateToken,
    projectController.removeUserFromProject
);

/**
 * @route   GET /api/projects/:id/stats
 * @desc    Obtener estadísticas de un proyecto
 * @access  Private
 */
router.get('/:id/stats',
    authenticateToken,
    projectController.getProjectStats
);

module.exports = router;
