const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserService = require('../../src/services/user.service');
const UserRepository = require('../../src/repositories/user.repository');
const { USER_ROLES, ERROR_MESSAGES } = require('../../src/utils/constants');

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/repositories/user.repository');

describe('UserService', () => {
    let userService;
    let mockUserRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        userService = new UserService();
        mockUserRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getStats: jest.fn(),
        };
        userService.userRepository = mockUserRepository;
    });

    describe('createUser', () => {
        const mockUserData = {
            email: 'test@test.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-123'
        };

        const mockRequestingUser = {
            userId: 'admin-123',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR
        };

        test('should create user successfully', async () => {
            // Arrange
            const hashedPassword = 'hashedPassword123';
            const mockCreatedUser = {
                id: 'user-123',
                ...mockUserData,
                password: hashedPassword,
                createdBy: mockRequestingUser.userId
            };

            mockUserRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue(hashedPassword);
            mockUserRepository.create.mockResolvedValue(mockCreatedUser);

            // Act
            const result = await userService.createUser(mockUserData, mockRequestingUser);

            // Assert
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(mockUserData.email);
            expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 12);
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                ...mockUserData,
                password: hashedPassword,
                createdBy: mockRequestingUser.userId
            });
            expect(result).toEqual(expect.objectContaining({
                id: 'user-123',
                email: mockUserData.email,
                firstName: mockUserData.firstName
            }));
            expect(result.password).toBeUndefined();
        });

        test('should create user without requesting user (registration)', async () => {
            // Arrange
            const hashedPassword = 'hashedPassword123';
            const mockCreatedUser = {
                id: 'user-123',
                ...mockUserData,
                password: hashedPassword
            };

            mockUserRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue(hashedPassword);
            mockUserRepository.create.mockResolvedValue(mockCreatedUser);

            // Act
            const result = await userService.createUser(mockUserData);

            // Assert
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                ...mockUserData,
                password: hashedPassword
            });
        });

        test('should throw error if email already exists', async () => {
            // Arrange
            mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

            // Act & Assert
            await expect(userService.createUser(mockUserData, mockRequestingUser))
                .rejects.toThrow('El email ya está registrado');
        });
    });

    describe('authenticateUser', () => {
        const email = 'test@test.com';
        const password = 'password123';
        const mockUser = {
            id: 'user-123',
            email,
            password: 'hashedPassword',
            firstName: 'Test',
            lastName: 'User',
            role: USER_ROLES.COLABORADOR,
            isActive: true
        };

        test('should authenticate user successfully', async () => {
            // Arrange
            const token = 'jwt-token';
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue(token);

            // Act
            const result = await userService.authenticateUser(email, password);

            // Assert
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
            expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
            expect(jwt.sign).toHaveBeenCalledWith(
                {
                    userId: mockUser.id,
                    email: mockUser.email,
                    role: mockUser.role
                },
                expect.any(String),
                { expiresIn: expect.any(String) }
            );
            expect(result).toEqual({
                user: expect.objectContaining({
                    id: mockUser.id,
                    email: mockUser.email
                }),
                token
            });
            expect(result.user.password).toBeUndefined();
        });

        test('should throw error if user not found', async () => {
            // Arrange
            mockUserRepository.findByEmail.mockResolvedValue(null);

            // Act & Assert
            await expect(userService.authenticateUser(email, password))
                .rejects.toThrow('Credenciales inválidas');
        });

        test('should throw error if user is inactive', async () => {
            // Arrange
            mockUserRepository.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

            // Act & Assert
            await expect(userService.authenticateUser(email, password))
                .rejects.toThrow('Usuario inactivo. Contacte al administrador');
        });

        test('should throw error if password is invalid', async () => {
            // Arrange
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(userService.authenticateUser(email, password))
                .rejects.toThrow('Credenciales inválidas');
        });
    });

    describe('getUserById', () => {
        test('should return user without password', async () => {
            // Arrange
            const mockUser = {
                id: 'user-123',
                email: 'test@test.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User'
            };
            mockUserRepository.findById.mockResolvedValue(mockUser);

            // Act
            const result = await userService.getUserById('user-123');

            // Assert
            expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
            expect(result).toEqual(expect.objectContaining({
                id: 'user-123',
                email: 'test@test.com',
                firstName: 'Test',
                lastName: 'User'
            }));
            expect(result.password).toBeUndefined();
        });

        test('should throw error if user not found', async () => {
            // Arrange
            mockUserRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(userService.getUserById('nonexistent-id'))
                .rejects.toThrow('Usuario no encontrado');
        });
    });

    describe('changePassword', () => {
        const userId = 'user-123';
        const currentPassword = 'oldPassword';
        const newPassword = 'newPassword';

        test('should change password successfully', async () => {
            // Arrange
            const mockUser = {
                id: userId,
                password: 'hashedOldPassword',
                email: 'test@test.com'
            };
            const hashedNewPassword = 'hashedNewPassword';

            mockUserRepository.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue(hashedNewPassword);
            mockUserRepository.update.mockResolvedValue();

            // Act
            await userService.changePassword(userId, currentPassword, newPassword);

            // Assert
            expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, mockUser.password);
            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
            expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { password: hashedNewPassword });
        });

        test('should throw error if current password is incorrect', async () => {
            // Arrange
            const mockUser = { id: userId, password: 'hashedOldPassword' };
            mockUserRepository.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(userService.changePassword(userId, currentPassword, newPassword))
                .rejects.toThrow('Contraseña actual incorrecta');
        });
    });

    describe('canUserUpdateUser', () => {
        test('should allow admin to update any user', () => {
            // Arrange
            const adminUser = { userId: 'admin-123', role: USER_ROLES.ADMINISTRADOR };
            const targetUser = { id: 'user-123', role: USER_ROLES.COLABORADOR };

            // Act
            const result = userService.canUserUpdateUser(adminUser, targetUser);

            // Assert
            expect(result).toBe(true);
        });

        test('should allow coordinator to update collaborator in same area', () => {
            // Arrange
            const coordinatorUser = {
                userId: 'coord-123',
                role: USER_ROLES.COORDINADOR,
                areaId: 'area-123'
            };
            const targetUser = {
                id: 'user-123',
                role: USER_ROLES.COLABORADOR,
                areaId: 'area-123'
            };

            // Act
            const result = userService.canUserUpdateUser(coordinatorUser, targetUser);

            // Assert
            expect(result).toBe(true);
        });

        test('should allow user to update their own profile', () => {
            // Arrange
            const user = { userId: 'user-123', role: USER_ROLES.COLABORADOR };
            const targetUser = { id: 'user-123', role: USER_ROLES.COLABORADOR };

            // Act
            const result = userService.canUserUpdateUser(user, targetUser);

            // Assert
            expect(result).toBe(true);
        });

        test('should not allow coordinator to update user from different area', () => {
            // Arrange
            const coordinatorUser = {
                userId: 'coord-123',
                role: USER_ROLES.COORDINADOR,
                areaId: 'area-123'
            };
            const targetUser = {
                id: 'user-123',
                role: USER_ROLES.COLABORADOR,
                areaId: 'area-456'
            };

            // Act
            const result = userService.canUserUpdateUser(coordinatorUser, targetUser);

            // Assert
            expect(result).toBe(false);
        });
    });
});
