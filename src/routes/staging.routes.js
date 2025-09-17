const express = require('express');
const StagingController = require('../controllers/staging.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const stagingController = new StagingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     StagingProject:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         sourceAreaId:
 *           type: string
 *         clientId:
 *           type: string
 *         projectStageId:
 *           type: string
 *         assignedToId:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date
 *         estimatedEndDate:
 *           type: string
 *           format: date
 *         tcvMXN:
 *           type: number
 *         monthlyMXN:
 *           type: number
 *         siebelId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CORRECTION]
 *         reviewNotes:
 *           type: string
 *         importLogId:
 *           type: string
 *         rowNumber:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/staging:
 *   get:
 *     summary: Obtener proyectos en staging por área
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CORRECTION]
 *         description: Filtrar por estado
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista de proyectos staging
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StagingProject'
 *                     pagination:
 *                       type: object
 */
router.get('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.getStagingProjectsByArea(req, res)
);

/**
 * @swagger
 * /api/staging/search:
 *   get:
 *     summary: Buscar proyectos staging con filtros avanzados
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Texto de búsqueda (título, descripción, Siebel ID)
 *       - in: query
 *         name: sourceAreaId
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CORRECTION]
 *         description: Filtrar por estado
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: ID del cliente
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 */
router.get('/search',
    authenticateToken,
    (req, res) => stagingController.searchStagingProjects(req, res)
);

/**
 * @swagger
 * /api/staging/statistics:
 *   get:
 *     summary: Obtener estadísticas de staging por área
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *     responses:
 *       200:
 *         description: Estadísticas de staging
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                     readyForTransfer:
 *                       type: integer
 *                     recentImports:
 *                       type: integer
 */
router.get('/statistics',
    authenticateToken,
    (req, res) => stagingController.getStagingStatistics(req, res)
);

/**
 * @swagger
 * /api/staging/{id}:
 *   get:
 *     summary: Obtener proyecto staging específico
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto staging
 *     responses:
 *       200:
 *         description: Proyecto staging encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StagingProject'
 *       404:
 *         description: Proyecto staging no encontrado
 */
router.get('/:id',
    authenticateToken,
    (req, res) => stagingController.getStagingProject(req, res)
);

/**
 * @swagger
 * /api/staging/{id}:
 *   put:
 *     summary: Actualizar proyecto staging
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto staging
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               clientId:
 *                 type: string
 *               projectStageId:
 *                 type: string
 *               assignedToId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               estimatedEndDate:
 *                 type: string
 *                 format: date
 *               tcvMXN:
 *                 type: number
 *               monthlyMXN:
 *                 type: number
 *               siebelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proyecto staging actualizado
 *       404:
 *         description: Proyecto staging no encontrado
 */
router.put('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.updateStagingProject(req, res)
);

/**
 * @swagger
 * /api/staging/{id}/status:
 *   patch:
 *     summary: Actualizar estado de proyecto staging
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto staging
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CORRECTION]
 *               notes:
 *                 type: string
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado inválido
 */
router.patch('/:id/status',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.updateStagingProjectStatus(req, res)
);

/**
 * @swagger
 * /api/staging/{id}/transfer:
 *   post:
 *     summary: Transferir proyecto staging a proyecto activo
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto staging
 *     responses:
 *       201:
 *         description: Proyecto transferido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Error en la transferencia
 */
router.post('/:id/transfer',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.transferToActive(req, res)
);

/**
 * @swagger
 * /api/staging/batch/transfer:
 *   post:
 *     summary: Transferir múltiples proyectos staging a activos
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stagingProjectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - stagingProjectIds
 *     responses:
 *       200:
 *         description: Transferencia masiva completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: array
 *                     errors:
 *                       type: array
 *                     summary:
 *                       type: object
 */
router.post('/batch/transfer',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.batchTransferToActive(req, res)
);

/**
 * @swagger
 * /api/staging/{id}:
 *   delete:
 *     summary: Eliminar proyecto staging
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto staging
 *     responses:
 *       200:
 *         description: Proyecto staging eliminado
 *       404:
 *         description: Proyecto staging no encontrado
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => stagingController.deleteStagingProject(req, res)
);

module.exports = router;