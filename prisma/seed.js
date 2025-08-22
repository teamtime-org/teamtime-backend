const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { STANDARD_PROJECT_TASKS, GENERAL_PROJECT_TASKS } = require('../src/utils/constants');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed simplificado de la base de datos...');

    // Limpiar datos existentes en orden inverso de dependencias
    await prisma.timeEntry.deleteMany();
    await prisma.timePeriod.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectAssignment.deleteMany();
    await prisma.excelProjectSupplier.deleteMany();
    await prisma.excelProject.deleteMany();
    await prisma.project.deleteMany();
    await prisma.catalog.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.area.deleteMany();
    await prisma.user.deleteMany();

    // Hash para contraseñas
    const hashedPassword = await bcrypt.hash('password123', 12);

    // 1. Crear usuario administrador primero
    const admin = await prisma.user.create({
        data: {
            email: 'admin@teamtime.com',
            password: hashedPassword,
            firstName: 'Carlos',
            lastName: 'Administrador',
            role: 'ADMINISTRADOR',
            areaId: null, // Los admin no tienen área asignada
        },
    });

    // 2. Crear solo 2 áreas (PMO y Atención al Cliente)
    const areas = await Promise.all([
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
    ]);

    // 3. Crear un coordinador por área
    const coordinadores = await Promise.all([
        prisma.user.create({
            data: {
                email: 'coord.pmo@teamtime.com',
                password: hashedPassword,
                firstName: 'Roberto',
                lastName: 'González',
                role: 'COORDINADOR',
                areaId: areas[0].id, // PMO
                createdBy: admin.id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'coord.atencion@teamtime.com',
                password: hashedPassword,
                firstName: 'Ana',
                lastName: 'Martínez',
                role: 'COORDINADOR',
                areaId: areas[1].id, // Atención al Cliente
                createdBy: admin.id,
            },
        }),
    ]);

    // 4. Crear un colaborador por área
    const colaboradores = await Promise.all([
        prisma.user.create({
            data: {
                email: 'analista.pmo@teamtime.com',
                password: hashedPassword,
                firstName: 'Sofía',
                lastName: 'López',
                role: 'COLABORADOR',
                areaId: areas[0].id, // PMO
                createdBy: coordinadores[0].id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'soporte@teamtime.com',
                password: hashedPassword,
                firstName: 'Carmen',
                lastName: 'Jiménez',
                role: 'COLABORADOR',
                areaId: areas[1].id, // Atención al Cliente
                createdBy: coordinadores[1].id,
            },
        }),
    ]);

    // 5. Crear proyectos generales para cada área con tareas estándar
    const proyectosGenerales = [];
    
    for (let i = 0; i < areas.length; i++) {
        const area = areas[i];
        const coordinador = coordinadores[i];
        
        // Crear proyecto general del área
        const proyectoGeneral = await prisma.project.create({
            data: {
                name: `Actividades generales del área: ${area.name}`,
                description: `Proyecto para actividades generales y rutinarias del área ${area.name}`,
                areaId: area.id,
                priority: 'MEDIUM',
                status: 'ACTIVE',
                isGeneral: true,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-12-31'),
                createdBy: coordinador.id,
            },
        });
        
        proyectosGenerales.push(proyectoGeneral);

        // Crear las 6 tareas estándar del proyecto general
        const tareasGenerales = await Promise.all(
            GENERAL_PROJECT_TASKS.map((taskName, index) => 
                prisma.task.create({
                    data: {
                        title: taskName,
                        description: `Actividades relacionadas con ${taskName.toLowerCase()} del área`,
                        projectId: proyectoGeneral.id,
                        status: 'TODO',
                        priority: 'MEDIUM',
                        order: index + 1,
                        createdBy: coordinador.id,
                        tags: ['general', 'area'],
                    },
                })
            )
        );

        console.log(`✅ Proyecto general creado para ${area.name} con ${tareasGenerales.length} tareas estándar`);

        // Asignar el colaborador del área al proyecto general
        await prisma.projectAssignment.create({
            data: {
                projectId: proyectoGeneral.id,
                userId: colaboradores[i].id,
                assignedById: coordinador.id,
            },
        });

        console.log(`✅ ${colaboradores[i].firstName} asignado al proyecto general de ${area.name}`);
    }

    // 6. Crear catálogos básicos mínimos
    await Promise.all([
        // Tipos de proyecto
        prisma.catalog.create({
            data: {
                type: 'PROJECT_TYPE',
                name: 'General',
                description: 'Actividades generales del área',
            },
        }),
        prisma.catalog.create({
            data: {
                type: 'PROJECT_TYPE',
                name: 'Proyecto Específico',
                description: 'Proyectos con objetivos específicos',
            },
        }),
        // Gerencias de venta básicas
        prisma.catalog.create({
            data: {
                type: 'SALES_MANAGEMENT',
                name: 'Gerencia General',
                description: 'Gerencia general de la empresa',
            },
        }),
    ]);

    // 7. Crear períodos de tiempo solo para el primer trimestre 2025
    const periodos = [];
    for (let month = 1; month <= 3; month++) {
        // Primera quincena (1-15)
        const firstPeriod = await prisma.timePeriod.create({
            data: {
                year: 2025,
                month,
                periodNumber: 1,
                startDate: new Date(2025, month - 1, 1),
                endDate: new Date(2025, month - 1, 15),
            },
        });
        periodos.push(firstPeriod);

        // Segunda quincena (16-fin de mes)
        const lastDay = new Date(2025, month, 0).getDate(); // Último día del mes
        const secondPeriod = await prisma.timePeriod.create({
            data: {
                year: 2025,
                month,
                periodNumber: 2,
                startDate: new Date(2025, month - 1, 16),
                endDate: new Date(2025, month - 1, lastDay),
            },
        });
        periodos.push(secondPeriod);
    }

    console.log('✅ Seed simplificado completado exitosamente!');
    console.log('\n🔐 Usuarios creados para TeamTime:');
    console.log('- Admin: admin@teamtime.com / password123');
    console.log('- Coordinador PMO: coord.pmo@teamtime.com / password123');
    console.log('- Coordinador Atención: coord.atencion@teamtime.com / password123');
    console.log('- Analista PMO: analista.pmo@teamtime.com / password123');
    console.log('- Soporte: soporte@teamtime.com / password123');
    console.log('\n📊 Estructura creada:');
    console.log('- 2 áreas (PMO, Atención al Cliente)');
    console.log('- 2 coordinadores (1 por área)');
    console.log('- 2 colaboradores (1 por área)');
    console.log('- 2 proyectos generales con 6 tareas estándar cada uno');
    console.log('- Colaboradores asignados a sus proyectos generales');
    console.log('- Períodos de tiempo para Q1 2025');
    console.log('- Sin entradas de tiempo (listo para pruebas)');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });