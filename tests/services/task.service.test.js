const TaskService = require('../../src/services/task.service');
const { USER_ROLES, TASK_STATUS, ERROR_MESSAGES } = require('../../src/utils/constants');

// Mock de repositorios
jest.mock('../../src/repositories/task.repository');
jest.mock('../../src/repositories/project.repository');
jest.mock('../../src/utils/logger');

const TaskRepository = require('../../src/repositories/task.repository');
const ProjectRepository = require('../../src/repositories/project.repository');
const logger = require('../../src/utils/logger');

describe('TaskService', () => {
    let taskService;
    let mockTaskRepository;
    let mockProjectRepository;

    beforeEach(() => {
        // Limpiar mocks
        jest.clearAllMocks();

        // Crear instancias mock
        mockTaskRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getTimeEntriesCount: jest.fn(),
            getTimeEntries: jest.fn(),
            getStats: jest.fn()
        };

        mockProjectRepository = {
            findById: jest.fn(),
            findMany: jest.fn()
        };

        // Configurar mocks
        TaskRepository.mockImplementation(() => mockTaskRepository);
        ProjectRepository.mockImplementation(() => mockProjectRepository);

        // Crear servicio
        taskService = new TaskService();
    });

    describe('createTask', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30); // 30 días en el futuro

        const mockProject = {
            id: 'project-1',
            name: 'Test Project',
            areaId: 'area-1',
            endDate: new Date('2025-12-31')
        };

        const mockTaskData = {
            title: 'Test Task',
            description: 'Test description',
            projectId: 'project-1',
            dueDate: futureDate
        };

        const mockAdmin = {
            userId: 'admin-1',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCoordinator = {
            userId: 'coord-1',
            email: 'coord@test.com',
            role: USER_ROLES.COORDINADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'collab-1',
            email: 'collab@test.com',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería crear una tarea exitosamente como administrador', async () => {
            const mockTask = { id: 'task-1', ...mockTaskData, createdBy: mockAdmin.userId };

            mockProjectRepository.findById.mockResolvedValue(mockProject);
            mockTaskRepository.create.mockResolvedValue(mockTask);

            const result = await taskService.createTask(mockTaskData, mockAdmin);

            expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-1');
            expect(mockTaskRepository.create).toHaveBeenCalledWith({
                ...mockTaskData,
                createdBy: mockAdmin.userId
            });
            expect(result).toEqual(mockTask);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería crear una tarea exitosamente como coordinador del área', async () => {
            const mockTask = { id: 'task-1', ...mockTaskData, createdBy: mockCoordinator.userId };

            mockProjectRepository.findById.mockResolvedValue(mockProject);
            mockTaskRepository.create.mockResolvedValue(mockTask);

            const result = await taskService.createTask(mockTaskData, mockCoordinator);

            expect(result).toEqual(mockTask);
        });

        it('debería fallar si el proyecto no existe', async () => {
            mockProjectRepository.findById.mockResolvedValue(null);

            await expect(taskService.createTask(mockTaskData, mockAdmin))
                .rejects.toThrow('Proyecto no encontrado');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            mockProjectRepository.findById.mockResolvedValue(mockProject);

            await expect(taskService.createTask(mockTaskData, mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería fallar si la fecha de vencimiento es en el pasado', async () => {
            const pastDate = new Date('2020-01-01');
            const taskDataWithPastDate = { ...mockTaskData, dueDate: pastDate };

            mockProjectRepository.findById.mockResolvedValue(mockProject);

            await expect(taskService.createTask(taskDataWithPastDate, mockAdmin))
                .rejects.toThrow('La fecha de vencimiento no puede ser en el pasado');
        });

        it('debería fallar si la fecha de vencimiento es posterior al fin del proyecto', async () => {
            const futureDate = new Date('2026-01-01');
            const taskDataWithFutureDate = { ...mockTaskData, dueDate: futureDate };

            mockProjectRepository.findById.mockResolvedValue(mockProject);

            await expect(taskService.createTask(taskDataWithFutureDate, mockAdmin))
                .rejects.toThrow('La fecha de vencimiento no puede ser posterior al fin del proyecto');
        });

        it('debería manejar errores del repositorio', async () => {
            mockProjectRepository.findById.mockResolvedValue(mockProject);
            mockTaskRepository.create.mockRejectedValue(new Error('Error de base de datos'));

            await expect(taskService.createTask(mockTaskData, mockAdmin))
                .rejects.toThrow('Error de base de datos');

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getTaskById', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            project: { areaId: 'area-1' }
        };

        const mockAdmin = {
            userId: 'admin-1',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockUser = {
            userId: 'user-1',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería obtener una tarea exitosamente', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            const result = await taskService.getTaskById('task-1', mockAdmin);

            expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-1');
            expect(result).toEqual(mockTask);
        });

        it('debería fallar si la tarea no existe', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(taskService.getTaskById('task-1', mockAdmin))
                .rejects.toThrow('Tarea no encontrada');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const userDifferentArea = { ...mockUser, areaId: 'area-2' };
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(taskService.getTaskById('task-1', userDifferentArea))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería manejar errores del repositorio', async () => {
            mockTaskRepository.findById.mockRejectedValue(new Error('Error de base de datos'));

            await expect(taskService.getTaskById('task-1', mockAdmin))
                .rejects.toThrow('Error de base de datos');

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('updateTask', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            project: { areaId: 'area-1' },
            assignedTo: 'user-1'
        };

        const mockUpdateData = {
            title: 'Updated Task',
            description: 'Updated description'
        };

        const mockAdmin = {
            userId: 'admin-1',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'user-1',
            id: 'user-1',
            email: 'user@test.com',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería actualizar una tarea exitosamente', async () => {
            const updatedTask = { ...mockTask, ...mockUpdateData };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.updateTask('task-1', mockUpdateData, mockAdmin);

            expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-1');
            expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', mockUpdateData);
            expect(result).toEqual(updatedTask);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería permitir al colaborador actualizar su tarea asignada', async () => {
            const updatedTask = { ...mockTask, ...mockUpdateData };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.updateTask('task-1', mockUpdateData, mockCollaborator);

            expect(result).toEqual(updatedTask);
        });

        it('debería fallar si la tarea no existe', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(taskService.updateTask('task-1', mockUpdateData, mockAdmin))
                .rejects.toThrow('Tarea no encontrada');
        });

        it('debería fallar si la fecha de vencimiento es en el pasado', async () => {
            const pastDate = new Date('2020-01-01');
            const updateDataWithPastDate = { ...mockUpdateData, dueDate: pastDate };

            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(taskService.updateTask('task-1', updateDataWithPastDate, mockAdmin))
                .rejects.toThrow('La fecha de vencimiento no puede ser en el pasado');
        });
    });

    describe('deleteTask', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            project: { areaId: 'area-1' }
        };

        const mockAdmin = {
            userId: 'admin-1',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'user-1',
            email: 'user@test.com',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería eliminar una tarea exitosamente', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.getTimeEntriesCount.mockResolvedValue(0);
            mockTaskRepository.softDelete.mockResolvedValue();

            await taskService.deleteTask('task-1', mockAdmin);

            expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-1');
            expect(mockTaskRepository.getTimeEntriesCount).toHaveBeenCalledWith('task-1');
            expect(mockTaskRepository.softDelete).toHaveBeenCalledWith('task-1');
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería fallar si la tarea no existe', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(taskService.deleteTask('task-1', mockAdmin))
                .rejects.toThrow('Tarea no encontrada');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(taskService.deleteTask('task-1', mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería fallar si la tarea tiene registros de tiempo', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.getTimeEntriesCount.mockResolvedValue(5);

            await expect(taskService.deleteTask('task-1', mockAdmin))
                .rejects.toThrow('No se puede eliminar una tarea con registros de tiempo');
        });
    });

    describe('changeTaskStatus', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            status: TASK_STATUS.TODO,
            project: { areaId: 'area-1' },
            assignedTo: 'user-1'
        };

        const mockAdmin = {
            userId: 'admin-1',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'user-1',
            id: 'user-1',
            email: 'user@test.com',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería cambiar el estado de una tarea exitosamente', async () => {
            const updatedTask = { ...mockTask, status: TASK_STATUS.IN_PROGRESS };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.changeTaskStatus('task-1', TASK_STATUS.IN_PROGRESS, mockAdmin);

            expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', {
                status: TASK_STATUS.IN_PROGRESS,
                completedAt: null
            });
            expect(result).toEqual(updatedTask);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería marcar completedAt cuando el estado es DONE', async () => {
            const taskInProgress = { ...mockTask, status: TASK_STATUS.IN_PROGRESS };
            const updatedTask = { ...taskInProgress, status: TASK_STATUS.DONE };

            mockTaskRepository.findById.mockResolvedValue(taskInProgress);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            await taskService.changeTaskStatus('task-1', TASK_STATUS.DONE, mockAdmin);

            expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', {
                status: TASK_STATUS.DONE,
                completedAt: expect.any(Date)
            });
        });

        it('debería permitir al colaborador cambiar el estado de su tarea asignada', async () => {
            const updatedTask = { ...mockTask, status: TASK_STATUS.IN_PROGRESS };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.changeTaskStatus('task-1', TASK_STATUS.IN_PROGRESS, mockCollaborator);

            expect(result).toEqual(updatedTask);
        });

        it('debería fallar si la transición de estado no es válida', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(taskService.changeTaskStatus('task-1', TASK_STATUS.DONE, mockAdmin))
                .rejects.toThrow('Cambio de estado no válido');
        });
    });

    describe('assignTask', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            project: { areaId: 'area-1' }
        };

        const mockAdmin = {
            userId: 'admin-1',
            email: 'admin@test.com',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCoordinator = {
            userId: 'coord-1',
            email: 'coord@test.com',
            role: USER_ROLES.COORDINADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'collab-1',
            email: 'collab@test.com',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería asignar una tarea exitosamente como administrador', async () => {
            const updatedTask = { ...mockTask, assignedTo: 'user-1' };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.assignTask('task-1', 'user-1', mockAdmin);

            expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', { assignedTo: 'user-1' });
            expect(result).toEqual(updatedTask);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería asignar una tarea exitosamente como coordinador del área', async () => {
            const updatedTask = { ...mockTask, assignedTo: 'user-1' };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTaskRepository.update.mockResolvedValue(updatedTask);

            const result = await taskService.assignTask('task-1', 'user-1', mockCoordinator);

            expect(result).toEqual(updatedTask);
        });

        it('debería fallar si el colaborador intenta asignar una tarea', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(taskService.assignTask('task-1', 'user-1', mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería fallar si la tarea no existe', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(taskService.assignTask('task-1', 'user-1', mockAdmin))
                .rejects.toThrow('Tarea no encontrada');
        });
    });

    describe('getUserTasks', () => {
        const mockTasks = {
            tasks: [
                { id: 'task-1', title: 'Task 1', assignedTo: 'user-1' },
                { id: 'task-2', title: 'Task 2', assignedTo: 'user-1' }
            ],
            total: 2
        };

        const mockAdmin = {
            userId: 'admin-1',
            role: USER_ROLES.ADMINISTRADOR
        };

        const mockUser = {
            userId: 'user-1',
            role: USER_ROLES.COLABORADOR
        };

        it('debería obtener tareas del usuario exitosamente', async () => {
            mockTaskRepository.findMany.mockResolvedValue(mockTasks);

            const result = await taskService.getUserTasks('user-1', {}, {}, mockUser);

            expect(mockTaskRepository.findMany).toHaveBeenCalledWith({
                assignedTo: 'user-1'
            }, {});
            expect(result).toEqual(mockTasks);
        });

        it('debería permitir al administrador obtener tareas de cualquier usuario', async () => {
            mockTaskRepository.findMany.mockResolvedValue(mockTasks);

            const result = await taskService.getUserTasks('user-1', {}, {}, mockAdmin);

            expect(result).toEqual(mockTasks);
        });

        it('debería fallar si el usuario intenta obtener tareas de otro usuario', async () => {
            const otherUser = { userId: 'user-2', role: USER_ROLES.COLABORADOR };

            await expect(taskService.getUserTasks('user-1', {}, {}, otherUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });
    });

    describe('Métodos de permisos', () => {
        const mockProject = { areaId: 'area-1' };
        const mockTask = {
            project: { areaId: 'area-1' },
            assignedTo: 'user-1'
        };

        const mockAdmin = {
            userId: 'admin-1',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCoordinator = {
            userId: 'coord-1',
            role: USER_ROLES.COORDINADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'user-1',
            id: 'user-1',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        describe('canUserCreateTask', () => {
            it('debería permitir al administrador crear tareas', () => {
                const result = taskService.canUserCreateTask(mockAdmin, mockProject);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador crear tareas en su área', () => {
                const result = taskService.canUserCreateTask(mockCoordinator, mockProject);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador crear tareas', () => {
                const result = taskService.canUserCreateTask(mockCollaborator, mockProject);
                expect(result).toBe(false);
            });
        });

        describe('canUserUpdateTask', () => {
            it('debería permitir al administrador actualizar cualquier tarea', () => {
                const result = taskService.canUserUpdateTask(mockAdmin, mockTask);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador actualizar tareas de su área', () => {
                const result = taskService.canUserUpdateTask(mockCoordinator, mockTask);
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador actualizar tareas asignadas a él', () => {
                const result = taskService.canUserUpdateTask(mockCollaborator, mockTask);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador actualizar tareas no asignadas a él', () => {
                const taskNotAssigned = { ...mockTask, assignedTo: 'other-user' };
                const result = taskService.canUserUpdateTask(mockCollaborator, taskNotAssigned);
                expect(result).toBe(false);
            });
        });

        describe('canUserDeleteTask', () => {
            it('debería permitir al administrador eliminar tareas', () => {
                const result = taskService.canUserDeleteTask(mockAdmin, mockTask);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador eliminar tareas de su área', () => {
                const result = taskService.canUserDeleteTask(mockCoordinator, mockTask);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador eliminar tareas', () => {
                const result = taskService.canUserDeleteTask(mockCollaborator, mockTask);
                expect(result).toBe(false);
            });
        });
    });

    describe('isValidStatusTransition', () => {
        it('debería validar transiciones correctas', () => {
            expect(taskService.isValidStatusTransition(TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS)).toBe(true);
            expect(taskService.isValidStatusTransition(TASK_STATUS.IN_PROGRESS, TASK_STATUS.DONE)).toBe(true);
            expect(taskService.isValidStatusTransition(TASK_STATUS.IN_PROGRESS, TASK_STATUS.REVIEW)).toBe(true);
            expect(taskService.isValidStatusTransition(TASK_STATUS.REVIEW, TASK_STATUS.DONE)).toBe(true);
            expect(taskService.isValidStatusTransition(TASK_STATUS.DONE, TASK_STATUS.IN_PROGRESS)).toBe(true);
        });

        it('debería invalidar transiciones incorrectas', () => {
            expect(taskService.isValidStatusTransition(TASK_STATUS.TODO, TASK_STATUS.DONE)).toBe(false);
            expect(taskService.isValidStatusTransition(TASK_STATUS.TODO, TASK_STATUS.REVIEW)).toBe(false);
            expect(taskService.isValidStatusTransition(TASK_STATUS.DONE, TASK_STATUS.TODO)).toBe(false);
        });
    });
});
