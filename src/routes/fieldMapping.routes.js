const express = require('express');
const FieldMappingController = require('../controllers/fieldMapping.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const fieldMappingController = new FieldMappingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     FieldMapping:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         sourceAreaId:
 *           type: string
 *         sourceField:
 *           type: string
 *         targetField:
 *           type: string
 *         description:
 *           type: string
 *         isRequired:
 *           type: boolean
 *         transformation:
 *           type: string
 *         validationRule:
 *           type: string
 *         defaultValue:
 *           type: string
 *         orderIndex:
 *           type: integer
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/field-mappings:
 *   get:
 *     summary: Obtener todos los mapeos de campos
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceAreaId
 *         schema:
 *           type: string
 *         description: Filtrar por área de origen
 *     responses:
 *       200:
 *         description: Lista de mapeos de campos
 */
router.get('/',
    authenticateToken,
    (req, res) => fieldMappingController.getFieldMappings(req, res)
);

/**
 * @swagger
 * /api/field-mappings/transformations:
 *   get:
 *     summary: Obtener transformaciones disponibles
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de transformaciones disponibles
 */
router.get('/transformations',
    authenticateToken,
    (req, res) => fieldMappingController.getAvailableTransformations(req, res)
);

/**
 * @swagger
 * /api/field-mappings/validation-rules:
 *   get:
 *     summary: Obtener reglas de validación disponibles
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reglas de validación disponibles
 */
router.get('/validation-rules',
    authenticateToken,
    (req, res) => fieldMappingController.getAvailableValidationRules(req, res)
);

/**
 * @swagger
 * /api/field-mappings/area/{sourceAreaId}:
 *   get:
 *     summary: Obtener mapeos de campos para un área
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Lista de mapeos de campos
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
 *                     $ref: '#/components/schemas/FieldMapping'
 */
router.get('/area/:sourceAreaId',
    authenticateToken,
    (req, res) => fieldMappingController.getFieldMappings(req, res)
);

/**
 * @swagger
 * /api/field-mappings/area/{sourceAreaId}/export:
 *   get:
 *     summary: Exportar configuración de mapeos de un área
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Configuración exportada
 */
router.get('/area/:sourceAreaId/export',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.exportMappings(req, res)
);

/**
 * @swagger
 * /api/field-mappings:
 *   post:
 *     summary: Crear nuevo mapeo de campo
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceAreaId:
 *                 type: string
 *               sourceField:
 *                 type: string
 *               targetField:
 *                 type: string
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               transformation:
 *                 type: string
 *               validationRule:
 *                 type: string
 *               defaultValue:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *             required:
 *               - sourceAreaId
 *               - sourceField
 *               - targetField
 *     responses:
 *       201:
 *         description: Mapeo creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.createFieldMapping(req, res)
);

/**
 * @swagger
 * /api/field-mappings/clone:
 *   post:
 *     summary: Clonar mapeos de un área a otra
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceAreaId:
 *                 type: string
 *               targetAreaId:
 *                 type: string
 *             required:
 *               - sourceAreaId
 *               - targetAreaId
 *     responses:
 *       201:
 *         description: Mapeos clonados exitosamente
 *       404:
 *         description: No hay mapeos en el área de origen
 */
router.post('/clone',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.cloneMappings(req, res)
);

/**
 * @swagger
 * /api/field-mappings/test:
 *   post:
 *     summary: Probar mapeo con datos de ejemplo
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceAreaId:
 *                 type: string
 *               testData:
 *                 type: object
 *             required:
 *               - sourceAreaId
 *               - testData
 *     responses:
 *       200:
 *         description: Resultado de la prueba
 */
router.post('/test',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.testMapping(req, res)
);

/**
 * @swagger
 * /api/field-mappings/import:
 *   post:
 *     summary: Importar configuración de mapeos
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceAreaId:
 *                 type: string
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *             required:
 *               - sourceAreaId
 *               - mappings
 *     responses:
 *       200:
 *         description: Mapeos importados
 */
router.post('/import',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.importMappings(req, res)
);

/**
 * @swagger
 * /api/field-mappings/order:
 *   put:
 *     summary: Actualizar orden de mapeos
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderIndex:
 *                       type: integer
 *             required:
 *               - mappings
 *     responses:
 *       200:
 *         description: Orden actualizado
 */
router.put('/order',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.updateMappingOrder(req, res)
);

/**
 * @swagger
 * /api/field-mappings/{id}:
 *   put:
 *     summary: Actualizar mapeo de campo
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mapeo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceField:
 *                 type: string
 *               targetField:
 *                 type: string
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               transformation:
 *                 type: string
 *               validationRule:
 *                 type: string
 *               defaultValue:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Mapeo actualizado
 */
router.put('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.updateFieldMapping(req, res)
);

/**
 * @swagger
 * /api/field-mappings/{id}:
 *   delete:
 *     summary: Eliminar mapeo de campo
 *     tags: [Field Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mapeo
 *     responses:
 *       200:
 *         description: Mapeo eliminado
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => fieldMappingController.deleteFieldMapping(req, res)
);

module.exports = router;