const UserService = require('../../src/services/user.service');
const ApiResponse = require('../../src/utils/response');
const { LIMITS } = require('../../src/utils/constants');

// Mock de dependencias
jest.mock('../../src/services/user.service');
jest.mock('../../src/utils/response');
jest.mock('../../src/utils/logger');

const logger = require('../../src/utils/logger');

describe('UserController', () => {
    let req, res, mockUserService, userController;

    beforeEach(() => {
        // Limpiar mocks
        jest.clearAllMocks();

        // Configurar objetos request/response mock
        req = {
            body: {},
            params: {},
            query: {},
            user: {
                userId: 'admin-1',
                email: 'admin@test.com',
                role: 'ADMINISTRADOR'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Configurar UserService mock
        mockUserService = {
            createUser: jest.fn(),
            getUserById: jest.fn(),
            getUsers: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            getUserStats: jest.fn()
        };

        UserService.mockImplementation(() => mockUserService);

        // Configurar ApiResponse mock
        ApiResponse.success = jest.fn();
        ApiResponse.error = jest.fn();

        // Obtener instancia del controlador (es un singleton)
        userController = require('../../src/controllers/user.controller');

        // Inyectar el UserService mockeado en el controlador
        userController.userService = mockUserService;
    });

    describe('createUser', () => {
        it('debería crear un usuario exitosamente', async () => {
            const userData = {
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'COLABORADOR',
                areaId: 'area-1'
            };

            const createdUser = { id: 'user-1', ...userData };

            req.body = userData;
            mockUserService.createUser.mockResolvedValue(createdUser);

            await userController.createUser(req, res);

            expect(mockUserService.createUser).toHaveBeenCalledWith(userData, req.user);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                createdUser,
                'Usuario creado exitosamente',
                201
            );
            expect(logger.info).toHaveBeenCalledWith(
                `Usuario creado: ${createdUser.email} por ${req.user.email}`
            );
        });

        it('debería manejar errores al crear usuario', async () => {
            const userData = { email: 'invalid-email' };
            const errorMessage = 'Email inválido';

            req.body = userData;
            mockUserService.createUser.mockRejectedValue(new Error(errorMessage));

            await userController.createUser(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al crear usuario:', expect.any(Error));
        });
    });

    describe('getUserById', () => {
        it('debería obtener un usuario por ID exitosamente', async () => {
            const userId = 'user-1';
            const user = {
                id: userId,
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User'
            };

            req.params.id = userId;
            mockUserService.getUserById.mockResolvedValue(user);

            await userController.getUserById(req, res);

            expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                user,
                'Usuario obtenido exitosamente'
            );
        });

        it('debería manejar errores cuando el usuario no existe', async () => {
            const userId = 'non-existent';
            const errorMessage = 'Usuario no encontrado';

            req.params.id = userId;
            mockUserService.getUserById.mockRejectedValue(new Error(errorMessage));

            await userController.getUserById(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 404);
            expect(logger.error).toHaveBeenCalledWith('Error al obtener usuario:', expect.any(Error));
        });
    });

    describe('getUsers', () => {
        it('debería obtener usuarios con parámetros por defecto', async () => {
            const mockResult = {
                users: [
                    { id: 'user-1', email: 'user1@test.com' },
                    { id: 'user-2', email: 'user2@test.com' }
                ],
                total: 2,
                page: 1,
                totalPages: 1
            };

            mockUserService.getUsers.mockResolvedValue(mockResult);

            await userController.getUsers(req, res);

            expect(mockUserService.getUsers).toHaveBeenCalledWith(
                {},
                { page: 1, limit: LIMITS.PAGE_SIZE_DEFAULT }
            );
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                mockResult,
                'Usuarios obtenidos exitosamente'
            );
        });

        it('debería obtener usuarios con filtros y paginación', async () => {
            const mockResult = {
                users: [{ id: 'user-1', email: 'test@test.com' }],
                total: 1,
                page: 2,
                totalPages: 1
            };

            req.query = {
                page: '2',
                limit: '10',
                search: 'test',
                role: 'COLABORADOR',
                areaId: 'area-1',
                isActive: 'true'
            };

            mockUserService.getUsers.mockResolvedValue(mockResult);

            await userController.getUsers(req, res);

            expect(mockUserService.getUsers).toHaveBeenCalledWith(
                {
                    search: 'test',
                    role: 'COLABORADOR',
                    areaId: 'area-1',
                    isActive: true
                },
                { page: 2, limit: 10 }
            );
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                mockResult,
                'Usuarios obtenidos exitosamente'
            );
        });

        it('debería limitar el tamaño de página al máximo permitido', async () => {
            const mockResult = { users: [], total: 0, page: 1, totalPages: 0 };

            req.query = {
                page: '1',
                limit: '1000' // Excede el máximo
            };

            mockUserService.getUsers.mockResolvedValue(mockResult);

            await userController.getUsers(req, res);

            expect(mockUserService.getUsers).toHaveBeenCalledWith(
                {},
                { page: 1, limit: LIMITS.PAGE_SIZE_MAX }
            );
        });

        it('debería usar página 1 para números de página inválidos', async () => {
            const mockResult = { users: [], total: 0, page: 1, totalPages: 0 };

            req.query = {
                page: '0', // Inválido
                limit: '10'
            };

            mockUserService.getUsers.mockResolvedValue(mockResult);

            await userController.getUsers(req, res);

            expect(mockUserService.getUsers).toHaveBeenCalledWith(
                {},
                { page: 1, limit: 10 }
            );
        });

        it('debería manejar errores al obtener usuarios', async () => {
            const errorMessage = 'Error al obtener usuarios';
            mockUserService.getUsers.mockRejectedValue(new Error(errorMessage));

            await userController.getUsers(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al obtener usuarios:', expect.any(Error));
        });
    });

    describe('updateUser', () => {
        it('debería actualizar un usuario exitosamente', async () => {
            const userId = 'user-1';
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name'
            };
            const updatedUser = {
                id: userId,
                email: 'user@test.com',
                ...updateData
            };

            req.params.id = userId;
            req.body = updateData;
            mockUserService.updateUser.mockResolvedValue(updatedUser);

            await userController.updateUser(req, res);

            expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, updateData, req.user);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                updatedUser,
                'Usuario actualizado exitosamente'
            );
            expect(logger.info).toHaveBeenCalledWith(
                `Usuario actualizado: ${updatedUser.email} por ${req.user.email}`
            );
        });

        it('debería manejar errores al actualizar usuario', async () => {
            const userId = 'user-1';
            const errorMessage = 'Usuario no encontrado';

            req.params.id = userId;
            req.body = { firstName: 'Test' };
            mockUserService.updateUser.mockRejectedValue(new Error(errorMessage));

            await userController.updateUser(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al actualizar usuario:', expect.any(Error));
        });
    });

    describe('deleteUser', () => {
        it('debería eliminar un usuario exitosamente', async () => {
            const userId = 'user-1';

            req.params.id = userId;
            mockUserService.deleteUser.mockResolvedValue();

            await userController.deleteUser(req, res);

            expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId, req.user);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                null,
                'Usuario eliminado exitosamente'
            );
            expect(logger.info).toHaveBeenCalledWith(
                `Usuario eliminado: ${userId} por ${req.user.email}`
            );
        });

        it('debería manejar errores al eliminar usuario', async () => {
            const userId = 'user-1';
            const errorMessage = 'No se puede eliminar el usuario';

            req.params.id = userId;
            mockUserService.deleteUser.mockRejectedValue(new Error(errorMessage));

            await userController.deleteUser(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al eliminar usuario:', expect.any(Error));
        });
    });

    describe('toggleUserStatus', () => {
        it('debería activar un usuario exitosamente', async () => {
            const userId = 'user-1';
            const updatedUser = {
                id: userId,
                email: 'user@test.com',
                isActive: true
            };

            req.params.id = userId;
            req.body = { isActive: true };
            mockUserService.updateUser.mockResolvedValue(updatedUser);

            await userController.toggleUserStatus(req, res);

            expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, { isActive: true }, req.user);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                updatedUser,
                'Usuario activado exitosamente'
            );
            expect(logger.info).toHaveBeenCalledWith(
                `Estado de usuario cambiado: ${updatedUser.email} - Activado por ${req.user.email}`
            );
        });

        it('debería desactivar un usuario exitosamente', async () => {
            const userId = 'user-1';
            const updatedUser = {
                id: userId,
                email: 'user@test.com',
                isActive: false
            };

            req.params.id = userId;
            req.body = { isActive: false };
            mockUserService.updateUser.mockResolvedValue(updatedUser);

            await userController.toggleUserStatus(req, res);

            expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, { isActive: false }, req.user);
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                updatedUser,
                'Usuario desactivado exitosamente'
            );
            expect(logger.info).toHaveBeenCalledWith(
                `Estado de usuario cambiado: ${updatedUser.email} - Desactivado por ${req.user.email}`
            );
        });

        it('debería manejar errores al cambiar estado del usuario', async () => {
            const userId = 'user-1';
            const errorMessage = 'Usuario no encontrado';

            req.params.id = userId;
            req.body = { isActive: true };
            mockUserService.updateUser.mockRejectedValue(new Error(errorMessage));

            await userController.toggleUserStatus(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al cambiar estado del usuario:', expect.any(Error));
        });
    });

    describe('getUserStats', () => {
        it('debería obtener estadísticas de usuarios exitosamente', async () => {
            const mockStats = {
                totalUsers: 100,
                activeUsers: 85,
                usersByRole: {
                    ADMINISTRADOR: 5,
                    COORDINADOR: 10,
                    COLABORADOR: 85
                },
                usersByArea: {
                    'area-1': 50,
                    'area-2': 35,
                    'area-3': 15
                }
            };

            mockUserService.getUserStats.mockResolvedValue(mockStats);

            await userController.getUserStats(req, res);

            expect(mockUserService.getUserStats).toHaveBeenCalled();
            expect(ApiResponse.success).toHaveBeenCalledWith(
                res,
                mockStats,
                'Estadísticas de usuarios obtenidas exitosamente'
            );
        });

        it('debería manejar errores al obtener estadísticas', async () => {
            const errorMessage = 'Error al calcular estadísticas';
            mockUserService.getUserStats.mockRejectedValue(new Error(errorMessage));

            await userController.getUserStats(req, res);

            expect(ApiResponse.error).toHaveBeenCalledWith(res, errorMessage, 400);
            expect(logger.error).toHaveBeenCalledWith('Error al obtener estadísticas de usuarios:', expect.any(Error));
        });
    });
});
