const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes en orden inverso de dependencias
    await prisma.timeEntry.deleteMany();
    await prisma.timePeriod.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectAssignment.deleteMany();
    await prisma.project.deleteMany();
    await prisma.area.deleteMany();
    await prisma.user.deleteMany();

    // Hash para contraseñas
    const hashedPassword = await bcrypt.hash('password123', 12);

    // 1. Crear usuario administrador primero
    const admin = await prisma.user.create({
        data: {
            email: 'admin@telecomcorp.com',
            password: hashedPassword,
            firstName: 'Carlos',
            lastName: 'Administrador',
            role: 'ADMINISTRADOR',
            areaId: null, // Los admin no tienen área asignada
        },
    });

    // 2. Crear áreas de telecomunicaciones usando el ID del administrador
    const areas = await Promise.all([
        prisma.area.create({
            data: {
                name: 'Ventas',
                description: 'Área comercial y desarrollo de negocios',
                color: '#10B981', // Verde
                createdBy: admin.id,
            },
        }),
        prisma.area.create({
            data: {
                name: 'PMO',
                description: 'Project Management Office - Gestión de proyectos',
                color: '#3B82F6', // Azul
                createdBy: admin.id,
            },
        }),
        prisma.area.create({
            data: {
                name: 'Atención al Cliente',
                description: 'Soporte técnico y atención al cliente',
                color: '#F59E0B', // Naranja
                createdBy: admin.id,
            },
        }),
        prisma.area.create({
            data: {
                name: 'Infraestructura',
                description: 'Mantenimiento y desarrollo de infraestructura de red',
                color: '#8B5CF6', // Púrpura
                createdBy: admin.id,
            },
        }),
    ]);

    // 3. Crear coordinadores para cada área
    const coordinadores = await Promise.all([
        prisma.user.create({
            data: {
                email: 'coord.ventas@telecomcorp.com',
                password: hashedPassword,
                firstName: 'María',
                lastName: 'Rodríguez',
                role: 'COORDINADOR',
                areaId: areas[0].id, // Ventas
                createdBy: admin.id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'coord.pmo@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Roberto',
                lastName: 'González',
                role: 'COORDINADOR',
                areaId: areas[1].id, // PMO
                createdBy: admin.id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'coord.atencion@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Ana',
                lastName: 'Martínez',
                role: 'COORDINADOR',
                areaId: areas[2].id, // Atención al Cliente
                createdBy: admin.id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'coord.infraestructura@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Luis',
                lastName: 'Fernández',
                role: 'COORDINADOR',
                areaId: areas[3].id, // Infraestructura
                createdBy: admin.id,
            },
        }),
    ]);

    // 4. Crear colaboradores por área
    const colaboradores = await Promise.all([
        // Colaboradores de Ventas
        prisma.user.create({
            data: {
                email: 'vendedor1@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Patricia',
                lastName: 'Sánchez',
                role: 'COLABORADOR',
                areaId: areas[0].id,
                createdBy: coordinadores[0].id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'vendedor2@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Diego',
                lastName: 'Morales',
                role: 'COLABORADOR',
                areaId: areas[0].id,
                createdBy: coordinadores[0].id,
            },
        }),
        // Colaboradores de PMO
        prisma.user.create({
            data: {
                email: 'analista.pmo@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Sofía',
                lastName: 'López',
                role: 'COLABORADOR',
                areaId: areas[1].id,
                createdBy: coordinadores[1].id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'planificador@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Miguel',
                lastName: 'Torres',
                role: 'COLABORADOR',
                areaId: areas[1].id,
                createdBy: coordinadores[1].id,
            },
        }),
        // Colaboradores de Atención al Cliente
        prisma.user.create({
            data: {
                email: 'soporte1@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Carmen',
                lastName: 'Jiménez',
                role: 'COLABORADOR',
                areaId: areas[2].id,
                createdBy: coordinadores[2].id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'soporte2@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Eduardo',
                lastName: 'Vargas',
                role: 'COLABORADOR',
                areaId: areas[2].id,
                createdBy: coordinadores[2].id,
            },
        }),
        // Colaboradores de Infraestructura
        prisma.user.create({
            data: {
                email: 'tecnico1@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Alejandro',
                lastName: 'Ruiz',
                role: 'COLABORADOR',
                areaId: areas[3].id,
                createdBy: coordinadores[3].id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'tecnico2@telecomcorp.com',
                password: hashedPassword,
                firstName: 'Valeria',
                lastName: 'Castro',
                role: 'COLABORADOR',
                areaId: areas[3].id,
                createdBy: coordinadores[3].id,
            },
        }),
    ]);

    // 5. Crear proyectos de telecomunicaciones
    const proyectos = await Promise.all([
        prisma.project.create({
            data: {
                name: 'Campaña Q1 2024 - Fibra Óptica',
                description: 'Campaña comercial para promocionar servicios de fibra óptica',
                areaId: areas[0].id, // Ventas
                priority: 'HIGH',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-03-31'),
                estimatedHours: 320,
                createdBy: coordinadores[0].id,
            },
        }),
        prisma.project.create({
            data: {
                name: 'Implementación Sistema CRM',
                description: 'Implementación y configuración del nuevo sistema CRM corporativo',
                areaId: areas[1].id, // PMO
                priority: 'URGENT',
                startDate: new Date('2024-02-01'),
                endDate: new Date('2024-07-31'),
                estimatedHours: 800,
                createdBy: coordinadores[1].id,
            },
        }),
        prisma.project.create({
            data: {
                name: 'Mejora Call Center',
                description: 'Optimización de procesos y herramientas del call center',
                areaId: areas[2].id, // Atención al Cliente
                priority: 'MEDIUM',
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-04-15'),
                estimatedHours: 240,
                createdBy: coordinadores[2].id,
            },
        }),
        prisma.project.create({
            data: {
                name: 'Expansión Red 5G',
                description: 'Instalación y configuración de nueva infraestructura 5G',
                areaId: areas[3].id, // Infraestructura
                priority: 'URGENT',
                startDate: new Date('2024-03-01'),
                endDate: new Date('2024-12-31'),
                estimatedHours: 1200,
                createdBy: coordinadores[3].id,
            },
        }),
    ]);

    // 6. Asignar colaboradores a proyectos
    await Promise.all([
        // Proyecto Campaña Fibra Óptica
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[0].id,
                userId: colaboradores[0].id, // Patricia (Ventas)
                assignedById: coordinadores[0].id,
            },
        }),
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[0].id,
                userId: colaboradores[1].id, // Diego (Ventas)
                assignedById: coordinadores[0].id,
            },
        }),
        // Proyecto Sistema CRM
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[1].id,
                userId: colaboradores[2].id, // Sofía (PMO)
                assignedById: coordinadores[1].id,
            },
        }),
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[1].id,
                userId: colaboradores[3].id, // Miguel (PMO)
                assignedById: coordinadores[1].id,
            },
        }),
        // Proyecto Mejora Call Center
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[2].id,
                userId: colaboradores[4].id, // Carmen (Atención al Cliente)
                assignedById: coordinadores[2].id,
            },
        }),
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[2].id,
                userId: colaboradores[5].id, // Eduardo (Atención al Cliente)
                assignedById: coordinadores[2].id,
            },
        }),
        // Proyecto Expansión Red 5G
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[3].id,
                userId: colaboradores[6].id, // Alejandro (Infraestructura)
                assignedById: coordinadores[3].id,
            },
        }),
        prisma.projectAssignment.create({
            data: {
                projectId: proyectos[3].id,
                userId: colaboradores[7].id, // Valeria (Infraestructura)
                assignedById: coordinadores[3].id,
            },
        }),
    ]);

    // 7. Crear tareas específicas de telecomunicaciones
    const tareas = await Promise.all([
        // Tareas del proyecto Campaña Fibra Óptica
        prisma.task.create({
            data: {
                title: 'Análisis de mercado objetivo',
                description: 'Investigación de segmentos de clientes para fibra óptica',
                projectId: proyectos[0].id,
                priority: 'HIGH',
                assignedTo: colaboradores[0].id, // Patricia (Ventas)
                estimatedHours: 20,
                createdBy: coordinadores[0].id,
                dueDate: new Date('2024-01-15'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Preparación material promocional',
                description: 'Diseño de folletos y material publicitario para fibra óptica',
                projectId: proyectos[0].id,
                priority: 'MEDIUM',
                assignedTo: colaboradores[1].id, // Diego (Ventas)
                estimatedHours: 24,
                createdBy: coordinadores[0].id,
                dueDate: new Date('2024-01-20'),
            },
        }),
        // Tareas del proyecto Sistema CRM
        prisma.task.create({
            data: {
                title: 'Análisis de requerimientos CRM',
                description: 'Definición de funcionalidades y especificaciones técnicas',
                projectId: proyectos[1].id,
                priority: 'URGENT',
                assignedTo: colaboradores[2].id, // Sofía (PMO)
                estimatedHours: 40,
                createdBy: coordinadores[1].id,
                dueDate: new Date('2024-02-15'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Planificación de migración de datos',
                description: 'Estrategia para migrar datos del sistema actual al nuevo CRM',
                projectId: proyectos[1].id,
                priority: 'HIGH',
                assignedTo: colaboradores[3].id, // Miguel (PMO)
                estimatedHours: 32,
                createdBy: coordinadores[1].id,
                dueDate: new Date('2024-02-28'),
            },
        }),
        // Tareas del proyecto Mejora Call Center
        prisma.task.create({
            data: {
                title: 'Evaluación de herramientas actuales',
                description: 'Análisis de eficiencia de software y hardware del call center',
                projectId: proyectos[2].id,
                priority: 'HIGH',
                assignedTo: colaboradores[4].id, // Carmen (Atención al Cliente)
                estimatedHours: 16,
                createdBy: coordinadores[2].id,
                dueDate: new Date('2024-02-01'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Capacitación en nuevos procesos',
                description: 'Entrenamiento del personal en procedimientos optimizados',
                projectId: proyectos[2].id,
                priority: 'MEDIUM',
                assignedTo: colaboradores[5].id, // Eduardo (Atención al Cliente)
                estimatedHours: 28,
                createdBy: coordinadores[2].id,
                dueDate: new Date('2024-03-01'),
            },
        }),
        // Tareas del proyecto Expansión Red 5G
        prisma.task.create({
            data: {
                title: 'Instalación antenas sector norte',
                description: 'Montaje y configuración de antenas 5G en zona norte de la ciudad',
                projectId: proyectos[3].id,
                priority: 'URGENT',
                assignedTo: colaboradores[6].id, // Alejandro (Infraestructura)
                estimatedHours: 80,
                createdBy: coordinadores[3].id,
                dueDate: new Date('2024-04-30'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Configuración equipos core',
                description: 'Configuración y testing de equipos centrales de red 5G',
                projectId: proyectos[3].id,
                priority: 'URGENT',
                assignedTo: colaboradores[7].id, // Valeria (Infraestructura)
                estimatedHours: 60,
                createdBy: coordinadores[3].id,
                dueDate: new Date('2024-05-15'),
            },
        }),
        // Tareas adicionales específicas de telecomunicaciones
        prisma.task.create({
            data: {
                title: 'Capacitación equipo ventas',
                description: 'Entrenamiento del equipo comercial en tecnologías de fibra óptica',
                projectId: proyectos[0].id,
                priority: 'MEDIUM',
                assignedTo: colaboradores[0].id, // Patricia (Ventas)
                estimatedHours: 16,
                createdBy: coordinadores[0].id,
                dueDate: new Date('2024-02-05'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Configuración entorno de pruebas CRM',
                description: 'Setup del ambiente de testing para el nuevo CRM',
                projectId: proyectos[1].id,
                priority: 'HIGH',
                assignedTo: colaboradores[2].id, // Sofía (PMO)
                estimatedHours: 25,
                createdBy: coordinadores[1].id,
                dueDate: new Date('2024-03-10'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Optimización scripts de soporte',
                description: 'Mejora de scripts y procedimientos de atención al cliente',
                projectId: proyectos[2].id,
                priority: 'MEDIUM',
                assignedTo: colaboradores[4].id, // Carmen (Atención al Cliente)
                estimatedHours: 20,
                createdBy: coordinadores[2].id,
                dueDate: new Date('2024-02-20'),
            },
        }),
        prisma.task.create({
            data: {
                title: 'Testing cobertura 5G',
                description: 'Pruebas de cobertura y calidad de señal en zona piloto',
                projectId: proyectos[3].id,
                priority: 'HIGH',
                assignedTo: colaboradores[6].id, // Alejandro (Infraestructura)
                estimatedHours: 40,
                createdBy: coordinadores[3].id,
                dueDate: new Date('2024-06-15'),
            },
        }),
    ]);

    // 8. Crear períodos de tiempo (quincenas del año 2024)
    const periodos = [];
    for (let month = 1; month <= 12; month++) {
        // Primera quincena (1-15)
        const firstPeriod = await prisma.timePeriod.create({
            data: {
                year: 2024,
                month,
                periodNumber: 1,
                startDate: new Date(2024, month - 1, 1),
                endDate: new Date(2024, month - 1, 15),
            },
        });
        periodos.push(firstPeriod);

        // Segunda quincena (16-fin de mes)
        const lastDay = new Date(2024, month, 0).getDate(); // Último día del mes
        const secondPeriod = await prisma.timePeriod.create({
            data: {
                year: 2024,
                month,
                periodNumber: 2,
                startDate: new Date(2024, month - 1, 16),
                endDate: new Date(2024, month - 1, lastDay),
            },
        });
        periodos.push(secondPeriod);
    }

    // 9. Crear algunas entradas de tiempo de ejemplo
    const enero2024Periodo1 = periodos.find(p => p.year === 2024 && p.month === 1 && p.periodNumber === 1);

    await Promise.all([
        prisma.timeEntry.create({
            data: {
                userId: colaboradores[0].id, // Patricia (Ventas)
                projectId: proyectos[0].id,
                taskId: tareas[0].id,
                timePeriodId: enero2024Periodo1.id,
                date: new Date('2024-01-02'),
                hours: 8,
                description: 'Inicio del análisis de mercado objetivo para fibra óptica',
            },
        }),
        prisma.timeEntry.create({
            data: {
                userId: colaboradores[0].id, // Patricia (Ventas)
                projectId: proyectos[0].id,
                taskId: tareas[0].id,
                timePeriodId: enero2024Periodo1.id,
                date: new Date('2024-01-03'),
                hours: 6,
                description: 'Investigación de segmentos de clientes potenciales',
            },
        }),
        prisma.timeEntry.create({
            data: {
                userId: colaboradores[1].id, // Diego (Ventas)
                projectId: proyectos[0].id,
                taskId: tareas[1].id,
                timePeriodId: enero2024Periodo1.id,
                date: new Date('2024-01-02'),
                hours: 7,
                description: 'Diseño inicial de material promocional para fibra óptica',
            },
        }),
    ]);

    console.log('✅ Seed completado exitosamente!');
    console.log('\n🔐 Usuarios creados para TelecomCorp:');
    console.log('- Admin: admin@telecomcorp.com / password123');
    console.log('- Coordinador Ventas: coord.ventas@telecomcorp.com / password123');
    console.log('- Coordinador PMO: coord.pmo@telecomcorp.com / password123');
    console.log('- Coordinador Atención: coord.atencion@telecomcorp.com / password123');
    console.log('- Coordinador Infraestructura: coord.infraestructura@telecomcorp.com / password123');
    console.log('- Vendedores: vendedor1@telecomcorp.com, vendedor2@telecomcorp.com / password123');
    console.log('- Soporte: soporte1@telecomcorp.com, soporte2@telecomcorp.com / password123');
    console.log('- Técnicos: tecnico1@telecomcorp.com, tecnico2@telecomcorp.com / password123');
    console.log('- PMO: analista.pmo@telecomcorp.com, planificador@telecomcorp.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
