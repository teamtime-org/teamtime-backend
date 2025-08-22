const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixGeneralProjects() {
    try {
        console.log('🔍 Buscando proyectos generales sin la bandera isGeneral...');
        
        // Buscar proyectos que deberían ser generales pero no tienen la bandera
        const projectsToUpdate = await prisma.project.findMany({
            where: {
                OR: [
                    { name: { startsWith: 'Actividades generales del área:' } },
                    { name: { startsWith: 'Actividades generales del área ' } }
                ],
                isGeneral: false,
                isActive: true
            },
            include: {
                area: {
                    select: {
                        name: true
                    }
                }
            }
        });

        console.log(`📊 Encontrados ${projectsToUpdate.length} proyectos para actualizar`);

        if (projectsToUpdate.length === 0) {
            console.log('✅ No hay proyectos que necesiten actualización');
            return;
        }

        // Mostrar los proyectos que se van a actualizar
        console.log('\n📋 Proyectos que se actualizarán:');
        projectsToUpdate.forEach(project => {
            console.log(`  - ${project.name} (ID: ${project.id}) - Área: ${project.area.name}`);
        });

        // Confirmar la actualización
        console.log('\n⚠️  Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Actualizar los proyectos
        const updateResult = await prisma.project.updateMany({
            where: {
                id: {
                    in: projectsToUpdate.map(p => p.id)
                }
            },
            data: {
                isGeneral: true
            }
        });

        console.log(`✅ Se actualizaron ${updateResult.count} proyectos exitosamente`);

        // Verificar los cambios
        const updatedProjects = await prisma.project.findMany({
            where: {
                id: {
                    in: projectsToUpdate.map(p => p.id)
                }
            },
            include: {
                area: {
                    select: {
                        name: true
                    }
                }
            }
        });

        console.log('\n✅ Proyectos actualizados:');
        updatedProjects.forEach(project => {
            console.log(`  - ${project.name} - isGeneral: ${project.isGeneral} - Área: ${project.area.name}`);
        });

    } catch (error) {
        console.error('❌ Error al actualizar proyectos generales:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
    fixGeneralProjects();
}

module.exports = { fixGeneralProjects };