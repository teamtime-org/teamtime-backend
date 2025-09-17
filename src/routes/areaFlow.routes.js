const express = require('express');
const AreaFlowController = require('../controllers/areaFlow.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const areaFlowController = new AreaFlowController();

/**
 * @swagger
 * components:
 *   schemas:
 *     AreaFlow:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         fromAreaId:
 *           type: string
 *         toAreaId:
 *           type: string
 *         flowOrder:
 *           type: integer
 *         isRequired:
 *           type: boolean
 *         requiresApproval:
 *           type: boolean
 *         canSkip:
 *           type: boolean
 *         conditions:
 *           type: object
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/area-flows:
 *   get:
 *     summary: Obtener todos los flujos de áreas
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromAreaId
 *         schema:
 *           type: string
 *         description: Filtrar por área de origen
 *       - in: query
 *         name: toAreaId
 *         schema:
 *           type: string
 *         description: Filtrar por área de destino
 *     responses:
 *       200:
 *         description: Lista de flujos de áreas
 */
router.get('/',
    authenticateToken,
    (req, res) => areaFlowController.getAreaFlows(req, res)
);

/**
 * @swagger
 * /api/area-flows/configuration:
 *   get:
 *     summary: Obtener configuración completa de flujos
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración de flujos
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
 */
router.get('/configuration',
    authenticateToken,
    (req, res) => areaFlowController.getFlowConfiguration(req, res)
);

/**
 * @swagger
 * /api/area-flows/between:
 *   get:
 *     summary: Obtener flujo específico entre dos áreas
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *       - in: query
 *         name: toAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de destino
 *     responses:
 *       200:
 *         description: Flujo encontrado
 *       404:
 *         description: No existe flujo entre estas áreas
 */
router.get('/between',
    authenticateToken,
    (req, res) => areaFlowController.getFlowBetweenAreas(req, res)
);

/**
 * @swagger
 * /api/area-flows/statistics:
 *   get:
 *     summary: Obtener estadísticas de flujos
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de flujos
 */
router.get('/statistics',
    authenticateToken,
    (req, res) => areaFlowController.getFlowStatistics(req, res)
);

/**
 * @swagger
 * /api/area-flows/export:
 *   get:
 *     summary: Exportar configuración de flujos
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración exportada
 */
router.get('/export',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => areaFlowController.exportFlowConfiguration(req, res)
);

/**
 * @swagger
 * /api/area-flows/diagram:
 *   get:
 *     summary: Obtener datos para diagrama de flujos
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos para visualización
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
 *                     nodes:
 *                       type: array
 *                     edges:
 *                       type: array
 */
router.get('/diagram',
    authenticateToken,
    (req, res) => areaFlowController.getFlowDiagram(req, res)
);

/**
 * @swagger
 * /api/area-flows/from/{fromAreaId}:
 *   get:
 *     summary: Obtener flujos disponibles desde un área
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fromAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *     responses:
 *       200:
 *         description: Lista de flujos disponibles
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
 *                     $ref: '#/components/schemas/AreaFlow'
 */
router.get('/from/:fromAreaId',
    authenticateToken,
    (req, res) => areaFlowController.getAvailableFlowsFromArea(req, res)
);

/**
 * @swagger
 * /api/area-flows/from/{fromAreaId}/next:
 *   get:
 *     summary: Obtener siguiente paso obligatorio desde un área
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fromAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *     responses:
 *       200:
 *         description: Siguiente paso obligatorio
 *       404:
 *         description: No hay siguiente paso obligatorio
 */
router.get('/from/:fromAreaId/next',
    authenticateToken,
    (req, res) => areaFlowController.getNextFlowStep(req, res)
);

/**
 * @swagger
 * /api/area-flows/from/{fromAreaId}/alternatives:
 *   get:
 *     summary: Obtener flujos alternativos (opcionales) desde un área
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fromAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área de origen
 *     responses:
 *       200:
 *         description: Lista de flujos alternativos
 */
router.get('/from/:fromAreaId/alternatives',
    authenticateToken,
    (req, res) => areaFlowController.getAlternativeFlows(req, res)
);

/**
 * @swagger
 * /api/area-flows:
 *   post:
 *     summary: Crear nuevo flujo entre áreas
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromAreaId:
 *                 type: string
 *               toAreaId:
 *                 type: string
 *               flowOrder:
 *                 type: integer
 *               isRequired:
 *                 type: boolean
 *               requiresApproval:
 *                 type: boolean
 *               canSkip:
 *                 type: boolean
 *               conditions:
 *                 type: object
 *             required:
 *               - fromAreaId
 *               - toAreaId
 *     responses:
 *       201:
 *         description: Flujo creado exitosamente
 *       409:
 *         description: Ya existe flujo entre estas áreas
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => areaFlowController.createAreaFlow(req, res)
);

/**
 * @swagger
 * /api/area-flows/validate:
 *   post:
 *     summary: Validar transferencia según flujo configurado
 *     tags: [Area Flows]
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
 *               fromAreaId:
 *                 type: string
 *               toAreaId:
 *                 type: string
 *             required:
 *               - projectId
 *               - fromAreaId
 *               - toAreaId
 *     responses:
 *       200:
 *         description: Resultado de validación
 */
router.post('/validate',
    authenticateToken,
    (req, res) => areaFlowController.validateTransfer(req, res)
);

/**
 * @swagger
 * /api/area-flows/import:
 *   post:
 *     summary: Importar configuración de flujos
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               areas:
 *                 type: array
 *                 items:
 *                   type: object
 *             required:
 *               - areas
 *     responses:
 *       200:
 *         description: Flujos importados
 */
router.post('/import',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => areaFlowController.importFlowConfiguration(req, res)
);

/**
 * @swagger
 * /api/area-flows/{id}:
 *   put:
 *     summary: Actualizar flujo existente
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del flujo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flowOrder:
 *                 type: integer
 *               isRequired:
 *                 type: boolean
 *               requiresApproval:
 *                 type: boolean
 *               canSkip:
 *                 type: boolean
 *               conditions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Flujo actualizado
 */
router.put('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => areaFlowController.updateAreaFlow(req, res)
);

/**
 * @swagger
 * /api/area-flows/{id}:
 *   delete:
 *     summary: Eliminar flujo (desactivar)
 *     tags: [Area Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del flujo
 *     responses:
 *       200:
 *         description: Flujo eliminado
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => areaFlowController.deleteAreaFlow(req, res)
);

module.exports = router;