const fs = require('fs');
const path = require('path');
const yaml = require('yamljs');
const { specs } = require('../config/swagger');

/**
 * Script para generar documentación OpenAPI/Swagger
 */

async function generateDocs() {
    try {
        console.log('🔧 Generando documentación OpenAPI...');

        // Crear directorio de documentación si no existe
        const docsDir = path.join(__dirname, '../docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        // Generar archivo JSON
        const jsonPath = path.join(docsDir, 'openapi.json');
        fs.writeFileSync(jsonPath, JSON.stringify(specs, null, 2));
        console.log(`✅ Archivo JSON generado: ${jsonPath}`);

        // Generar archivo YAML
        const yamlPath = path.join(docsDir, 'openapi.yaml');
        const yamlContent = yaml.stringify(specs, 2);
        fs.writeFileSync(yamlPath, yamlContent);
        console.log(`✅ Archivo YAML generado: ${yamlPath}`);

        // Generar README de la documentación
        const readmePath = path.join(docsDir, 'API_DOCS.md');
        const readmeContent = generateApiReadme();
        fs.writeFileSync(readmePath, readmeContent);
        console.log(`✅ README de API generado: ${readmePath}`);

        // Estadísticas
        const endpointCount = countEndpoints(specs);
        console.log(`📊 Estadísticas de documentación:`);
        console.log(`   - Endpoints documentados: ${endpointCount}`);
        console.log(`   - Esquemas definidos: ${Object.keys(specs.components?.schemas || {}).length}`);
        console.log(`   - Tags utilizados: ${specs.tags?.length || 0}`);

        console.log('🎉 Documentación generada exitosamente!');
        console.log(`📚 Swagger UI disponible en: http://localhost:3000/api/docs`);
        console.log(`📄 OpenAPI JSON: http://localhost:3000/api/docs.json`);

    } catch (error) {
        console.error('❌ Error generando documentación:', error);
        process.exit(1);
    }
}

function countEndpoints(specs) {
    let count = 0;
    if (specs.paths) {
        Object.values(specs.paths).forEach(path => {
            count += Object.keys(path).length;
        });
    }
    return count;
}

function generateApiReadme() {
    return `# TeamTime API Documentation

## Descripción

Esta documentación describe la API REST de TeamTime, un sistema de gestión de tiempo y proyectos empresariales.

## Información de la API

- **Versión**: ${specs.info?.version || '1.0.0'}
- **Título**: ${specs.info?.title || 'TeamTime API'}
- **Descripción**: ${specs.info?.description || 'API REST para gestión de tiempo y proyectos'}

## Servidores

${specs.servers?.map(server => `- **${server.description}**: ${server.url}`).join('\n') || '- No hay servidores configurados'}

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Para acceder a endpoints protegidos:

1. Obtén un token mediante \`POST /auth/login\`
2. Incluye el token en el header de autorización: \`Authorization: Bearer <token>\`

## Módulos de la API

${specs.tags?.map(tag => `### ${tag.name}\n${tag.description || 'Sin descripción'}`).join('\n\n') || 'No hay tags definidos'}

## Esquemas de Datos

Los siguientes esquemas están disponibles en la API:

${Object.keys(specs.components?.schemas || {}).map(schema => `- \`${schema}\``).join('\n') || 'No hay esquemas definidos'}

## Códigos de Respuesta Comunes

- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Error de validación en la petición
- **401**: Token de autenticación requerido o inválido
- **403**: Permisos insuficientes
- **404**: Recurso no encontrado
- **500**: Error interno del servidor

## Enlaces Útiles

- [Documentación Interactiva (Swagger UI)](http://localhost:3000/api/docs)
- [Especificación OpenAPI (JSON)](http://localhost:3000/api/docs.json)
- [Repositorio del Proyecto](https://github.com/your-org/teamtime-backend)

## Contacto

- **Email**: ${specs.info?.contact?.email || 'desarrollo@teamtime.com'}
- **URL**: ${specs.info?.contact?.url || 'https://github.com/your-org/teamtime-backend'}

---

Generado automáticamente el ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}
`;
}

// Ejecutar script si es llamado directamente
if (require.main === module) {
    generateDocs();
}

module.exports = { generateDocs };
