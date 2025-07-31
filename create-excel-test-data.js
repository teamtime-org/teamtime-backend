#!/usr/bin/env node

/**
 * Script para crear datos de ejemplo de proyectos Excel para pruebas
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('📊 Creando datos de ejemplo de proyectos Excel...');

        // Obtener algunos usuarios para usar como mentores, coordinadores, etc.
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
            }
        });

        console.log(`Encontrados ${users.length} usuarios`);

        // Obtener proyectos existentes
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                description: true
            }
        });

        console.log(`Encontrados ${projects.length} proyectos`);

        // Create SalesManagement entries first
        const salesManagements = [
            "Gerencia Comercial Norte",
            "Gerencia Comercial Sur",
            "Gerencia Comercial Centro",
            "Gerencia Comercial Este"
        ];

        console.log('Creando gerencias de ventas...');
        const createdSalesManagements = [];
        for (const smName of salesManagements) {
            try {
                const sm = await prisma.salesManagement.create({
                    data: {
                        name: smName,
                        description: `Gerencia comercial responsable de la región`
                    }
                });
                createdSalesManagements.push(sm);
                console.log(`✅ Gerencia creada: ${sm.name}`);
            } catch (error) {
                // If it already exists, try to find it
                const existing = await prisma.salesManagement.findUnique({
                    where: { name: smName }
                });
                if (existing) {
                    createdSalesManagements.push(existing);
                    console.log(`📋 Gerencia existente: ${existing.name}`);
                }
            }
        }

        // Datos de ejemplo para Excel Projects
        const excelProjectsData = [
            {
                title: "Implementación Sistema CRM",
                serviceDescription: "Desarrollo e implementación del sistema CRM corporativo con integración SAP - Valor: $85,000 USD - Margen: 35% - Cliente: TelecomCorp SA",
                salesManagement: createdSalesManagements[0], // Gerencia Comercial Norte
                mentor: users.find(u => u.firstName === 'Roberto'), // Roberto González
                coordinator: users.find(u => u.firstName === 'María'), // María Rodríguez
                salesExecutive: users.find(u => u.firstName === 'Diego'), // Diego Morales
                siebelOrderNumber: "SOD-2025-001234",
                projectValue: 85000,
                margin: 35,
                client: "TelecomCorp SA"
            },
            {
                title: "Campaña Q1 2025 - Fibra Óptica",
                serviceDescription: "Campaña publicitaria para promoción de servicios de fibra óptica - Valor: $45,000 USD - Margen: 28% - Cliente: Marketing Corp",
                salesManagement: createdSalesManagements[1], // Gerencia Comercial Sur
                mentor: users.find(u => u.firstName === 'Ana'), // Ana Martínez
                coordinator: users.find(u => u.firstName === 'Luis'), // Luis Fernández
                salesExecutive: users.find(u => u.firstName === 'Patricia'), // Patricia Sánchez
                siebelOrderNumber: "SOD-2025-001235",
                projectValue: 45000,
                margin: 28,
                client: "Marketing Corp"
            },
            {
                title: "Expansión Red 5G",
                serviceDescription: "Expansión de infraestructura 5G nacional - Valor: $250,000 USD - Margen: 42% - Cliente: Infraestructura Nacional SA",
                salesManagement: createdSalesManagements[2], // Gerencia Comercial Centro
                mentor: users.find(u => u.firstName === 'Carlos'), // Carlos Administrador
                coordinator: users.find(u => u.firstName === 'Roberto'), // Roberto González  
                salesExecutive: users.find(u => u.firstName === 'Miguel'), // Miguel Torres
                siebelOrderNumber: "SOD-2025-001236",
                projectValue: 250000,
                margin: 42,
                client: "Infraestructura Nacional SA"
            },
            {
                title: "Mejora Call Center",
                serviceDescription: "Optimización de procesos de atención al cliente - Valor: $32,000 USD - Margen: 22% - Cliente: Servicios Integrados LTDA",
                salesManagement: createdSalesManagements[3], // Gerencia Comercial Este
                mentor: users.find(u => u.firstName === 'María'), // María Rodríguez
                coordinator: users.find(u => u.firstName === 'Ana'), // Ana Martínez
                salesExecutive: users.find(u => u.firstName === 'Eduardo'), // Eduardo Vargas
                siebelOrderNumber: "SOD-2025-001237",
                projectValue: 32000,
                margin: 22,
                client: "Servicios Integrados LTDA"
            }
        ];

        // Crear ExcelProjects y enlazar con Projects
        for (let i = 0; i < Math.min(projects.length, excelProjectsData.length); i++) {
            const project = projects[i];
            const excelData = excelProjectsData[i];

            console.log(`Creando datos Excel para proyecto: ${project.name}`);

            await prisma.excelProject.create({
                data: {
                    project: {
                        connect: { id: project.id }
                    },
                    title: excelData.title,
                    serviceDescription: excelData.serviceDescription,
                    salesManagement: excelData.salesManagement ? {
                        connect: { id: excelData.salesManagement.id }
                    } : undefined,
                    mentor: excelData.mentor ? {
                        connect: { id: excelData.mentor.id }
                    } : undefined,
                    coordinator: excelData.coordinator ? {
                        connect: { id: excelData.coordinator.id }
                    } : undefined,
                    salesExecutive: excelData.salesExecutive ? {
                        connect: { id: excelData.salesExecutive.id }
                    } : undefined,
                    siebelOrderNumber: excelData.siebelOrderNumber,
                    totalContractAmountMXN: excelData.projectValue,
                }
            });

            console.log(`✅ Datos Excel creados para proyecto ${project.name}`);
        }

        console.log('\n🎉 Datos de ejemplo creados exitosamente!');
        console.log('\nProyectos con datos Excel:');

        // Verificar los datos creados
        const projectsWithExcel = await prisma.project.findMany({
            include: {
                excelDetails: {
                    include: {
                        mentor: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        },
                        coordinator: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        },
                        salesExecutive: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        projectsWithExcel.forEach(project => {
            if (project.excelDetails) {
                console.log(`- ${project.name}`);
                console.log(`  Mentor: ${project.excelDetails.mentor?.firstName} ${project.excelDetails.mentor?.lastName}`);
                console.log(`  Coordinador: ${project.excelDetails.coordinator?.firstName} ${project.excelDetails.coordinator?.lastName}`);
                console.log(`  Gerencia: ${project.excelDetails.salesManagement}`);
                console.log(`  Orden Siebel: ${project.excelDetails.siebelOrderNumber}`);
                console.log('');
            }
        });

    } catch (error) {
        console.error('❌ Error creando datos de ejemplo:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
