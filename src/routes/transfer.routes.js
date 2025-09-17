const express = require('express');
const TransferController = require('../controllers/transfer.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const transferController = new TransferController();

/**
 * @swagger
 * components:
 *   schemas:
 *     TransferLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         fromAreaId:
 *           type: string
 *         toAreaId:
 *           type: string
 *         transferType:
 *           type: string
 *           enum: [STAGING_TO_ACTIVE, AREA_TRANSFER]
 *         transferDate:
 *           type: string
 *           format: date-time
 *         transferredBy:
 *           type: string
 *         notes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED]
 *         requiresApproval:
 *           type: boolean
 *         approvedBy:
 *           type: string
 *         approvedAt:
 *           type: string
 *           format: date-time
 *         approvalComments:
 *           type: string
 */

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     summary: Transferir proyecto entre áreas
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               toAreaId:
 *                 type: string
 *               notes:
 *                 type: string
 *             required:
 *               - projectId
 *               - toAreaId
 *     responses:
 *       200:
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
 *                   properties:
 *                     project:
 *                       type: object
 *                     transfer:
 *                       $ref: '#/components/schemas/TransferLog'
 *                     requiresApproval:
 *                       type: boolean
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error en la transferencia
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => transferController.transferProject(req, res)
);

/**
 * @swagger
 * /api/transfers:
 *   get:
 *     summary: Obtener transferencias con filtros
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: areaId
 *         schema:
 *           type: string
 *         description: ID del área (origen o destino)
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: ID del proyecto
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED]
 *         description: Estado de la transferencia
 *       - in: query
 *         name: transferType
 *         schema:
 *           type: string
 *           enum: [STAGING_TO_ACTIVE, AREA_TRANSFER]
 *         description: Tipo de transferencia
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
 *         description: Lista de transferencias
 */
router.get('/',
    authenticateToken,
    (req, res) => transferController.getTransfers(req, res)
);

/**
 * @swagger
 * /api/transfers/validate:
 *   post:
 *     summary: Validar si un proyecto puede ser transferido
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               toAreaId:
 *                 type: string
 *             required:
 *               - projectId
 *               - toAreaId
 *     responses:
 *       200:
 *         description: Resultado de validación
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
 *                     isValid:
 *                       type: boolean
 *                     error:
 *                       type: string
 *                     flow:
 *                       type: object
 *                     requiresApproval:
 *                       type: boolean
 */
router.post('/validate',
    authenticateToken,
    (req, res) => transferController.validateTransfer(req, res)
);

/**
 * @swagger
 * /api/transfers/statistics:
 *   get:
 *     summary: Obtener estadísticas de transferencias
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: areaId
 *         schema:
 *           type: string
 *         description: ID del área para filtrar
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
 *     responses:
 *       200:
 *         description: Estadísticas de transferencias
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
 *                     byType:
 *                       type: object
 *                     byArea:
 *                       type: array
 */
router.get('/statistics',
    authenticateToken,
    (req, res) => transferController.getTransferStatistics(req, res)
);

/**
 * @swagger
 * /api/transfers/activity:
 *   get:
 *     summary: Obtener resumen de actividad de transferencias
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: areaId
 *         schema:
 *           type: string
 *         description: ID del área para filtrar
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de días hacia atrás
 *     responses:
 *       200:
 *         description: Resumen de actividad
 */
router.get('/activity',
    authenticateToken,
    (req, res) => transferController.getTransferActivitySummary(req, res)
);

/**
 * @swagger
 * /api/transfers/{transferId}:
 *   get:
 *     summary: Obtener detalles de una transferencia específica
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la transferencia
 *     responses:
 *       200:
 *         description: Detalles de la transferencia
 *       404:
 *         description: Transferencia no encontrada
 */
router.get('/:transferId',
    authenticateToken,
    (req, res) => transferController.getTransferDetails(req, res)
);

/**
 * @swagger
 * /api/transfers/{transferId}/approve:
 *   post:
 *     summary: Procesar aprobación de transferencia
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la transferencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved:
 *                 type: boolean
 *               comments:
 *                 type: string
 *             required:
 *               - approved
 *     responses:
 *       200:
 *         description: Aprobación procesada
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
 *                   $ref: '#/components/schemas/TransferLog'
 *       400:
 *         description: Datos inválidos
 */
router.post('/:transferId/approve',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => transferController.processTransferApproval(req, res)
);

/**
 * @swagger
 * /api/transfers/project/{projectId}/next-steps:
 *   get:
 *     summary: Obtener próximos pasos disponibles para un proyecto
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Próximos pasos disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       toArea:
 *                         type: object
 *                       isRequired:
 *                         type: boolean
 *                       requiresApproval:
 *                         type: boolean
 *                       isValid:
 *                         type: boolean
 *                       validationError:
 *                         type: string
 */
router.get('/project/:projectId/next-steps',
    authenticateToken,
    (req, res) => transferController.getAvailableNextSteps(req, res)
);

/**
 * @swagger
 * /api/transfers/project/{projectId}/history:
 *   get:
 *     summary: Obtener historial de transferencias de un proyecto
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Historial de transferencias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransferLog'
 */
router.get('/project/:projectId/history',
    authenticateToken,
    (req, res) => transferController.getProjectTransferHistory(req, res)
);

/**
 * @swagger
 * /api/transfers/area/{areaId}/pending:
 *   get:
 *     summary: Obtener transferencias pendientes para un área
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: areaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Transferencias pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransferLog'
 */
router.get('/area/:areaId/pending',
    authenticateToken,
    (req, res) => transferController.getPendingTransfersForArea(req, res)
);

module.exports = router;