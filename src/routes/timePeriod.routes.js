const express = require('express');
const router = express.Router();
const timePeriodController = require('../controllers/timePeriod.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Time Periods
 *   description: API para gestión de períodos de tiempo
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TimePeriod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         year:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2050
 *         month:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         periodNumber:
 *           type: integer
 *           minimum: 1
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         referenceHours:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           maximum: 168
 *         type:
 *           type: string
 *           enum: [weekly, biweekly]
 *         description:
 *           type: string
 *           maxLength: 255
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /time-periods:
 *   get:
 *     summary: Obtener todos los períodos de tiempo
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Registros por página
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filtrar por año
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filtrar por mes
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [weekly, biweekly]
 *         description: Filtrar por tipo de período
 *     responses:
 *       200:
 *         description: Períodos obtenidos exitosamente
 */
router.get('/', timePeriodController.getAll);

/**
 * @swagger
 * /time-periods/current:
 *   get:
 *     summary: Obtener el período actual
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Período actual obtenido exitosamente
 *       404:
 *         description: No hay período activo
 */
router.get('/current', timePeriodController.getCurrent);

/**
 * @swagger
 * /time-periods/range:
 *   get:
 *     summary: Obtener períodos por rango de fecha
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Períodos obtenidos exitosamente
 *       400:
 *         description: Parámetros requeridos faltantes
 */
router.get('/range', timePeriodController.getByDateRange);

/**
 * @swagger
 * /time-periods/bulk:
 *   post:
 *     summary: Crear múltiples períodos de tiempo
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               periods:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TimePeriod'
 *     responses:
 *       201:
 *         description: Períodos creados exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Sin permisos (solo administradores)
 */
router.post('/bulk', timePeriodController.createBulk);

/**
 * @swagger
 * /time-periods/{id}:
 *   get:
 *     summary: Obtener período por ID
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Período obtenido exitosamente
 *       404:
 *         description: Período no encontrado
 */
router.get('/:id', timePeriodController.getById);

/**
 * @swagger
 * /time-periods/{id}/statistics:
 *   get:
 *     summary: Obtener estadísticas de un período
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       404:
 *         description: Período no encontrado
 */
router.get('/:id/statistics', timePeriodController.getStatistics);

/**
 * @swagger
 * /time-periods/{id}/comparison:
 *   get:
 *     summary: Comparar horas trabajadas vs referencia
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario específico (opcional)
 *     responses:
 *       200:
 *         description: Comparación obtenida exitosamente
 *       404:
 *         description: Período no encontrado
 */
router.get('/:id/comparison', timePeriodController.getComparison);

/**
 * @swagger
 * /time-periods:
 *   post:
 *     summary: Crear nuevo período de tiempo
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimePeriod'
 *     responses:
 *       201:
 *         description: Período creado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Sin permisos (solo administradores)
 */
router.post('/', timePeriodController.create);

/**
 * @swagger
 * /time-periods/{id}:
 *   put:
 *     summary: Actualizar período de tiempo
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimePeriod'
 *     responses:
 *       200:
 *         description: Período actualizado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Sin permisos (solo administradores)
 *       404:
 *         description: Período no encontrado
 */
router.put('/:id', timePeriodController.update);

/**
 * @swagger
 * /time-periods/{id}:
 *   delete:
 *     summary: Eliminar período de tiempo
 *     tags: [Time Periods]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Período eliminado exitosamente
 *       403:
 *         description: Sin permisos (solo administradores)
 *       404:
 *         description: Período no encontrado
 */
router.delete('/:id', timePeriodController.delete);

module.exports = router;