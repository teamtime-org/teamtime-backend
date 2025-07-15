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
 * @swagger
 * /areas:
 *   post:
 *     summary: Crear nueva área
 *     description: Permite a los administradores crear una nueva área organizacional en el sistema.
 *     tags: [Áreas]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Marketing Digital"
 *               description:
 *                 type: string
 *                 example: "Área encargada de estrategias de marketing y publicidad digital"
 *     responses:
 *       201:
 *         description: Área creada exitosamente
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
 *                   example: "Área creada exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Area'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    validate(createAreaSchema),
    areaController.createArea
);

/**
 * @swagger
 * /areas:
 *   get:
 *     summary: Obtener lista de áreas
 *     description: Retorna una lista paginada de áreas con filtros opcionales.
 *     tags: [Áreas]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *     responses:
 *       200:
 *         description: Lista de áreas obtenida exitosamente
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
 *                   example: "Áreas obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     areas:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Area'
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
 *                           example: 15
 *                         pages:
 *                           type: integer
 *                           example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
    authenticateToken,
    areaController.getAreas
);

/**
 * @swagger
 * /areas/stats:
 *   get:
 *     summary: Obtener estadísticas generales de áreas
 *     description: Retorna estadísticas globales sobre las áreas del sistema. Solo disponible para administradores.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
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
 *                   example: "Estadísticas obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAreas:
 *                       type: integer
 *                       example: 8
 *                     activeAreas:
 *                       type: integer
 *                       example: 7
 *                     inactiveAreas:
 *                       type: integer
 *                       example: 1
 *                     usersByArea:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           areaName:
 *                             type: string
 *                             example: "Desarrollo"
 *                           userCount:
 *                             type: integer
 *                             example: 15
 *                     projectsByArea:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           areaName:
 *                             type: string
 *                             example: "Marketing"
 *                           projectCount:
 *                             type: integer
 *                             example: 8
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/stats',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    areaController.getGeneralStats
);

/**
 * @swagger
 * /areas/{id}:
 *   get:
 *     summary: Obtener área por ID
 *     description: Retorna la información detallada de un área específica.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Área obtenida exitosamente
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
 *                   example: "Área obtenida exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Area'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id',
    authenticateToken,
    areaController.getAreaById
);

/**
 * @swagger
 * /areas/{id}:
 *   put:
 *     summary: Actualizar área
 *     description: Permite a los administradores actualizar la información de un área existente.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Marketing Digital Actualizado"
 *               description:
 *                 type: string
 *                 example: "Nueva descripción del área"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Área actualizada exitosamente
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
 *                   example: "Área actualizada exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Area'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Eliminar área
 *     description: Realiza un soft delete del área (marcado como inactivo). Solo disponible para administradores.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Área eliminada exitosamente
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
 *                   example: "Área eliminada exitosamente"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    validate(updateAreaSchema),
    areaController.updateArea
);


router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    areaController.deleteArea
);

/**
 * @swagger
 * /areas/{id}/users:
 *   get:
 *     summary: Obtener usuarios de un área
 *     description: Retorna la lista de usuarios pertenecientes a un área específica.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por usuarios activos/inactivos
 *     responses:
 *       200:
 *         description: Usuarios del área obtenidos exitosamente
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
 *                   example: "Usuarios del área obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
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
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/users',
    authenticateToken,
    areaController.getAreaUsers
);

/**
 * @swagger
 * /areas/{id}/projects:
 *   get:
 *     summary: Obtener proyectos de un área
 *     description: Retorna la lista de proyectos pertenecientes a un área específica.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLANIFICADO, EN_PROGRESO, COMPLETADO, CANCELADO]
 *         description: Filtrar por estado del proyecto
 *     responses:
 *       200:
 *         description: Proyectos del área obtenidos exitosamente
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
 *                   example: "Proyectos del área obtenidos exitosamente"
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
 *                           example: 15
 *                         pages:
 *                           type: integer
 *                           example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/projects',
    authenticateToken,
    areaController.getAreaProjects
);

/**
 * @swagger
 * /areas/{id}/stats:
 *   get:
 *     summary: Obtener estadísticas de un área
 *     description: Retorna estadísticas específicas de un área. Disponible para administradores y coordinadores del área.
 *     tags: [Áreas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del área
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período para estadísticas
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período para estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas del área obtenidas exitosamente
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
 *                   example: "Estadísticas del área obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     areaInfo:
 *                       $ref: '#/components/schemas/Area'
 *                     totalUsers:
 *                       type: integer
 *                       example: 15
 *                     activeProjects:
 *                       type: integer
 *                       example: 8
 *                     completedProjects:
 *                       type: integer
 *                       example: 12
 *                     totalHoursWorked:
 *                       type: number
 *                       format: float
 *                       example: 1250.5
 *                     averageHoursPerUser:
 *                       type: number
 *                       format: float
 *                       example: 83.4
 *                     tasksByStatus:
 *                       type: object
 *                       properties:
 *                         PENDIENTE:
 *                           type: integer
 *                           example: 25
 *                         EN_PROGRESO:
 *                           type: integer
 *                           example: 18
 *                         COMPLETADA:
 *                           type: integer
 *                           example: 45
 *                         CANCELADA:
 *                           type: integer
 *                           example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/stats',
    authenticateToken,
    areaController.getAreaStats
);

module.exports = router;
