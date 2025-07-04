const AreaService = require('../../src/services/area.service');
const AreaRepository = require('../../src/repositories/area.repository');
const { USER_ROLES, ERROR_MESSAGES } = require('../../src/utils/constants');

// Mock the repository
jest.mock('../../src/repositories/area.repository');

describe('AreaService', () => {
    let areaService;
    let mockAreaRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        areaService = new AreaService();
        mockAreaRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByName: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            nameExists: jest.fn(),
            hasUsers: jest.fn(),
            hasActiveProjects: jest.fn(),
            getActiveUsersCount: jest.fn(),
            getActiveProjectsCount: jest.fn(),
        };
        areaService.areaRepository = mockAreaRepository;
    });

    describe('createArea', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR
        };

        const mockAreaData = {
            name: 'Test Area',
            description: 'Test Description',
            color: '#FF0000'
        };

        test('should create area successfully as admin', async () => {
            // Arrange
            const expectedArea = { id: 'area-123', ...mockAreaData, createdBy: mockRequestingUser.userId };
            mockAreaRepository.findByName.mockResolvedValue(null);
            mockAreaRepository.create.mockResolvedValue(expectedArea);

            // Act
            const result = await areaService.createArea(mockAreaData, mockRequestingUser);

            // Assert
            expect(mockAreaRepository.findByName).toHaveBeenCalledWith(mockAreaData.name);
            expect(mockAreaRepository.create).toHaveBeenCalledWith({
                ...mockAreaData,
                createdBy: mockRequestingUser.userId
            });
            expect(result).toEqual(expectedArea);
        });

        test('should throw error if user is not admin', async () => {
            // Arrange
            const nonAdminUser = { ...mockRequestingUser, role: USER_ROLES.COORDINADOR };

            // Act & Assert
            await expect(areaService.createArea(mockAreaData, nonAdminUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        test('should throw error if area name already exists', async () => {
            // Arrange
            mockAreaRepository.findByName.mockResolvedValue({ id: 'existing-area' });

            // Act & Assert
            await expect(areaService.createArea(mockAreaData, mockRequestingUser))
                .rejects.toThrow('Ya existe un área con ese nombre');
        });
    });

    describe('getAreaById', () => {
        test('should return area when found', async () => {
            // Arrange
            const mockArea = { id: 'area-123', name: 'Test Area' };
            mockAreaRepository.findById.mockResolvedValue(mockArea);

            // Act
            const result = await areaService.getAreaById('area-123');

            // Assert
            expect(mockAreaRepository.findById).toHaveBeenCalledWith('area-123');
            expect(result).toEqual(mockArea);
        });

        test('should throw error when area not found', async () => {
            // Arrange
            mockAreaRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(areaService.getAreaById('nonexistent-id'))
                .rejects.toThrow('Área no encontrada');
        });
    });

    describe('getAreas', () => {
        test('should return areas with filters and pagination', async () => {
            // Arrange
            const mockFilters = { isActive: true };
            const mockPagination = { page: 1, limit: 10 };
            const mockResult = { areas: [], total: 0 };
            mockAreaRepository.findMany.mockResolvedValue(mockResult);

            // Act
            const result = await areaService.getAreas(mockFilters, mockPagination);

            // Assert
            expect(mockAreaRepository.findMany).toHaveBeenCalledWith(mockFilters, mockPagination);
            expect(result).toEqual(mockResult);
        });
    });

    describe('updateArea', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR
        };

        test('should update area successfully as admin', async () => {
            // Arrange
            const areaId = 'area-123';
            const updateData = { name: 'Updated Area' };
            const existingArea = { id: areaId, name: 'Old Area' };
            const updatedArea = { ...existingArea, ...updateData };

            mockAreaRepository.findById.mockResolvedValue(existingArea);
            mockAreaRepository.findByName.mockResolvedValue(null);
            mockAreaRepository.update.mockResolvedValue(updatedArea);

            // Act
            const result = await areaService.updateArea(areaId, updateData, mockRequestingUser);

            // Assert
            expect(mockAreaRepository.findById).toHaveBeenCalledWith(areaId);
            expect(mockAreaRepository.update).toHaveBeenCalledWith(areaId, updateData);
            expect(result).toEqual(updatedArea);
        });

        test('should throw error if user is not admin', async () => {
            // Arrange
            const nonAdminUser = { ...mockRequestingUser, role: USER_ROLES.COORDINADOR };

            // Act & Assert
            await expect(areaService.updateArea('area-123', {}, nonAdminUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });
    });

    describe('deleteArea', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR
        };

        test('should delete area successfully when no users or projects', async () => {
            // Arrange
            const areaId = 'area-123';
            const existingArea = { id: areaId, name: 'Test Area' };

            mockAreaRepository.findById.mockResolvedValue(existingArea);
            mockAreaRepository.getActiveUsersCount.mockResolvedValue(0);
            mockAreaRepository.getActiveProjectsCount.mockResolvedValue(0);
            mockAreaRepository.softDelete.mockResolvedValue(undefined);

            // Act
            await areaService.deleteArea(areaId, mockRequestingUser);

            // Assert
            expect(mockAreaRepository.softDelete).toHaveBeenCalledWith(areaId);
        });

        test('should throw error if area has users', async () => {
            // Arrange
            const areaId = 'area-123';
            const existingArea = { id: areaId, name: 'Test Area' };

            mockAreaRepository.findById.mockResolvedValue(existingArea);
            mockAreaRepository.getActiveUsersCount.mockResolvedValue(5);

            // Act & Assert
            await expect(areaService.deleteArea(areaId, mockRequestingUser))
                .rejects.toThrow('No se puede eliminar un área con usuarios activos');
        });
    });
});
