/**
 * Test básico para verificar configuración
 */

const request = require('supertest');
const app = require('../src/server');

describe('TeamTime API', () => {
    describe('Health Check', () => {
        it('should return API status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('service', 'TeamTime API');
        });
    });

    describe('Root endpoint', () => {
        it('should return application info', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'TeamTime API');
            expect(response.body).toHaveProperty('version', '1.0.0');
        });
    });

    describe('404 handling', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/api/unknown-route')
                .expect(404);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Endpoint no encontrado');
        });
    });
});
