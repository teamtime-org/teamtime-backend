const ProjectService = require('../../src/services/project.service');
const ProjectRepository = require('../../src/repositories/project.repository');
const { USER_ROLES, PROJECT_STATUS, ERROR_MESSAGES } = require('../../src/utils/constants');

// Mock the repository
jest.mock('../../src/repositories/project.repository');

describe('ProjectService', () => {
    let projectService;
    let mockProjectRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        projectService = new ProjectService();
        mockProjectRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            findByUserArea: jest.fn(),
        };
        projectService.projectRepository = mockProjectRepository;
    });

    describe('createProject', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-123'
        };

        const mockProjectData = {
            name: 'Test Project',
            description: 'Test Description',
            areaId: 'area-123',
            priority: 'HIGH',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            estimatedHours: 100
        };

        test('should create project successfully', async () => {
            // Arrange
            const expectedProject = {
                id: 'project-123',
                ...mockProjectData,
                createdBy: mockRequestingUser.userId
            };

            // Mock canUserCreateProject to return true
            projectService.canUserCreateProject = jest.fn().mockReturnValue(true);
            mockProjectRepository.create.mockResolvedValue(expectedProject);

            // Act
            const result = await projectService.createProject(mockProjectData, mockRequestingUser);

            // Assert
            expect(projectService.canUserCreateProject).toHaveBeenCalledWith(mockRequestingUser, mockProjectData.areaId);
            expect(mockProjectRepository.create).toHaveBeenCalledWith({
                ...mockProjectData,
                createdBy: mockRequestingUser.userId
            });
            expect(result).toEqual(expectedProject);
        });

        test('should throw error if user cannot create project', async () => {
            // Arrange
            projectService.canUserCreateProject = jest.fn().mockReturnValue(false);

            // Act & Assert
            await expect(projectService.createProject(mockProjectData, mockRequestingUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        test('should throw error if end date is before start date', async () => {
            // Arrange
            const invalidProjectData = {
                ...mockProjectData,
                startDate: '2025-12-31',
                endDate: '2025-01-01'
            };
            projectService.canUserCreateProject = jest.fn().mockReturnValue(true);

            // Act & Assert
            await expect(projectService.createProject(invalidProjectData, mockRequestingUser))
                .rejects.toThrow('La fecha de fin debe ser posterior a la fecha de inicio');
        });
    });

    describe('getProjectById', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-123'
        };

        test('should return project when found and user has access', async () => {
            // Arrange
            const mockProject = {
                id: 'project-123',
                name: 'Test Project',
                areaId: 'area-123'
            };
            mockProjectRepository.findById.mockResolvedValue(mockProject);
            projectService.canUserAccessProject = jest.fn().mockReturnValue(true);

            // Act
            const result = await projectService.getProjectById('project-123', mockRequestingUser);

            // Assert
            expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-123');
            expect(projectService.canUserAccessProject).toHaveBeenCalledWith(mockRequestingUser, mockProject);
            expect(result).toEqual(mockProject);
        });

        test('should throw error when project not found', async () => {
            // Arrange
            mockProjectRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(projectService.getProjectById('nonexistent-id', mockRequestingUser))
                .rejects.toThrow('Proyecto no encontrado');
        });

        test('should throw error when user has no access', async () => {
            // Arrange
            const mockProject = { id: 'project-123', name: 'Test Project' };
            mockProjectRepository.findById.mockResolvedValue(mockProject);
            projectService.canUserAccessProject = jest.fn().mockReturnValue(false);

            // Act & Assert
            await expect(projectService.getProjectById('project-123', mockRequestingUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });
    });

    describe('getProjects', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            role: USER_ROLES.COORDINADOR,
            areaId: 'area-123'
        };

        test('should return projects with user filters applied', async () => {
            // Arrange
            const mockFilters = { status: PROJECT_STATUS.ACTIVE };
            const mockPagination = { page: 1, limit: 10 };
            const expectedFilters = { ...mockFilters, areaId: 'area-123' };
            const mockResult = { projects: [], total: 0 };

            projectService.applyUserFilters = jest.fn().mockReturnValue(expectedFilters);
            mockProjectRepository.findMany.mockResolvedValue(mockResult);

            // Act
            const result = await projectService.getProjects(mockFilters, mockPagination, mockRequestingUser);

            // Assert
            expect(projectService.applyUserFilters).toHaveBeenCalledWith(mockFilters, mockRequestingUser);
            expect(mockProjectRepository.findMany).toHaveBeenCalledWith(expectedFilters, mockPagination);
            expect(result).toEqual(mockResult);
        });
    });

    describe('updateProject', () => {
        const mockRequestingUser = {
            userId: 'user-123',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-123'
        };

        test('should update project successfully', async () => {
            // Arrange
            const projectId = 'project-123';
            const updateData = { name: 'Updated Project' };
            const existingProject = {
                id: projectId,
                name: 'Old Project',
                areaId: 'area-123'
            };
            const updatedProject = { ...existingProject, ...updateData };

            mockProjectRepository.findById.mockResolvedValue(existingProject);
            projectService.canUserUpdateProject = jest.fn().mockReturnValue(true);
            mockProjectRepository.update.mockResolvedValue(updatedProject);

            // Act
            const result = await projectService.updateProject(projectId, updateData, mockRequestingUser);

            // Assert
            expect(mockProjectRepository.findById).toHaveBeenCalledWith(projectId);
            expect(projectService.canUserUpdateProject).toHaveBeenCalledWith(mockRequestingUser, existingProject);
            expect(mockProjectRepository.update).toHaveBeenCalledWith(projectId, updateData);
            expect(result).toEqual(updatedProject);
        });

        test('should throw error if project not found', async () => {
            // Arrange
            mockProjectRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(projectService.updateProject('nonexistent-id', {}, mockRequestingUser))
                .rejects.toThrow('Proyecto no encontrado');
        });

        test('should throw error if user cannot update project', async () => {
            // Arrange
            const existingProject = { id: 'project-123', areaId: 'area-456' };
            mockProjectRepository.findById.mockResolvedValue(existingProject);
            projectService.canUserUpdateProject = jest.fn().mockReturnValue(false);

            // Act & Assert
            await expect(projectService.updateProject('project-123', {}, mockRequestingUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });
    });

    describe('canUserCreateProject', () => {
        test('should allow admin to create project in any area', () => {
            // Arrange
            const adminUser = { role: USER_ROLES.ADMINISTRADOR };

            // Act
            const result = projectService.canUserCreateProject(adminUser, 'any-area-id');

            // Assert
            expect(result).toBe(true);
        });

        test('should allow coordinator to create project in their area', () => {
            // Arrange
            const coordinatorUser = {
                role: USER_ROLES.COORDINADOR,
                areaId: 'area-123'
            };

            // Act
            const result = projectService.canUserCreateProject(coordinatorUser, 'area-123');

            // Assert
            expect(result).toBe(true);
        });

        test('should not allow coordinator to create project in different area', () => {
            // Arrange
            const coordinatorUser = {
                role: USER_ROLES.COORDINADOR,
                areaId: 'area-123'
            };

            // Act
            const result = projectService.canUserCreateProject(coordinatorUser, 'area-456');

            // Assert
            expect(result).toBe(false);
        });

        test('should not allow collaborator to create project', () => {
            // Arrange
            const collaboratorUser = {
                role: USER_ROLES.COLABORADOR,
                areaId: 'area-123'
            };

            // Act
            const result = projectService.canUserCreateProject(collaboratorUser, 'area-123');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('canUserAccessProject', () => {
        test('should allow admin to access any project', () => {
            // Arrange
            const adminUser = { role: USER_ROLES.ADMINISTRADOR };
            const project = { areaId: 'any-area' };

            // Act
            const result = projectService.canUserAccessProject(adminUser, project);

            // Assert
            expect(result).toBe(true);
        });

        test('should allow user to access project in their area', () => {
            // Arrange
            const user = { role: USER_ROLES.COORDINADOR, areaId: 'area-123' };
            const project = { areaId: 'area-123' };

            // Act
            const result = projectService.canUserAccessProject(user, project);

            // Assert
            expect(result).toBe(true);
        });

        test('should not allow user to access project in different area', () => {
            // Arrange
            const user = { role: USER_ROLES.COORDINADOR, areaId: 'area-123' };
            const project = { areaId: 'area-456' };

            // Act
            const result = projectService.canUserAccessProject(user, project);

            // Assert
            expect(result).toBe(false);
        });
    });
});
