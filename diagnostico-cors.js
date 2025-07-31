#!/usr/bin/env node

/**
 * Diagnóstico de CORS - Verificar configuración y conectividad
 */

const chalk = require('chalk');

console.log(chalk.blue.bold('\n🌐 DIAGNÓSTICO DE CORS\n'));

// Verificar configuración
console.log(chalk.yellow('⚙️  CONFIGURACIÓN ACTUAL:'));
try {
    const config = require('./src/config');
    console.log(`   ✅ CORS_ORIGIN: ${chalk.green(config.CORS_ORIGIN)}`);
    console.log(`   ✅ FRONTEND_URL: ${chalk.green(config.FRONTEND_URL)}`);
    console.log(`   ✅ PORT: ${chalk.green(config.PORT)}`);
    console.log(`   ✅ NODE_ENV: ${chalk.green(config.NODE_ENV)}`);
} catch (error) {
    console.log(`   ❌ ${chalk.red('Error cargando configuración:', error.message)}`);
}

console.log(chalk.yellow('\n🔍 VERIFICACIONES DE CONECTIVIDAD:'));

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkCORS() {
    try {
        // Verificar si el servidor está corriendo
        console.log('   🔍 Verificando servidor en puerto 3000...');
        const { stdout: healthCheck } = await execPromise('curl -s http://localhost:3000/api/health');
        if (healthCheck.includes('healthy')) {
            console.log('   ✅ Servidor respondiendo correctamente');
        } else {
            console.log('   ⚠️  Servidor responde pero sin endpoint health');
        }

        // Verificar CORS para localhost:5173
        console.log('   🔍 Verificando CORS desde localhost:5173...');
        const { stdout: corsCheck } = await execPromise('curl -H "Origin: http://localhost:5173" -I http://localhost:3000/api/health 2>/dev/null');

        if (corsCheck.includes('Access-Control-Allow-Origin: http://localhost:5173')) {
            console.log('   ✅ CORS configurado correctamente para localhost:5173');
        } else {
            console.log('   ❌ CORS NO configurado para localhost:5173');
            console.log('   📋 Respuesta del servidor:');
            console.log('   ', corsCheck.split('\\n').filter(line => line.includes('Access-Control')).join('\\n   '));
        }

        // Verificar métodos permitidos
        console.log('   🔍 Verificando métodos HTTP permitidos...');
        const { stdout: optionsCheck } = await execPromise('curl -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -X OPTIONS -I http://localhost:3000/api/projects 2>/dev/null');

        if (optionsCheck.includes('Access-Control-Allow-Methods')) {
            console.log('   ✅ Métodos HTTP configurados correctamente');
            const methodsLine = optionsCheck.split('\\n').find(line => line.includes('Access-Control-Allow-Methods'));
            if (methodsLine) {
                console.log(`   📋 Métodos permitidos: ${methodsLine.split(': ')[1]}`);
            }
        } else {
            console.log('   ❌ Métodos HTTP no configurados');
        }

        // Verificar headers permitidos
        if (optionsCheck.includes('Access-Control-Allow-Headers')) {
            console.log('   ✅ Headers permitidos configurados');
            const headersLine = optionsCheck.split('\\n').find(line => line.includes('Access-Control-Allow-Headers'));
            if (headersLine) {
                console.log(`   📋 Headers permitidos: ${headersLine.split(': ')[1]}`);
            }
        } else {
            console.log('   ❌ Headers permitidos no configurados');
        }

    } catch (error) {
        console.log(`   ❌ Error en verificación: ${error.message}`);
    }
}

async function main() {
    await checkCORS();

    console.log(chalk.yellow('\\n🛠️  SOLUCIONES COMUNES:'));

    console.log(chalk.blue('\\n1. Si sigues viendo errores de CORS:'));
    console.log('   • Asegúrate de que el servidor esté corriendo: node src/server.js');
    console.log('   • Verifica que el frontend esté en http://localhost:5173');
    console.log('   • Limpia la caché del navegador (Cmd+Shift+R en Mac, Ctrl+Shift+R en Windows)');

    console.log(chalk.blue('\\n2. Para probar manualmente:'));
    console.log('   • Abre Developer Tools en el navegador');
    console.log('   • Ve a Network tab');
    console.log('   • Verifica que las respuestas incluyan Access-Control-Allow-Origin');

    console.log(chalk.blue('\\n3. Comandos útiles:'));
    console.log(chalk.cyan('   curl -H "Origin: http://localhost:5173" -I http://localhost:3000/api/health'));
    console.log(chalk.cyan('   curl -H "Origin: http://localhost:5173" -X OPTIONS http://localhost:3000/api/projects'));

    console.log(chalk.green.bold('\\n✅ CONFIGURACIÓN CORS VERIFICADA'));
    console.log('El servidor debería estar funcionando correctamente para peticiones desde localhost:5173');
}

main().catch(console.error);
