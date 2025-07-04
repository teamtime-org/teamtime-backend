const TimeEntryService = require('../../src/services/timeEntry.service');
const { USER_ROLES, LIMITS, ERROR_MESSAGES } = require('../../src/utils/constants');

// Mock de repositorios y utilidades
jest.mock('../../src/repositories/timeEntry.repository');
jest.mock('../../src/repositories/task.repository');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/dateUtils', () => ({
    isSameDay: jest.fn(),
    startOfDay: jest.fn((date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return start;
    }),
    endOfDay: jest.fn((date) => {
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return end;
    })
}));

const TimeEntryRepository = require('../../src/repositories/timeEntry.repository');
const TaskRepository = require('../../src/repositories/task.repository');
const logger = require('../../src/utils/logger');
const dateUtils = require('../../src/utils/dateUtils');

describe('TimeEntryService', () => {
    let timeEntryService;
    let mockTimeEntryRepository;
    let mockTaskRepository;

    beforeEach(() => {
        // Limpiar mocks
        jest.clearAllMocks();

        // Crear instancias mock
        mockTimeEntryRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByDateRange: jest.fn(),
            getUserSummary: jest.fn(),
            getProjectReport: jest.fn(),
            getStats: jest.fn(),
            getTotalHoursByUserAndDate: jest.fn()
        };

        mockTaskRepository = {
            findById: jest.fn()
        };

        // Configurar mocks
        TimeEntryRepository.mockImplementation(() => mockTimeEntryRepository);
        TaskRepository.mockImplementation(() => mockTaskRepository);

        // Crear servicio
        timeEntryService = new TimeEntryService();
    });

    describe('createTimeEntry', () => {
        const mockTask = {
            id: 'task-1',
            title: 'Test Task',
            project: { areaId: 'area-1' }
        };

        const mockTimeEntryData = {
            taskId: 'task-1',
            userId: 'user-1',
            hours: 2.5,
            date: new Date('2024-01-15'),
            description: 'Test work'
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

        beforeEach(() => {
            // Mock validateTimeEntry para que no lance errores por defecto
            jest.spyOn(timeEntryService, 'validateTimeEntry').mockResolvedValue();
        });

        it('debería crear un registro de tiempo exitosamente', async () => {
            const mockTimeEntry = { id: 'entry-1', ...mockTimeEntryData, createdBy: mockAdmin.userId };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTimeEntryRepository.create.mockResolvedValue(mockTimeEntry);

            const result = await timeEntryService.createTimeEntry(mockTimeEntryData, mockAdmin);

            expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-1');
            expect(timeEntryService.validateTimeEntry).toHaveBeenCalledWith(mockTimeEntryData);
            expect(mockTimeEntryRepository.create).toHaveBeenCalledWith({
                ...mockTimeEntryData,
                createdBy: mockAdmin.userId
            });
            expect(result).toEqual(mockTimeEntry);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería permitir al colaborador crear registros para sí mismo', async () => {
            const mockTimeEntry = { id: 'entry-1', ...mockTimeEntryData, createdBy: mockCollaborator.userId };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTimeEntryRepository.create.mockResolvedValue(mockTimeEntry);

            const result = await timeEntryService.createTimeEntry(mockTimeEntryData, mockCollaborator);

            expect(result).toEqual(mockTimeEntry);
        });

        it('debería fallar si la tarea no existe', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(timeEntryService.createTimeEntry(mockTimeEntryData, mockAdmin))
                .rejects.toThrow('Tarea no encontrada');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const otherUserData = { ...mockTimeEntryData, userId: 'other-user' };
            mockTaskRepository.findById.mockResolvedValue(mockTask);

            await expect(timeEntryService.createTimeEntry(otherUserData, mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería fallar si la validación falla', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            timeEntryService.validateTimeEntry.mockRejectedValue(new Error('Horas inválidas'));

            await expect(timeEntryService.createTimeEntry(mockTimeEntryData, mockAdmin))
                .rejects.toThrow('Horas inválidas');
        });

        it('debería manejar errores del repositorio', async () => {
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockTimeEntryRepository.create.mockRejectedValue(new Error('Error de base de datos'));

            await expect(timeEntryService.createTimeEntry(mockTimeEntryData, mockAdmin))
                .rejects.toThrow('Error de base de datos');

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getTimeEntryById', () => {
        const mockTimeEntry = {
            id: 'entry-1',
            hours: 2.5,
            userId: 'user-1',
            task: { project: { areaId: 'area-1' } }
        };

        const mockAdmin = {
            userId: 'admin-1',
            role: USER_ROLES.ADMINISTRADOR,
            areaId: 'area-1'
        };

        const mockCollaborator = {
            userId: 'user-1',
            id: 'user-1',
            role: USER_ROLES.COLABORADOR,
            areaId: 'area-1'
        };

        it('debería obtener un registro de tiempo exitosamente', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);

            const result = await timeEntryService.getTimeEntryById('entry-1', mockAdmin);

            expect(mockTimeEntryRepository.findById).toHaveBeenCalledWith('entry-1');
            expect(result).toEqual(mockTimeEntry);
        });

        it('debería permitir al usuario obtener su propio registro', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);

            const result = await timeEntryService.getTimeEntryById('entry-1', mockCollaborator);

            expect(result).toEqual(mockTimeEntry);
        });

        it('debería fallar si el registro no existe', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(null);

            await expect(timeEntryService.getTimeEntryById('entry-1', mockAdmin))
                .rejects.toThrow('Registro de tiempo no encontrado');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const otherUserEntry = { ...mockTimeEntry, userId: 'other-user' };
            mockTimeEntryRepository.findById.mockResolvedValue(otherUserEntry);

            await expect(timeEntryService.getTimeEntryById('entry-1', mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería manejar errores del repositorio', async () => {
            mockTimeEntryRepository.findById.mockRejectedValue(new Error('Error de base de datos'));

            await expect(timeEntryService.getTimeEntryById('entry-1', mockAdmin))
                .rejects.toThrow('Error de base de datos');

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('updateTimeEntry', () => {
        const mockTimeEntry = {
            id: 'entry-1',
            hours: 2.5,
            userId: 'user-1',
            task: { project: { areaId: 'area-1' } }
        };

        const mockUpdateData = {
            hours: 3.0,
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

        beforeEach(() => {
            jest.spyOn(timeEntryService, 'validateTimeEntry').mockResolvedValue();
        });

        it('debería actualizar un registro de tiempo exitosamente', async () => {
            const updatedTimeEntry = { ...mockTimeEntry, ...mockUpdateData };

            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.update.mockResolvedValue(updatedTimeEntry);

            const result = await timeEntryService.updateTimeEntry('entry-1', mockUpdateData, mockAdmin);

            expect(mockTimeEntryRepository.findById).toHaveBeenCalledWith('entry-1');
            expect(timeEntryService.validateTimeEntry).toHaveBeenCalledWith({
                ...mockTimeEntry,
                ...mockUpdateData
            });
            expect(mockTimeEntryRepository.update).toHaveBeenCalledWith('entry-1', mockUpdateData);
            expect(result).toEqual(updatedTimeEntry);
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería permitir al usuario actualizar su propio registro', async () => {
            const updatedTimeEntry = { ...mockTimeEntry, ...mockUpdateData };

            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.update.mockResolvedValue(updatedTimeEntry);

            const result = await timeEntryService.updateTimeEntry('entry-1', mockUpdateData, mockCollaborator);

            expect(result).toEqual(updatedTimeEntry);
        });

        it('debería fallar si el registro no existe', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(null);

            await expect(timeEntryService.updateTimeEntry('entry-1', mockUpdateData, mockAdmin))
                .rejects.toThrow('Registro de tiempo no encontrado');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const otherUserEntry = { ...mockTimeEntry, userId: 'other-user' };
            mockTimeEntryRepository.findById.mockResolvedValue(otherUserEntry);

            await expect(timeEntryService.updateTimeEntry('entry-1', mockUpdateData, mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería validar solo si se actualizan horas o fecha', async () => {
            const descriptionOnly = { description: 'New description' };
            const updatedTimeEntry = { ...mockTimeEntry, ...descriptionOnly };

            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.update.mockResolvedValue(updatedTimeEntry);

            await timeEntryService.updateTimeEntry('entry-1', descriptionOnly, mockAdmin);

            expect(timeEntryService.validateTimeEntry).not.toHaveBeenCalled();
        });
    });

    describe('deleteTimeEntry', () => {
        const mockTimeEntry = {
            id: 'entry-1',
            hours: 2.5,
            userId: 'user-1',
            task: { project: { areaId: 'area-1' } }
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

        it('debería eliminar un registro de tiempo exitosamente', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.delete.mockResolvedValue();

            await timeEntryService.deleteTimeEntry('entry-1', mockAdmin);

            expect(mockTimeEntryRepository.findById).toHaveBeenCalledWith('entry-1');
            expect(mockTimeEntryRepository.delete).toHaveBeenCalledWith('entry-1');
            expect(logger.info).toHaveBeenCalled();
        });

        it('debería permitir al usuario eliminar su propio registro', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.delete.mockResolvedValue();

            await timeEntryService.deleteTimeEntry('entry-1', mockCollaborator);

            expect(mockTimeEntryRepository.delete).toHaveBeenCalledWith('entry-1');
        });

        it('debería fallar si el registro no existe', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(null);

            await expect(timeEntryService.deleteTimeEntry('entry-1', mockAdmin))
                .rejects.toThrow('Registro de tiempo no encontrado');
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const otherUserEntry = { ...mockTimeEntry, userId: 'other-user' };
            mockTimeEntryRepository.findById.mockResolvedValue(otherUserEntry);

            await expect(timeEntryService.deleteTimeEntry('entry-1', mockCollaborator))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });

        it('debería manejar errores del repositorio', async () => {
            mockTimeEntryRepository.findById.mockResolvedValue(mockTimeEntry);
            mockTimeEntryRepository.delete.mockRejectedValue(new Error('Error de base de datos'));

            await expect(timeEntryService.deleteTimeEntry('entry-1', mockAdmin))
                .rejects.toThrow('Error de base de datos');

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getTimeEntriesByDate', () => {
        const mockTimeEntries = [
            { id: 'entry-1', hours: 2.5, userId: 'user-1' },
            { id: 'entry-2', hours: 1.5, userId: 'user-1' }
        ];

        const mockAdmin = {
            userId: 'admin-1',
            role: USER_ROLES.ADMINISTRADOR
        };

        const mockCollaborator = {
            userId: 'user-1',
            id: 'user-1',
            role: USER_ROLES.COLABORADOR
        };

        const testDate = new Date('2024-01-15');

        it('debería obtener registros de tiempo por fecha exitosamente', async () => {
            const startOfDayMock = new Date('2024-01-15T00:00:00');
            const endOfDayMock = new Date('2024-01-15T23:59:59');

            dateUtils.startOfDay.mockReturnValue(startOfDayMock);
            dateUtils.endOfDay.mockReturnValue(endOfDayMock);
            mockTimeEntryRepository.findByDateRange.mockResolvedValue(mockTimeEntries);

            const result = await timeEntryService.getTimeEntriesByDate('user-1', testDate, mockAdmin);

            expect(dateUtils.startOfDay).toHaveBeenCalledWith(testDate);
            expect(dateUtils.endOfDay).toHaveBeenCalledWith(testDate);
            expect(mockTimeEntryRepository.findByDateRange).toHaveBeenCalledWith('user-1', startOfDayMock, endOfDayMock);
            expect(result).toEqual(mockTimeEntries);
        });

        it('debería permitir al usuario obtener sus propios registros', async () => {
            dateUtils.startOfDay.mockReturnValue(new Date('2024-01-15T00:00:00'));
            dateUtils.endOfDay.mockReturnValue(new Date('2024-01-15T23:59:59'));
            mockTimeEntryRepository.findByDateRange.mockResolvedValue(mockTimeEntries);

            const result = await timeEntryService.getTimeEntriesByDate('user-1', testDate, mockCollaborator);

            expect(result).toEqual(mockTimeEntries);
        });

        it('debería fallar si el usuario no tiene permisos', async () => {
            const otherUser = { userId: 'user-2', id: 'user-2', role: USER_ROLES.COLABORADOR };

            await expect(timeEntryService.getTimeEntriesByDate('user-1', testDate, otherUser))
                .rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);
        });
    });

    describe('validateTimeEntry', () => {
        const mockTimeEntryData = {
            userId: 'user-1',
            hours: 2.5,
            date: new Date('2024-01-15')
        };

        beforeEach(() => {
            // Mock LIMITS si no están definidos
            LIMITS.MIN_HOURS_PER_ENTRY = LIMITS.MIN_HOURS_PER_ENTRY || 0.1;
            LIMITS.MAX_HOURS_PER_DAY = LIMITS.MAX_HOURS_PER_DAY || 24;
        });

        it('debería validar exitosamente un registro válido', async () => {
            mockTimeEntryRepository.getTotalHoursByUserAndDate.mockResolvedValue(2.0);

            await expect(timeEntryService.validateTimeEntry(mockTimeEntryData))
                .resolves.not.toThrow();
        });

        it('debería fallar si las horas son menores al mínimo', async () => {
            const invalidData = { ...mockTimeEntryData, hours: 0.05 };

            await expect(timeEntryService.validateTimeEntry(invalidData))
                .rejects.toThrow(`Las horas deben ser al menos ${LIMITS.MIN_HOURS_PER_ENTRY}`);
        });

        it('debería fallar si las horas exceden el máximo por día', async () => {
            const invalidData = { ...mockTimeEntryData, hours: 30 };

            await expect(timeEntryService.validateTimeEntry(invalidData))
                .rejects.toThrow(`No se pueden registrar más de ${LIMITS.MAX_HOURS_PER_DAY} horas en un día`);
        });

        it('debería fallar si la fecha es futura', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const invalidData = { ...mockTimeEntryData, date: futureDate };

            await expect(timeEntryService.validateTimeEntry(invalidData))
                .rejects.toThrow('No se pueden registrar horas en fechas futuras');
        });

        it('debería fallar si el total de horas excede el límite diario', async () => {
            mockTimeEntryRepository.getTotalHoursByUserAndDate.mockResolvedValue(22.0);
            const invalidData = { ...mockTimeEntryData, hours: 5.0 };

            await expect(timeEntryService.validateTimeEntry(invalidData))
                .rejects.toThrow(`No se pueden exceder ${LIMITS.MAX_HOURS_PER_DAY} horas por día`);
        });
    });

    describe('Métodos de permisos', () => {
        const mockTask = { project: { areaId: 'area-1' } };
        const mockTimeEntry = {
            userId: 'user-1',
            task: { project: { areaId: 'area-1' } }
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

        describe('canUserCreateTimeEntry', () => {
            it('debería permitir al administrador crear registros para cualquier usuario', () => {
                const result = timeEntryService.canUserCreateTimeEntry(mockAdmin, mockTask, 'any-user');
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador crear registros para usuarios de su área', () => {
                const result = timeEntryService.canUserCreateTimeEntry(mockCoordinator, mockTask, 'user-1');
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador crear registros para sí mismo', () => {
                const result = timeEntryService.canUserCreateTimeEntry(mockCollaborator, mockTask, 'user-1');
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador crear registros para otros usuarios', () => {
                const result = timeEntryService.canUserCreateTimeEntry(mockCollaborator, mockTask, 'other-user');
                expect(result).toBe(false);
            });
        });

        describe('canUserAccessTimeEntry', () => {
            it('debería permitir al administrador acceder a cualquier registro', () => {
                const result = timeEntryService.canUserAccessTimeEntry(mockAdmin, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador acceder a registros de su área', () => {
                const result = timeEntryService.canUserAccessTimeEntry(mockCoordinator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador acceder a sus propios registros', () => {
                const result = timeEntryService.canUserAccessTimeEntry(mockCollaborator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador acceder a registros de otros usuarios', () => {
                const otherEntry = { ...mockTimeEntry, userId: 'other-user' };
                const result = timeEntryService.canUserAccessTimeEntry(mockCollaborator, otherEntry);
                expect(result).toBe(false);
            });
        });

        describe('canUserUpdateTimeEntry', () => {
            it('debería permitir al administrador actualizar cualquier registro', () => {
                const result = timeEntryService.canUserUpdateTimeEntry(mockAdmin, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador actualizar registros de su área', () => {
                const result = timeEntryService.canUserUpdateTimeEntry(mockCoordinator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador actualizar sus propios registros', () => {
                const result = timeEntryService.canUserUpdateTimeEntry(mockCollaborator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador actualizar registros de otros usuarios', () => {
                const otherEntry = { ...mockTimeEntry, userId: 'other-user' };
                const result = timeEntryService.canUserUpdateTimeEntry(mockCollaborator, otherEntry);
                expect(result).toBe(false);
            });
        });

        describe('canUserDeleteTimeEntry', () => {
            it('debería permitir al administrador eliminar cualquier registro', () => {
                const result = timeEntryService.canUserDeleteTimeEntry(mockAdmin, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador eliminar registros de su área', () => {
                const result = timeEntryService.canUserDeleteTimeEntry(mockCoordinator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador eliminar sus propios registros', () => {
                const result = timeEntryService.canUserDeleteTimeEntry(mockCollaborator, mockTimeEntry);
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador eliminar registros de otros usuarios', () => {
                const otherEntry = { ...mockTimeEntry, userId: 'other-user' };
                const result = timeEntryService.canUserDeleteTimeEntry(mockCollaborator, otherEntry);
                expect(result).toBe(false);
            });
        });

        describe('canUserViewUserTimeEntries', () => {
            it('debería permitir al administrador ver registros de cualquier usuario', () => {
                const result = timeEntryService.canUserViewUserTimeEntries(mockAdmin, 'any-user');
                expect(result).toBe(true);
            });

            it('debería permitir al coordinador ver registros de usuarios de su área', () => {
                const result = timeEntryService.canUserViewUserTimeEntries(mockCoordinator, 'user-1');
                expect(result).toBe(true);
            });

            it('debería permitir al colaborador ver sus propios registros', () => {
                const result = timeEntryService.canUserViewUserTimeEntries(mockCollaborator, 'user-1');
                expect(result).toBe(true);
            });

            it('debería denegar al colaborador ver registros de otros usuarios', () => {
                const result = timeEntryService.canUserViewUserTimeEntries(mockCollaborator, 'other-user');
                expect(result).toBe(false);
            });
        });
    });

    describe('applyUserFilters', () => {
        const mockFilters = { projectId: 'project-1' };

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

        it('debería retornar filtros sin cambios para administrador', async () => {
            const result = await timeEntryService.applyUserFilters(mockFilters, mockAdmin);
            expect(result).toEqual(mockFilters);
        });

        it('debería agregar filtro de área para coordinador', async () => {
            const result = await timeEntryService.applyUserFilters(mockFilters, mockCoordinator);
            expect(result).toEqual({
                ...mockFilters,
                areaId: 'area-1'
            });
        });

        it('debería agregar filtro de usuario para colaborador', async () => {
            const result = await timeEntryService.applyUserFilters(mockFilters, mockCollaborator);
            expect(result).toEqual({
                ...mockFilters,
                userId: 'user-1'
            });
        });
    });
});
