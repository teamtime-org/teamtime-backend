const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class InternalIdService {
  /**
   * Genera ID interno: YY-S-XXX-NN
   * YY: Año (2 dígitos)
   * S: Segmento (1 dígito)
   * XXX: Siglas del cliente (3-4 caracteres)
   * NN: Consecutivo (2 dígitos)
   */
  async generateInternalId(clientAcronym, segmentId, year = null) {
    try {
      const currentYear = year || new Date();
      const yearCode = currentYear.getFullYear().toString().slice(-2);

      // Obtener segmento
      const segment = await prisma.segment.findUnique({
        where: { id: segmentId }
      });

      if (!segment) {
        throw new Error(`Segmento no encontrado: ${segmentId}`);
      }

      // Obtener configuración de ID interno para el segmento y año
      let idConfig = await prisma.internalIdConfig.findUnique({
        where: {
          segmentId_year: {
            segmentId: segmentId,
            year: currentYear.getFullYear()
          }
        }
      });

      // Si no existe configuración para este año, crear una nueva
      if (!idConfig) {
        idConfig = await prisma.internalIdConfig.create({
          data: {
            segmentId: segmentId,
            year: currentYear.getFullYear(),
            lastSequence: 0
          }
        });
      }

      // Incrementar secuencia
      const updatedConfig = await prisma.internalIdConfig.update({
        where: { id: idConfig.id },
        data: { lastSequence: { increment: 1 } }
      });

      // Formatear ID
      const sequence = updatedConfig.lastSequence.toString().padStart(2, '0');
      const acronym = clientAcronym.toUpperCase().slice(0, 4);

      return `${yearCode}-${segment.code}-${acronym}-${sequence}`;

    } catch (error) {
      console.error('Error generating internal ID:', error);
      throw error;
    }
  }

  /**
   * Valida formato de ID interno
   */
  validateInternalIdFormat(internalId) {
    const pattern = /^\d{2}-[A-Z]-[A-Z0-9]{2,4}-\d{2}$/;
    return pattern.test(internalId);
  }

  /**
   * Parsea un ID interno para obtener sus componentes
   */
  parseInternalId(internalId) {
    if (!this.validateInternalIdFormat(internalId)) {
      throw new Error('Formato de ID interno inválido');
    }

    const parts = internalId.split('-');
    return {
      year: `20${parts[0]}`,
      segmentCode: parts[1],
      clientAcronym: parts[2],
      sequence: parseInt(parts[3])
    };
  }

  /**
   * Obtiene el próximo ID disponible sin generarlo
   */
  async getNextInternalId(clientAcronym, segmentId) {
    const currentYear = new Date();
    const yearCode = currentYear.getFullYear().toString().slice(-2);

    const segment = await prisma.segment.findUnique({
      where: { id: segmentId }
    });

    if (!segment) {
      throw new Error(`Segmento no encontrado: ${segmentId}`);
    }

    const idConfig = await prisma.internalIdConfig.findUnique({
      where: {
        segmentId_year: {
          segmentId: segmentId,
          year: currentYear.getFullYear()
        }
      }
    });

    const nextSequence = (idConfig?.lastSequence || 0) + 1;
    const sequence = nextSequence.toString().padStart(2, '0');
    const acronym = clientAcronym.toUpperCase().slice(0, 4);

    return `${yearCode}-${segment.code}-${acronym}-${sequence}`;
  }
}

module.exports = new InternalIdService();