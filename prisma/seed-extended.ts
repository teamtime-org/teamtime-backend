import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting extended seed...');

  // ============================================
  // 1. CREAR SEGMENTOS
  // ============================================
  console.log('📍 Creating segments...');

  const segments = await Promise.all([
    prisma.segment.upsert({
      where: { code: 'F' },
      update: {},
      create: {
        name: 'Federal',
        code: 'F',
        description: 'Dependencias del gobierno federal',
        orderIndex: 1
      }
    }),
    prisma.segment.upsert({
      where: { code: 'E' },
      update: {},
      create: {
        name: 'Estatal y Municipal',
        code: 'E',
        description: 'Gobiernos estatales y municipales',
        orderIndex: 2
      }
    }),
    prisma.segment.upsert({
      where: { code: 'P' },
      update: {},
      create: {
        name: 'Privado',
        code: 'P',
        description: 'Empresas del sector privado',
        orderIndex: 3
      }
    })
  ]);

  // ============================================
  // 2. CREAR ÁREAS
  // ============================================
  console.log('🏢 Creating areas...');

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMINISTRADOR' }
  });

  if (!adminUser) {
    throw new Error('No admin user found. Please run the basic seed first.');
  }

  const areas = await Promise.all([
    prisma.area.upsert({
      where: { code: 'DISENO' },
      update: {},
      create: {
        name: 'Diseño de Soluciones',
        code: 'DISENO',
        description: 'Área de diseño y arquitectura de soluciones',
        color: '#3B82F6',
        orderIndex: 1,
        createdBy: adminUser.id
      }
    }),
    prisma.area.upsert({
      where: { code: 'PMO' },
      update: {},
      create: {
        name: 'PMO',
        code: 'PMO',
        description: 'Oficina de gestión de proyectos',
        color: '#10B981',
        orderIndex: 2,
        createdBy: adminUser.id
      }
    }),
    prisma.area.upsert({
      where: { code: 'ATENCION' },
      update: {},
      create: {
        name: 'Atención a Clientes',
        code: 'ATENCION',
        description: 'Área de servicio y atención post-venta',
        color: '#F59E0B',
        orderIndex: 3,
        createdBy: adminUser.id
      }
    })
  ]);

  // ============================================
  // 3. CREAR CLIENTES
  // ============================================
  console.log('🏛️ Creating clients...');

  const clients = await Promise.all([
    // Clientes Federales
    prisma.client.upsert({
      where: { acronym: 'STPS' },
      update: {},
      create: {
        name: 'Secretaría del Trabajo y Previsión Social',
        acronym: 'STPS',
        segmentId: segments[0].id, // Federal
        description: 'Secretaría del Trabajo del Gobierno Federal',
        contactInfo: {
          email: 'contacto@stps.gob.mx',
          phone: '555-123-4567',
          address: 'CDMX'
        }
      }
    }),
    prisma.client.upsert({
      where: { acronym: 'SECTUR' },
      update: {},
      create: {
        name: 'Secretaría de Turismo',
        acronym: 'SECTUR',
        segmentId: segments[0].id, // Federal
        description: 'Secretaría de Turismo del Gobierno Federal'
      }
    }),
    prisma.client.upsert({
      where: { acronym: 'SEDENA' },
      update: {},
      create: {
        name: 'Secretaría de la Defensa Nacional',
        acronym: 'SEDENA',
        segmentId: segments[0].id, // Federal
        description: 'Secretaría de la Defensa Nacional'
      }
    }),
    // Clientes Estatales
    prisma.client.upsert({
      where: { acronym: 'UAA' },
      update: {},
      create: {
        name: 'Universidad Autónoma de Aguascalientes',
        acronym: 'UAA',
        segmentId: segments[1].id, // Estatal
        description: 'Universidad pública del estado de Aguascalientes'
      }
    }),
    // Clientes Privados
    prisma.client.upsert({
      where: { acronym: 'PMI' },
      update: {},
      create: {
        name: 'PMI Comercio Internacional S.A. de C.V.',
        acronym: 'PMI',
        segmentId: segments[2].id, // Privado
        description: 'Empresa de comercio internacional'
      }
    })
  ]);

  // ============================================
  // 4. CREAR ETAPAS DE PROYECTO
  // ============================================
  console.log('📊 Creating project stages...');

  const projectStages = await Promise.all([
    prisma.projectStage.upsert({
      where: { code: 'PROPUESTA' },
      update: {},
      create: {
        code: 'PROPUESTA',
        name: 'En Propuesta',
        description: 'Proyecto en fase de propuesta',
        color: '#6B7280',
        orderIndex: 1
      }
    }),
    prisma.projectStage.upsert({
      where: { code: 'EVALUACION' },
      update: {},
      create: {
        code: 'EVALUACION',
        name: 'En Evaluación',
        description: 'Propuesta en evaluación por el cliente',
        color: '#F59E0B',
        orderIndex: 2
      }
    }),
    prisma.projectStage.upsert({
      where: { code: 'ADJUDICADO' },
      update: {},
      create: {
        code: 'ADJUDICADO',
        name: 'Adjudicado',
        description: 'Proyecto ganado/adjudicado',
        color: '#10B981',
        orderIndex: 3
      }
    }),
    prisma.projectStage.upsert({
      where: { code: 'EJECUCION' },
      update: {},
      create: {
        code: 'EJECUCION',
        name: 'En Ejecución',
        description: 'Proyecto en proceso de implementación',
        color: '#3B82F6',
        orderIndex: 4
      }
    }),
    prisma.projectStage.upsert({
      where: { code: 'ENTREGADO' },
      update: {},
      create: {
        code: 'ENTREGADO',
        name: 'Entregado',
        description: 'Proyecto entregado al cliente',
        color: '#8B5CF6',
        orderIndex: 5
      }
    }),
    prisma.projectStage.upsert({
      where: { code: 'PERDIDO' },
      update: {},
      create: {
        code: 'PERDIDO',
        name: 'Perdido',
        description: 'Proyecto no adjudicado',
        color: '#EF4444',
        orderIndex: 6
      }
    })
  ]);

  // ============================================
  // 5. CREAR CATÁLOGOS
  // ============================================
  console.log('📚 Creating catalogs...');

  // Tipos de Servicio
  await Promise.all([
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'SERVICE_TYPE',
          code: 'NUEVO'
        }
      },
      update: {},
      create: {
        type: 'SERVICE_TYPE',
        code: 'NUEVO',
        name: 'Nuevo',
        description: 'Servicio nuevo',
        orderIndex: 1
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'SERVICE_TYPE',
          code: 'EXISTENTE'
        }
      },
      update: {},
      create: {
        type: 'SERVICE_TYPE',
        code: 'EXISTENTE',
        name: 'Existente',
        description: 'Servicio existente',
        orderIndex: 2
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'SERVICE_TYPE',
          code: 'RENOVACION'
        }
      },
      update: {},
      create: {
        type: 'SERVICE_TYPE',
        code: 'RENOVACION',
        name: 'Renovación',
        description: 'Renovación de servicio',
        orderIndex: 3
      }
    })
  ]);

  // Tipos de Contratación
  await Promise.all([
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'CONTRACT_TYPE',
          code: 'LICITACION'
        }
      },
      update: {},
      create: {
        type: 'CONTRACT_TYPE',
        code: 'LICITACION',
        name: 'Licitación',
        description: 'Proceso de licitación pública',
        orderIndex: 1
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'CONTRACT_TYPE',
          code: 'BAU'
        }
      },
      update: {},
      create: {
        type: 'CONTRACT_TYPE',
        code: 'BAU',
        name: 'BAU',
        description: 'Business as usual',
        orderIndex: 2
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'CONTRACT_TYPE',
          code: 'COTIZACION'
        }
      },
      update: {},
      create: {
        type: 'CONTRACT_TYPE',
        code: 'COTIZACION',
        name: 'Cotización',
        description: 'Cotización directa',
        orderIndex: 3
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'CONTRACT_TYPE',
          code: 'ADJUDICACION_DIRECTA'
        }
      },
      update: {},
      create: {
        type: 'CONTRACT_TYPE',
        code: 'ADJUDICACION_DIRECTA',
        name: 'Adjudicación Directa',
        description: 'Adjudicación directa sin concurso',
        orderIndex: 4
      }
    })
  ]);

  // Líneas de Negocio
  await Promise.all([
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'BUSINESS_LINE',
          code: 'REDES'
        }
      },
      update: {},
      create: {
        type: 'BUSINESS_LINE',
        code: 'REDES',
        name: 'Redes Administradas',
        description: 'Servicios de redes y conectividad',
        orderIndex: 1
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'BUSINESS_LINE',
          code: 'SEGURIDAD'
        }
      },
      update: {},
      create: {
        type: 'BUSINESS_LINE',
        code: 'SEGURIDAD',
        name: 'Ciberseguridad',
        description: 'Servicios de seguridad informática',
        orderIndex: 2
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'BUSINESS_LINE',
          code: 'COLABORACION'
        }
      },
      update: {},
      create: {
        type: 'BUSINESS_LINE',
        code: 'COLABORACION',
        name: 'Colaboración',
        description: 'Servicios de colaboración y comunicación',
        orderIndex: 3
      }
    }),
    prisma.catalog.upsert({
      where: {
        type_code: {
          type: 'BUSINESS_LINE',
          code: 'SERVICIOS'
        }
      },
      update: {},
      create: {
        type: 'BUSINESS_LINE',
        code: 'SERVICIOS',
        name: 'Servicios Esenciales',
        description: 'Internet, telefonía y servicios básicos',
        orderIndex: 4
      }
    })
  ]);

  // ============================================
  // 6. CREAR MAPEO DE CAMPOS
  // ============================================
  console.log('🔗 Creating field mappings...');

  const fieldMappings = [
    // Mapeos para área DISEÑO
    {
      sourceArea: 'DISENO',
      sourceField: 'ID',
      targetField: 'externalId',
      targetTable: 'staging_projects',
      description: 'ID del registro en Excel'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Siglas de Dependencias',
      targetField: 'clientAcronym',
      targetTable: 'staging_projects',
      transformation: 'UPPERCASE',
      isRequired: true,
      description: 'Siglas del cliente'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Cliente',
      targetField: 'projectName',
      targetTable: 'staging_projects',
      isRequired: true,
      description: 'Nombre del cliente/proyecto'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Descripción del Requerimiento',
      targetField: 'serviceDescription',
      targetTable: 'staging_projects',
      description: 'Descripción del servicio solicitado'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Estatus General',
      targetField: 'generalStatus',
      targetTable: 'staging_projects',
      description: 'Estado general del proyecto'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Etapa de Proyecto',
      targetField: 'projectStage',
      targetTable: 'staging_projects',
      transformation: 'STAGE_LOOKUP',
      description: 'Etapa actual del proyecto'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Arquitecto',
      targetField: 'architectId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Arquitecto/Diseñador asignado'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Fecha Solicitud (KOM)',
      targetField: 'requestDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de kick-off meeting'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'ID Siebel',
      targetField: 'siebelId',
      targetTable: 'staging_projects',
      description: 'Identificador en sistema Siebel'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Fecha JA',
      targetField: 'clarificationDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de junta de aclaraciones'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Fecha Entrega',
      targetField: 'deliveryDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de entrega de propuesta'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Fecha Fallo',
      targetField: 'decisionDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de decisión/fallo'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Gerente DS',
      targetField: 'designManagerId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Gerente de Diseño de Soluciones'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Coordinador DS',
      targetField: 'designCoordinatorId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Coordinador de Diseño de Soluciones'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Tipo de Servicio',
      targetField: 'serviceTypeId',
      targetTable: 'staging_projects',
      transformation: 'CATALOG_LOOKUP',
      description: 'Tipo de servicio (Nuevo/Existente)'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Tipo de Contratacion',
      targetField: 'contractTypeId',
      targetTable: 'staging_projects',
      transformation: 'CATALOG_LOOKUP',
      description: 'Modalidad de contratación'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'TCV (MxN)',
      targetField: 'tcvMXN',
      targetTable: 'staging_projects',
      transformation: 'CURRENCY_TO_NUMBER',
      description: 'Valor total del contrato'
    },
    {
      sourceArea: 'DISENO',
      sourceField: 'Ingreso Mensual (MxN)',
      targetField: 'monthlyIncomeMXN',
      targetTable: 'staging_projects',
      transformation: 'CURRENCY_TO_NUMBER',
      description: 'Ingreso mensual recurrente'
    }
  ];

  await Promise.all(
    fieldMappings.map((mapping, index) =>
      prisma.fieldMapping.create({
        data: {
          ...mapping,
          orderIndex: index + 1
        }
      })
    )
  );

  // ============================================
  // 7. CREAR MAPEO DE ESTADOS
  // ============================================
  console.log('🔄 Creating status mappings...');

  const statusMappings = [
    // Mapeos para DISEÑO
    {
      sourceArea: 'DISENO',
      sourceStatus: 'En Propuesta',
      projectStageId: projectStages[0].id, // PROPUESTA
      projectStatus: 'IN_PROPOSAL'
    },
    {
      sourceArea: 'DISENO',
      sourceStatus: 'Adjudicado',
      projectStageId: projectStages[2].id, // ADJUDICADO
      projectStatus: 'AWARDED'
    },
    {
      sourceArea: 'DISENO',
      sourceStatus: 'Entregado',
      projectStageId: projectStages[4].id, // ENTREGADO
      projectStatus: 'COMPLETED'
    },
    {
      sourceArea: 'DISENO',
      sourceStatus: 'Perdido',
      projectStageId: projectStages[5].id, // PERDIDO
      projectStatus: 'LOST'
    },
    {
      sourceArea: 'DISENO',
      sourceStatus: 'En Evaluación',
      projectStageId: projectStages[1].id, // EVALUACION
      projectStatus: 'ACTIVE'
    }
  ];

  await Promise.all(
    statusMappings.map(mapping =>
      prisma.statusMapping.create({
        data: mapping
      })
    )
  );

  // ============================================
  // 8. CREAR CONFIGURACIÓN DE FLUJOS
  // ============================================
  console.log('🔀 Creating workflow configurations...');

  await Promise.all([
    prisma.workflowConfig.create({
      data: {
        name: 'Diseño a PMO',
        fromAreaId: areas[0].id, // DISEÑO
        toAreaId: areas[1].id, // PMO
        requiredFields: [
          'clientId',
          'projectName',
          'serviceDescription',
          'siebelId',
          'tcvMXN'
        ],
        validations: {
          rules: [
            {
              field: 'projectStage',
              condition: 'equals',
              value: 'ADJUDICADO'
            }
          ]
        },
        autoApprove: false,
        notifyRoles: ['COORDINADOR', 'ADMINISTRADOR'],
        allowedRoles: ['COORDINADOR', 'ADMINISTRADOR'],
        description: 'Transferencia de proyectos adjudicados de Diseño a PMO'
      }
    }),
    prisma.workflowConfig.create({
      data: {
        name: 'PMO a Atención',
        fromAreaId: areas[1].id, // PMO
        toAreaId: areas[2].id, // ATENCIÓN
        requiredFields: [
          'clientId',
          'projectName',
          'deliveryDate'
        ],
        validations: {
          rules: [
            {
              field: 'projectStatus',
              condition: 'in',
              value: ['COMPLETED', 'ACTIVE']
            }
          ]
        },
        autoApprove: false,
        notifyRoles: ['COORDINADOR', 'ADMINISTRADOR'],
        allowedRoles: ['COORDINADOR', 'ADMINISTRADOR'],
        description: 'Transferencia de proyectos completados de PMO a Atención a Clientes'
      }
    })
  ]);

  // ============================================
  // 9. CONFIGURACIÓN DE IDs INTERNOS
  // ============================================
  console.log('🔢 Creating internal ID configurations...');

  const currentYear = new Date().getFullYear();

  await Promise.all(
    segments.map(segment =>
      prisma.internalIdConfig.create({
        data: {
          segmentId: segment.id,
          year: currentYear,
          lastSequence: 0,
          prefix: null
        }
      })
    )
  );

  // ============================================
  // 10. CONFIGURACIÓN DEL SISTEMA
  // ============================================
  console.log('⚙️ Creating system configurations...');

  await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'excel_date_format' },
      update: {},
      create: {
        key: 'excel_date_format',
        value: 'DD/MM/YYYY',
        description: 'Formato de fecha esperado en archivos Excel',
        createdBy: adminUser.id
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'max_import_records' },
      update: {},
      create: {
        key: 'max_import_records',
        value: '5000',
        description: 'Número máximo de registros por importación',
        createdBy: adminUser.id
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'auto_validate_staging' },
      update: {},
      create: {
        key: 'auto_validate_staging',
        value: 'true',
        description: 'Validar automáticamente proyectos en staging',
        createdBy: adminUser.id
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'internal_id_pattern' },
      update: {},
      create: {
        key: 'internal_id_pattern',
        value: 'YY-S-XXX-NN',
        description: 'Patrón para generación de IDs internos',
        createdBy: adminUser.id
      }
    })
  ]);

  // ============================================
  // 11. CREAR DATOS DE EJEMPLO EN STAGING
  // ============================================
  console.log('📝 Creating example staging projects...');

  const batchId = `IMPORT-${Date.now()}`;

  await prisma.stagingProject.create({
    data: {
      batchId,
      externalId: '155',
      sourceArea: 'DISENO',
      clientId: clients[3].id, // UAA
      projectName: 'Enlace Fibra Óptica Universidad',
      serviceDescription: 'Enlace por Fibra Óptica de Internet Simétrico Dedicado para los distintos campus',
      generalStatus: 'Adjudicado - Parcial',
      projectStageId: projectStages[2].id, // ADJUDICADO
      requestDate: new Date('2023-02-08'),
      clarificationDate: new Date('2023-02-16'),
      deliveryDate: new Date('2023-02-21'),
      decisionDate: new Date('2023-02-23'),
      siebelId: '1-29108NA',
      serviceTypeId: (await prisma.catalog.findFirst({
        where: { type: 'SERVICE_TYPE', code: 'NUEVO' }
      }))?.id,
      contractTypeId: (await prisma.catalog.findFirst({
        where: { type: 'CONTRACT_TYPE', code: 'LICITACION' }
      }))?.id,
      contractPeriodMonths: 12,
      monthlyIncomeMXN: 16116.00,
      tcvMXN: 193392.00,
      products: ['Internet Dedicado', 'Firewall Administrado'],
      manufacturers: ['HUAWEI'],
      status: 'VALIDATED',
      rawData: {
        originalRow: 1,
        fileName: 'ExcelDiseño.xlsx',
        importDate: new Date().toISOString()
      }
    }
  });

  await prisma.stagingProject.create({
    data: {
      batchId,
      externalId: '156',
      sourceArea: 'DISENO',
      clientId: clients[0].id, // STPS
      projectName: 'Cambio de Domicilio Internet STPS',
      serviceDescription: 'Cambio de Domicilio Internet Dedicado 1 STPS LA Morena CDMX a GTO',
      generalStatus: 'En proceso de entrega',
      projectStageId: projectStages[3].id, // EJECUCION
      requestDate: new Date('2023-02-20'),
      deliveryDate: new Date('2023-02-27'),
      siebelId: '1-28UVKL6',
      serviceTypeId: (await prisma.catalog.findFirst({
        where: { type: 'SERVICE_TYPE', code: 'EXISTENTE' }
      }))?.id,
      contractTypeId: (await prisma.catalog.findFirst({
        where: { type: 'CONTRACT_TYPE', code: 'BAU' }
      }))?.id,
      contractPeriodMonths: 24,
      products: ['EVPN Red MPLS', 'Multifuncional Administrado', 'Videoconferencia'],
      manufacturers: ['FORTINET', 'POLY'],
      suppliers: ['Silzar'],
      status: 'VALIDATED',
      rawData: {
        originalRow: 2,
        fileName: 'ExcelDiseño.xlsx',
        importDate: new Date().toISOString()
      }
    }
  });

  console.log('✅ Extended seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  - ${segments.length} segments created`);
  console.log(`  - ${areas.length} areas created`);
  console.log(`  - ${clients.length} clients created`);
  console.log(`  - ${projectStages.length} project stages created`);
  console.log(`  - ${fieldMappings.length} field mappings created`);
  console.log(`  - 2 example staging projects created`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });