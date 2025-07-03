const express = require('express');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const areaRoutes = require('./area.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const timeEntryRoutes = require('./timeEntry.routes');

const router = express.Router();

/**
 * Main routes configuration
 */

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'TeamTime API',
        version: '1.0.0'
    });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/areas', areaRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/time-entries', timeEntryRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl
    });
});

module.exports = router;
