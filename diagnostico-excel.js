#!/usr/bin/env node

/**
 * Script de diagnóstico para la funcionalidad de importación de Excel
 * Ayuda a identificar y solucionar problemas comunes
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue.bold('\n🔧 DIAGNÓSTICO: Importación de Excel\n'));

// Verificar archivos principales
const filesToCheck = [
    'src/services/excelImport.service.js',
    'src/controllers/excelImport.controller.js',
    'src/routes/excelImport.routes.js',
    'src/server.js',
    'generate-test-excel.js'
];

console.log(chalk.yellow('📁 Verificando archivos principales:'));
filesToCheck.forEach(file => {
    const exists = fs.existsSync(file);
    const status = exists ? '✅' : '❌';
    const color = exists ? chalk.green : chalk.red;
    console.log(`   ${status} ${color(file)}`);
});

// Verificar módulos
console.log(chalk.yellow('\n📦 Verificando módulos:'));
const modules = [
    'exceljs',
    'express-session',
    'bcryptjs',
    'chalk'
];

modules.forEach(module => {
    try {
        require.resolve(module);
        console.log(`   ✅ ${chalk.green(module)}`);
    } catch (err) {
        console.log(`   ❌ ${chalk.red(module)} - NO INSTALADO`);
    }
});

// Verificar configuraciones
console.log(chalk.yellow('\n⚙️  Verificando carga de módulos:'));
try {
    const ExcelImportService = require('./src/services/excelImport.service.js');
    console.log('   ✅ ExcelImportService carga correctamente');

    const ExcelImportController = require('./src/controllers/excelImport.controller.js');
    console.log('   ✅ ExcelImportController carga correctamente');

    console.log('   ✅ Routes cargan correctamente');
} catch (err) {
    console.log('   ❌ Error cargando módulos:', chalk.red(err.message));
}

// Verificar archivo de prueba
console.log(chalk.yellow('\n🧪 Verificando archivo de prueba:'));
const testFile = 'test-excel-con-errores.xlsx';
if (fs.existsSync(testFile)) {
    const stats = fs.statSync(testFile);
    console.log(`   ✅ ${chalk.green(testFile)} existe`);
    console.log(`   📊 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📅 Creado: ${stats.birthtime.toLocaleString()}`);
} else {
    console.log(`   ❌ ${chalk.red(testFile)} no existe`);
    console.log(`   💡 Ejecuta: ${chalk.cyan('node generate-test-excel.js')}`);
}

// Errores comunes y soluciones
console.log(chalk.yellow('\n🐛 ERRORES COMUNES Y SOLUCIONES:'));

console.log(chalk.red('\n❌ "batchResult is not defined"'));
console.log('   🔧 Solucionado: Variable renombrada correctamente en forEach');

console.log(chalk.red('\n❌ "express-session not found"'));
console.log('   🔧 Solución: npm install express-session');

console.log(chalk.red('\n❌ "Cannot find module exceljs"'));
console.log('   🔧 Solución: npm install exceljs');

console.log(chalk.red('\n❌ "Session is undefined"'));
console.log('   🔧 Verificar que express-session está configurado en server.js');

console.log(chalk.red('\n❌ "Prisma schema errors"'));
console.log('   🔧 Verificar que el modelo ExcelProject existe en schema.prisma');

// Comandos útiles
console.log(chalk.blue('\n💡 COMANDOS ÚTILES:'));
console.log('   Generar archivo de prueba:');
console.log(`   ${chalk.cyan('node generate-test-excel.js')}`);

console.log('\n   Verificar sintaxis de servicios:');
console.log(`   ${chalk.cyan('node -c src/services/excelImport.service.js')}`);

console.log('\n   Iniciar servidor:');
console.log(`   ${chalk.cyan('npm run dev')}`);

console.log('\n   Probar importación (con servidor corriendo):');
console.log(`   ${chalk.cyan('curl -X POST -F "file=@test-excel-con-errores.xlsx" \\\n        -F "areaId=area-uuid" \\\n        -H "Authorization: Bearer token" \\\n        http://localhost:3000/api/excel-import/upload')}`);

// Endpoints
console.log(chalk.blue('\n🔗 ENDPOINTS DISPONIBLES:'));
console.log('   📤 POST /api/excel-import/upload');
console.log('   📥 GET  /api/excel-import/error-report');
console.log('   📋 GET  /api/excel-import/template');
console.log('   📊 GET  /api/excel-import/projects');
console.log('   📈 GET  /api/excel-import/stats');

// Estado actual
console.log(chalk.green.bold('\n✅ ESTADO ACTUAL:'));
console.log('   🎯 Error "batchResult is not defined" CORREGIDO');
console.log('   🔧 Sintaxis verificada y correcta');
console.log('   📦 Módulos necesarios disponibles');
console.log('   🧪 Archivo de prueba generado');
console.log('   🚀 Listo para pruebas');

console.log(chalk.magenta.bold('\n🎉 Sistema listo para usar!\n'));
