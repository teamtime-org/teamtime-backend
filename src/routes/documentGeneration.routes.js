const express = require('express');
const DocumentGenerationController = require('../controllers/documentGeneration.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const documentGenerationController = new DocumentGenerationController();

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedDocument:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         templateName:
 *           type: string
 *         templateType:
 *           type: string
 *         filename:
 *           type: string
 *         filePath:
 *           type: string
 *         generatedBy:
 *           type: string
 *         generatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/documents/generate:
 *   post:
 *     summary: Generar documento para proyecto
 *     tags: [Documents]
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
 *               templateName:
 *                 type: string
 *               templateType:
 *                 type: string
 *                 default: transfer
 *             required:
 *               - projectId
 *               - templateName
 *     responses:
 *       201:
 *         description: Documento generado exitosamente
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
 */
router.post('/generate',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => documentGenerationController.generateDocument(req, res)
);

/**
 * @swagger
 * /api/documents/batch/generate:
 *   post:
 *     summary: Generar documentos masivos para múltiples proyectos
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               templateName:
 *                 type: string
 *               templateType:
 *                 type: string
 *                 default: transfer
 *             required:
 *               - projectIds
 *               - templateName
 *     responses:
 *       200:
 *         description: Generación masiva completada
 */
router.post('/batch/generate',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => documentGenerationController.batchGenerateDocuments(req, res)
);

/**
 * @swagger
 * /api/documents/preview:
 *   post:
 *     summary: Previsualizar documento sin generarlo
 *     tags: [Documents]
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
 *               templateName:
 *                 type: string
 *               templateType:
 *                 type: string
 *                 default: transfer
 *             required:
 *               - projectId
 *               - templateName
 *     responses:
 *       200:
 *         description: Previsualización del documento
 */
router.post('/preview',
    authenticateToken,
    (req, res) => documentGenerationController.previewDocument(req, res)
);

/**
 * @swagger
 * /api/documents/templates:
 *   get:
 *     summary: Obtener plantillas disponibles
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: templateType
 *         schema:
 *           type: string
 *         description: Tipo de plantilla a filtrar
 *     responses:
 *       200:
 *         description: Lista de plantillas disponibles
 */
router.get('/templates',
    authenticateToken,
    (req, res) => documentGenerationController.getAvailableTemplates(req, res)
);

/**
 * @swagger
 * /api/documents/templates:
 *   post:
 *     summary: Crear o actualizar plantilla
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               content:
 *                 type: string
 *               format:
 *                 type: string
 *                 default: html
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - name
 *               - type
 *               - content
 *     responses:
 *       201:
 *         description: Plantilla guardada exitosamente
 */
router.post('/templates',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => documentGenerationController.saveTemplate(req, res)
);

/**
 * @swagger
 * /api/documents/project/{projectId}:
 *   get:
 *     summary: Obtener documentos generados para un proyecto
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto
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
 *         description: Lista de documentos del proyecto
 */
router.get('/project/:projectId',
    authenticateToken,
    (req, res) => documentGenerationController.getProjectDocuments(req, res)
);

/**
 * @swagger
 * /api/documents/statistics:
 *   get:
 *     summary: Obtener estadísticas de generación de documentos
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: templateType
 *         schema:
 *           type: string
 *         description: Tipo de plantilla
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Estadísticas de documentos
 */
router.get('/statistics',
    authenticateToken,
    (req, res) => documentGenerationController.getDocumentStatistics(req, res)
);

/**
 * @swagger
 * /api/documents/download/{documentId}:
 *   get:
 *     summary: Descargar documento generado
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Archivo de documento
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Documento no encontrado
 */
router.get('/download/:documentId',
    authenticateToken,
    (req, res) => documentGenerationController.downloadDocument(req, res)
);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     summary: Eliminar documento
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento eliminado
 *       404:
 *         description: Documento no encontrado
 */
router.delete('/:documentId',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => documentGenerationController.deleteDocument(req, res)
);

module.exports = router;