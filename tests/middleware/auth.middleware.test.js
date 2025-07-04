const jwt = require('jsonwebtoken');
const { authenticateToken, optionalAuth, requireRole, requireSameArea, checkResourceAccess } = require('../../src/middleware/auth.middleware');
const ApiResponse = require('../../src/utils/response');
const { ERROR_MESSAGES } = require('../../src/utils/constants');
const config = require('../../src/config');

// Mock de dependencias
jest.mock('jsonwebtoken');
jest.mock('../../src/utils/response');
jest.mock('../../src/utils/logger');
jest.mock('../../src/config');

const logger = require('../../src/utils/logger');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Limpiar mocks
        jest.clearAllMocks();

        // Configurar objetos request/response mock
        req = {
            headers: {},
            ip: '127.0.0.1',
            path: '/api/test',
            get: jest.fn().mockReturnValue('test-user-agent')
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        // Configurar config mock
        config.JWT_SECRET = 'test-secret';

        // Configurar ApiResponse mock
        ApiResponse.error = jest.fn();
    });

    describe('authenticateToken', () => {
        it('debería autenticar correctamente con token válido', () => {
            const token = 'valid-token';
            const decoded = {
                userId: 'user-1',
                email: 'test@example.com',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };

            req.headers['authorization'] = `Bearer ${token}`;
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, decoded);
            });

            authenticateToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith(token, config.JWT_SECRET, expect.any(Function));
            expect(req.user).toEqual(decoded);
            expect(next).toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith('Usuario autenticado', {
                userId: decoded.userId,
                role: decoded.role,
                path: req.path
            });
        });

        it('debería fallar si no hay token', () => {
            authenticateToken(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            expect(logger.warn).toHaveBeenCalledWith('Intento de acceso sin token', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('debería fallar si el header de autorización no tiene formato Bearer', () => {
            req.headers['authorization'] = 'invalid-format';

            authenticateToken(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            expect(next).not.toHaveBeenCalled();
        });

        it('debería fallar si el token es inválido', () => {
            const token = 'invalid-token';
            req.headers['authorization'] = `Bearer ${token}`;

            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Token inválido'), null);
            });

            authenticateToken(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.INVALID_TOKEN, 401);
            expect(logger.warn).toHaveBeenCalledWith('Token inválido utilizado', {
                error: 'Token inválido',
                ip: req.ip,
                path: req.path
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('debería manejar errores inesperados', () => {
            req.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockImplementation(() => {
                throw new Error('Error inesperado');
            });

            authenticateToken(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, 'Error interno del servidor', 500);
            expect(logger.error).toHaveBeenCalledWith('Error en autenticación', {
                error: 'Error inesperado',
                stack: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('optionalAuth', () => {
        it('debería continuar sin autenticar si no hay token', () => {
            optionalAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toBeUndefined();
        });

        it('debería autenticar si el token es válido', () => {
            const token = 'valid-token';
            const decoded = {
                userId: 'user-1',
                email: 'test@example.com',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };

            req.headers['authorization'] = `Bearer ${token}`;
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, decoded);
            });

            optionalAuth(req, res, next);

            expect(req.user).toEqual(decoded);
            expect(next).toHaveBeenCalled();
        });

        it('debería continuar sin autenticar si el token es inválido', () => {
            const token = 'invalid-token';
            req.headers['authorization'] = `Bearer ${token}`;

            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Token inválido'), null);
            });

            optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('requireRole', () => {
        beforeEach(() => {
            req.user = {
                userId: 'user-1',
                email: 'test@example.com',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };
        });

        it('debería permitir acceso si el usuario tiene el rol requerido', () => {
            const middleware = requireRole('COLABORADOR');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería permitir acceso si el usuario tiene uno de los roles requeridos', () => {
            const middleware = requireRole(['COLABORADOR', 'COORDINADOR']);

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería denegar acceso si el usuario no tiene el rol requerido', () => {
            const middleware = requireRole('ADMINISTRADOR');

            middleware(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.FORBIDDEN, 403);
            expect(logger.warn).toHaveBeenCalledWith('Acceso denegado por rol insuficiente', {
                userId: req.user.userId,
                userRole: req.user.role,
                requiredRoles: ['ADMINISTRADOR'],
                path: req.path
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('debería denegar acceso si no hay usuario autenticado', () => {
            req.user = undefined;
            const middleware = requireRole('COLABORADOR');

            middleware(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            expect(next).not.toHaveBeenCalled();
        });

        it('debería manejar errores inesperados', () => {
            req.user = null; // Esto podría causar un error
            const middleware = requireRole('COLABORADOR');

            // Simular un error al acceder a req.user.role
            Object.defineProperty(req, 'user', {
                get: () => {
                    throw new Error('Error inesperado');
                }
            });

            middleware(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, 'Error interno del servidor', 500);
            expect(logger.error).toHaveBeenCalledWith('Error en verificación de rol', {
                error: 'Error inesperado',
                stack: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('requireSameArea', () => {
        it('debería permitir acceso a administradores', () => {
            req.user = {
                userId: 'admin-1',
                email: 'admin@example.com',
                role: 'ADMINISTRADOR',
                areaId: 'area-1'
            };

            requireSameArea(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería permitir acceso a otros roles (lógica básica)', () => {
            req.user = {
                userId: 'user-1',
                email: 'user@example.com',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };

            requireSameArea(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería denegar acceso si no hay usuario autenticado', () => {
            req.user = undefined;

            requireSameArea(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            expect(next).not.toHaveBeenCalled();
        });

        it('debería manejar errores inesperados', () => {
            Object.defineProperty(req, 'user', {
                get: () => {
                    throw new Error('Error inesperado');
                }
            });

            requireSameArea(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, 'Error interno del servidor', 500);
            expect(logger.error).toHaveBeenCalledWith('Error en verificación de área', {
                error: 'Error inesperado',
                stack: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('checkResourceAccess', () => {
        it('debería permitir acceso a administradores', () => {
            req.user = {
                userId: 'admin-1',
                email: 'admin@example.com',
                role: 'ADMINISTRADOR',
                areaId: 'area-1'
            };

            const middleware = checkResourceAccess('project');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería permitir acceso a otros roles (lógica básica)', () => {
            req.user = {
                userId: 'user-1',
                email: 'user@example.com',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };

            const middleware = checkResourceAccess('project');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debería denegar acceso si no hay usuario autenticado', () => {
            req.user = undefined;

            const middleware = checkResourceAccess('project');
            middleware(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            expect(next).not.toHaveBeenCalled();
        });

        it('debería manejar errores inesperados', () => {
            Object.defineProperty(req, 'user', {
                get: () => {
                    throw new Error('Error inesperado');
                }
            });

            const middleware = checkResourceAccess('project');
            middleware(req, res, next);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, 'Error interno del servidor', 500);
            expect(logger.error).toHaveBeenCalledWith('Error en verificación de acceso a recurso', {
                error: 'Error inesperado',
                stack: expect.any(String),
                resourceType: 'project'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
