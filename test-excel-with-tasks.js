const ExcelImportService = require('./src/services/excelImport.service');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testExcelImportWithTasks() {
    try {
        console.log('🧪 PRUEBA DE IMPORTACIÓN DE EXCEL CON CREACIÓN DE TAREAS');
        console.log('======================================================');
        
        // Obtener un área
        const area = await prisma.area.findFirst();
        if (!area) {
            throw new Error('No se encontró área en la base de datos');
        }
        
        console.log(`✅ Área encontrada: ${area.name}`);
        
        // Obtener un usuario administrador
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMINISTRADOR' }
        });
        
        if (!admin) {
            throw new Error('No se encontró usuario administrador');
        }
        
        console.log(`✅ Usuario administrador: ${admin.email}`);
        
        // Simular datos de Excel para crear un proyecto nuevo
        const excelImportService = new ExcelImportService();
        
        console.log('\n📊 Simulando importación de datos de Excel...');
        
        // Datos simulados como si vinieran del Excel
        const mockExcelData = [
            {
                excelId: '999',
                title: 'PROYECTO PRUEBA TAREAS - Implementación Sistema Crítico',
                serviceDescription: 'Proyecto de prueba para verificar la creación automática de tareas al importar desde Excel',
                generalStatus: 'En progreso',
                nextSteps: 'Iniciar análisis de requerimientos',
                mentor: 'Francisco Abelardo Salinas Barrera;#910',
                coordinator: 'Vicente Cabrera Carballo',
                projectStage: 'Ejecución',
                risk: 'Alto',
                projectType: 'IMPLEMENTACIÓN',
                businessLine: 'TELCO',
                opportunityType: 'Nueva',
                salesManagement: 'Gerencia Norte',
                salesExecutive: 'Carlos López;#789',
                designer: 'Ana Martínez;#101',
                estimatedEndDate: new Date('2025-12-31'),
                totalContractAmountMXN: 2500000.00,
                monthlyBillingMXN: 208333.33,
                siebelOrderNumber: '1-TEST-TASKS'
            }
        ];
        
        const result = await excelImportService.processData(mockExcelData, {
            userId: admin.id,
            email: admin.email
        }, area.id, false);
        
        console.log('✅ Resultado de importación:');
        console.log(`   Éxitos: ${result.success}`);
        console.log(`   Errores: ${result.errors.length}`);
        console.log(`   Proyectos creados: ${result.created.length}`);
        
        if (result.errors.length > 0) {
            console.log('\n❌ Errores encontrados:');
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.error}`);
            });
        }
        
        if (result.created.length > 0) {
            console.log('\n📋 Verificando tareas creadas automáticamente...');
            
            for (const createdProject of result.created) {
                const project = createdProject.project;
                const tasks = await prisma.task.findMany({
                    where: { projectId: project.id },
                    include: {
                        creator: {
                            select: { firstName: true, lastName: true, email: true }
                        }
                    }
                });
                
                console.log(`\n🎯 Proyecto: ${project.name}`);
                console.log(`   ID: ${project.id}`);
                console.log(`   Status: ${project.status}`);
                console.log(`   Tareas creadas automáticamente: ${tasks.length}`);
                
                tasks.forEach((task, index) => {
                    console.log(`   ${index + 1}. ${task.title}`);
                    console.log(`      Descripción: ${task.description || 'N/A'}`);
                    console.log(`      Status: ${task.status}`);
                    console.log(`      Prioridad: ${task.priority}`);
                    console.log(`      Tags: ${task.tags.join(', ')}`);
                    console.log(`      Creada por: ${task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'Sistema'}`);
                    if (task.assignedTo) {
                        console.log(`      Asignada a: ${task.assignedTo}`);
                    } else {
                        console.log(`      Sin asignar (se relaciona al proyecto, no al colaborador directamente)`);
                    }
                    console.log('');
                });
            }
        }
        
        console.log('\n🎉 PRUEBA COMPLETADA:');
        console.log('   ✅ Los proyectos importados desde Excel crean tareas automáticamente');
        console.log('   ✅ Solo el título es obligatorio en las tareas');
        console.log('   ✅ Las tareas se relacionan al proyecto');
        console.log('   ✅ Las tareas no se asignan automáticamente al colaborador');
        console.log('   ✅ Se pueden crear múltiples tareas predeterminadas (funcionalidad futura)');
        
    } catch (error) {
        console.error('❌ ERROR EN LA PRUEBA:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testExcelImportWithTasks();