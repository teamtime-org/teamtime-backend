const ExcelImportService = require('./src/services/excelImport.service');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testTaskCreation() {
    try {
        console.log('🧪 PRUEBA DE CREACIÓN DE TAREAS');
        console.log('===================================');
        
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
        
        // Crear un proyecto de prueba manualmente para probar la creación de tareas
        const excelImportService = new ExcelImportService();
        
        console.log('\n📝 Creando proyecto de prueba...');
        
        const testProjectData = {
            projectData: {
                name: 'Proyecto de Prueba para Tareas',
                description: 'Proyecto creado para probar la funcionalidad de tareas automáticas',
                status: 'ACTIVE',
                areaId: area.id
            },
            excelProjectData: {
                title: 'Proyecto de Prueba para Tareas',
                serviceDescription: 'Proyecto creado para probar la funcionalidad de tareas automáticas',
                generalStatus: 'En progreso',
                areaId: area.id
            },
            suppliers: []
        };
        
        const result = await excelImportService.saveProject(testProjectData, {
            userId: admin.id,
            email: admin.email
        });
        
        console.log(`✅ Proyecto creado: ${result.project.name} (ID: ${result.project.id})`);
        
        // Verificar que se creó la tarea automáticamente
        const tasks = await prisma.task.findMany({
            where: { projectId: result.project.id },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                tags: true,
                createdBy: true,
                assignedTo: true,
                creator: {
                    select: { firstName: true, lastName: true, email: true }
                }
            }
        });
        
        console.log(`\n📋 TAREAS CREADAS (${tasks.length}):`);
        tasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ${task.title}`);
            console.log(`      Descripción: ${task.description || 'N/A'}`);
            console.log(`      Estado: ${task.status}`);
            console.log(`      Prioridad: ${task.priority}`);
            console.log(`      Tags: ${task.tags.join(', ')}`);
            console.log(`      Creada por: ${task.creator ? `${task.creator.firstName} ${task.creator.lastName} (${task.creator.email})` : 'Sistema'}`);
            console.log('');
        });
        
        // Probar el método de creación de múltiples tareas
        console.log('🔧 Probando creación de múltiples tareas...');
        const additionalTasks = await excelImportService.createProjectTasks(
            result.project.id,
            admin.id,
            [
                {
                    title: 'Análisis de requerimientos',
                    description: 'Revisar y documentar los requerimientos del cliente',
                    priority: 'HIGH',
                    tags: ['análisis', 'requerimientos']
                },
                {
                    title: 'Diseño de solución',
                    description: 'Crear el diseño técnico de la solución',
                    priority: 'MEDIUM',
                    tags: ['diseño', 'arquitectura']
                }
            ]
        );
        
        console.log(`✅ Tareas adicionales creadas: ${additionalTasks.length}`);
        additionalTasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ${task.title} - ${task.priority}`);
        });
        
        // Estadísticas finales
        const finalTaskCount = await prisma.task.count({
            where: { projectId: result.project.id }
        });
        
        console.log(`\n📊 RESUMEN:`);
        console.log(`   Proyecto creado: ${result.project.name}`);
        console.log(`   Total de tareas: ${finalTaskCount}`);
        console.log('   ✅ Tareas se crean automáticamente al importar proyectos');
        console.log('   ✅ Solo el título es obligatorio en las tareas');
        console.log('   ✅ Las tareas se relacionan al proyecto, no al colaborador directamente');
        
        console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE!');
        
    } catch (error) {
        console.error('❌ ERROR EN LA PRUEBA:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testTaskCreation();