import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting extended seed v2...');

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
        isInitialArea: true, // Esta es el área inicial
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
        isInitialArea: false,
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
        isInitialArea: false,
        orderIndex: 3,
        createdBy: adminUser.id
      }
    })
  ]);

  // ============================================
  // 3. CONFIGURAR FLUJO ENTRE ÁREAS
  // ============================================
  console.log('🔄 Creating area flow configuration...');

  const areaFlows = await Promise.all([
    // Flujo principal: DISEÑO → PMO → ATENCIÓN
    prisma.areaFlow.upsert({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId: areas[0].id, // DISEÑO
          toAreaId: areas[1].id    // PMO
        }
      },
      update: {},
      create: {
        fromAreaId: areas[0].id, // DISEÑO
        toAreaId: areas[1].id,   // PMO
        flowOrder: 1,
        isRequired: true,
        canSkip: false,
        requiresApproval: true,
        description: 'Transferencia de proyectos adjudicados de Diseño a PMO',
        conditions: {
          requiredStatus: ['AWARDED'],
          requiredFields: ['siebelId', 'tcvMXN'],
          minimumProjectStage: 'ADJUDICADO'
        }
      }
    }),
    prisma.areaFlow.upsert({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId: areas[1].id, // PMO
          toAreaId: areas[2].id    // ATENCIÓN
        }
      },
      update: {},
      create: {
        fromAreaId: areas[1].id, // PMO
        toAreaId: areas[2].id,   // ATENCIÓN
        flowOrder: 2,
        isRequired: true,
        canSkip: false,
        requiresApproval: true,
        description: 'Transferencia de proyectos completados de PMO a Atención a Clientes',
        conditions: {
          requiredStatus: ['COMPLETED', 'ACTIVE'],
          requiredFields: ['deliveryDate'],
          minimumProjectStage: 'ENTREGADO'
        }
      }
    }),
    // Flujo de regreso: PMO → DISEÑO (para correcciones)
    prisma.areaFlow.upsert({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId: areas[1].id, // PMO
          toAreaId: areas[0].id    // DISEÑO
        }
      },
      update: {},
      create: {
        fromAreaId: areas[1].id, // PMO
        toAreaId: areas[0].id,   // DISEÑO
        flowOrder: 0, // Flujo especial (regreso)
        isRequired: false,
        canSkip: true,
        requiresApproval: true,
        description: 'Regreso de proyectos de PMO a Diseño para correcciones',
        conditions: {
          requiresJustification: true,
          allowedRoles: ['ADMINISTRADOR', 'COORDINADOR']
        }
      }
    }),
    // Flujo directo: DISEÑO → ATENCIÓN (skip PMO en casos especiales)
    prisma.areaFlow.upsert({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId: areas[0].id, // DISEÑO
          toAreaId: areas[2].id    // ATENCIÓN
        }
      },
      update: {},
      create: {
        fromAreaId: areas[0].id, // DISEÑO
        toAreaId: areas[2].id,   // ATENCIÓN
        flowOrder: 9, // Flujo alternativo
        isRequired: false,
        canSkip: true,
        requiresApproval: true,
        description: 'Transferencia directa de Diseño a Atención (proyectos simples)',
        conditions: {
          maxTCV: 50000,
          requiresJustification: true,
          allowedRoles: ['ADMINISTRADOR']
        }
      }
    })
  ]);

  // ============================================
  // 4. CREAR CLIENTES
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
  // 5. CREAR ETAPAS DE PROYECTO
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
  // 6. CREAR CATÁLOGOS
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
  // 7. CREAR MAPEO DE CAMPOS (usando Area IDs)
  // ============================================
  console.log('🔗 Creating field mappings...');

  const disenoArea = areas.find(a => a.code === 'DISENO');
  const pmoArea = areas.find(a => a.code === 'PMO');

  if (!disenoArea || !pmoArea) {
    throw new Error('Areas not found for field mapping');
  }

  const fieldMappings = [
    // Mapeos para área DISEÑO
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'ID',
      targetField: 'externalId',
      targetTable: 'staging_projects',
      description: 'ID del registro en Excel'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Siglas de Dependencias',
      targetField: 'clientAcronym',
      targetTable: 'staging_projects',
      transformation: 'UPPERCASE',
      isRequired: true,
      description: 'Siglas del cliente'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Cliente',
      targetField: 'projectName',
      targetTable: 'staging_projects',
      isRequired: true,
      description: 'Nombre del cliente/proyecto'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Descripción del Requerimiento',
      targetField: 'serviceDescription',
      targetTable: 'staging_projects',
      description: 'Descripción del servicio solicitado'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Estatus General',
      targetField: 'generalStatus',
      targetTable: 'staging_projects',
      description: 'Estado general del proyecto'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Etapa de Proyecto',
      targetField: 'projectStage',
      targetTable: 'staging_projects',
      transformation: 'STAGE_LOOKUP',
      description: 'Etapa actual del proyecto'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Arquitecto',
      targetField: 'architectId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Arquitecto/Diseñador asignado'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Fecha Solicitud (KOM)',
      targetField: 'requestDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de kick-off meeting'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'ID Siebel',
      targetField: 'siebelId',
      targetTable: 'staging_projects',
      description: 'Identificador en sistema Siebel'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Fecha JA',
      targetField: 'clarificationDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de junta de aclaraciones'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Fecha Entrega',
      targetField: 'deliveryDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de entrega de propuesta'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Fecha Fallo',
      targetField: 'decisionDate',
      targetTable: 'staging_projects',
      transformation: 'DATE_FORMAT',
      description: 'Fecha de decisión/fallo'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Gerente DS',
      targetField: 'designManagerId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Gerente de Diseño de Soluciones'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Coordinador DS',
      targetField: 'designCoordinatorId',
      targetTable: 'staging_projects',
      transformation: 'USER_LOOKUP',
      description: 'Coordinador de Diseño de Soluciones'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Tipo de Servicio',
      targetField: 'serviceTypeId',
      targetTable: 'staging_projects',
      transformation: 'CATALOG_LOOKUP',
      description: 'Tipo de servicio (Nuevo/Existente)'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'Tipo de Contratacion',
      targetField: 'contractTypeId',
      targetTable: 'staging_projects',
      transformation: 'CATALOG_LOOKUP',
      description: 'Modalidad de contratación'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceField: 'TCV (MxN)',
      targetField: 'tcvMXN',
      targetTable: 'staging_projects',
      transformation: 'CURRENCY_TO_NUMBER',
      description: 'Valor total del contrato'
    },
    {
      sourceAreaId: disenoArea.id,
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
  // 8. CREAR MAPEO DE ESTADOS (usando Area IDs)
  // ============================================
  console.log('🔄 Creating status mappings...');

  const statusMappings = [
    // Mapeos para DISEÑO
    {
      sourceAreaId: disenoArea.id,
      sourceStatus: 'En Propuesta',
      projectStageId: projectStages[0].id, // PROPUESTA
      projectStatus: 'IN_PROPOSAL'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceStatus: 'Adjudicado',
      projectStageId: projectStages[2].id, // ADJUDICADO
      projectStatus: 'AWARDED'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceStatus: 'Entregado',
      projectStageId: projectStages[4].id, // ENTREGADO
      projectStatus: 'COMPLETED'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceStatus: 'Perdido',
      projectStageId: projectStages[5].id, // PERDIDO
      projectStatus: 'LOST'
    },
    {
      sourceAreaId: disenoArea.id,
      sourceStatus: 'En Evaluación',
      projectStageId: projectStages[1].id, // EVALUACION
      projectStatus: 'ACTIVE'
    },
    // Mapeos para PMO (ejemplo para futuras importaciones)
    {
      sourceAreaId: pmoArea.id,
      sourceStatus: 'En Ejecución',
      projectStageId: projectStages[3].id, // EJECUCION
      projectStatus: 'ACTIVE'
    },
    {
      sourceAreaId: pmoArea.id,
      sourceStatus: 'Completado',
      projectStageId: projectStages[4].id, // ENTREGADO
      projectStatus: 'COMPLETED'
    }
  ];

  await Promise.all(
    statusMappings.map(mapping =>
      prisma.statusMapping.create({
        data: mapping as any
      })
    )
  );

  // ============================================
  // 9. CREAR CONFIGURACIÓN DE FLUJOS DE TRABAJO
  // ============================================
  console.log('🔀 Creating workflow configurations...');

  await Promise.all([
    prisma.workflowConfig.create({
      data: {
        name: 'Diseño a PMO',
        fromAreaId: disenoArea.id,
        toAreaId: pmoArea.id,
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
            },
            {
              field: 'tcvMXN',
              condition: 'greater_than',
              value: 0
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
        fromAreaId: pmoArea.id,
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
  // 10. CONFIGURACIÓN DE IDs INTERNOS
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
  // 11. CONFIGURACIÓN DEL SISTEMA
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
    }),
    prisma.systemConfig.upsert({
      where: { key: 'enable_area_flow_validation' },
      update: {},
      create: {
        key: 'enable_area_flow_validation',
        value: 'true',
        description: 'Validar flujo entre áreas según configuración AreaFlow',
        createdBy: adminUser.id
      }
    })
  ]);

  // ============================================
  // 12. CREAR DATOS DE EJEMPLO EN STAGING
  // ============================================
  console.log('📝 Creating example staging projects...');

  const batchId = `IMPORT-${Date.now()}`;

  await prisma.stagingProject.create({
    data: {
      batchId,
      externalId: '155',
      sourceAreaId: disenoArea.id,
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
        importDate: new Date().toISOString(),
        sourceAreaCode: 'DISENO'
      }
    }
  });

  await prisma.stagingProject.create({
    data: {
      batchId,
      externalId: '156',
      sourceAreaId: disenoArea.id,
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
        importDate: new Date().toISOString(),
        sourceAreaCode: 'DISENO'
      }
    }
  });

  console.log('✅ Extended seed v2 completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  - ${segments.length} segments created`);
  console.log(`  - ${areas.length} areas created`);
  console.log(`  - ${areaFlows.length} area flows configured`);
  console.log(`  - ${clients.length} clients created`);
  console.log(`  - ${projectStages.length} project stages created`);
  console.log(`  - ${fieldMappings.length} field mappings created`);
  console.log(`  - 2 example staging projects created`);
  console.log('');
  console.log('🔄 Configured flows:');
  console.log('  - DISEÑO → PMO (Standard)');
  console.log('  - PMO → ATENCIÓN (Standard)');
  console.log('  - PMO → DISEÑO (Return)');
  console.log('  - DISEÑO → ATENCIÓN (Skip PMO)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });