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
 * @swagger
 * /projects:
 *   post:
 *     summary: Crear nuevo proyecto
 *     description: Permite a administradores y coordinadores crear un nuevo proyecto en el sistema.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - areaId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sistema de Gestión CRM"
 *               description:
 *                 type: string
 *                 example: "Desarrollo de sistema CRM para gestión de clientes"
 *               areaId:
 *                 type: string
 *                 format: uuid
 *                 example: "area-123"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               status:
 *                 type: string
 *                 enum: [PLANIFICADO, EN_PROGRESO, COMPLETADO, CANCELADO]
 *                 default: PLANIFICADO
 *                 example: "PLANIFICADO"
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
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
 *                   example: "Proyecto creado exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Project'
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
    validate(createProjectSchema),
    projectController.createProject
);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Obtener lista de proyectos
 *     description: Retorna una lista paginada de proyectos con filtros opcionales. Los usuarios ven proyectos según sus permisos.
 *     tags: [Proyectos]
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
 *         name: areaId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por área
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLANIFICADO, EN_PROGRESO, COMPLETADO, CANCELADO]
 *         description: Filtrar por estado del proyecto
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *     responses:
 *       200:
 *         description: Lista de proyectos obtenida exitosamente
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
 *                   example: "Proyectos obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
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
    projectController.getProjects
);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Obtener proyecto por ID
 *     description: Retorna la información detallada de un proyecto específico.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Proyecto obtenido exitosamente
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
 *                   example: "Proyecto obtenido exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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

/**
 * @route   POST /api/projects/create-standard-tasks
 * @desc    Crear tareas estándar para un proyecto
 * @access  Private (Administrador/Coordinador)
 */
router.post('/create-standard-tasks',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    projectController.createStandardTasks
);

/**
 * @route   GET /api/projects/:id/has-standard-tasks
 * @desc    Verificar si un proyecto tiene tareas estándar
 * @access  Private
 */
router.get('/:id/has-standard-tasks',
    authenticateToken,
    projectController.hasStandardTasks
);

/**
 * @route   POST /api/projects/create-general-project
 * @desc    Crear o obtener proyecto general de un área
 * @access  Private (Administrador/Coordinador)
 */
router.post('/create-general-project',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    projectController.createOrGetGeneralProject
);

/**
 * @route   POST /api/projects/assign-to-general-project
 * @desc    Asignar usuario al proyecto general de su área
 * @access  Private (Administrador/Coordinador)
 */
router.post('/assign-to-general-project',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    projectController.assignToGeneralProject
);

/**
 * @route   POST /api/projects/assign-users-to-general-project
 * @desc    Asignar múltiples usuarios al proyecto general de su área
 * @access  Private (Administrador/Coordinador)
 */
router.post('/assign-users-to-general-project',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    projectController.assignUsersToGeneralProject
);

/**
 * @route   GET /api/projects/general-project/:areaId
 * @desc    Obtener proyecto general de un área
 * @access  Private
 */
router.get('/general-project/:areaId',
    authenticateToken,
    projectController.getGeneralProjectByArea
);

module.exports = router;
