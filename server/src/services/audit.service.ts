import { prisma } from '../config/prisma';

export interface CreateAuditLogParams {
  propertyId?: string | null;
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  details: string;
}

export class AuditService {
  static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          propertyId: params.propertyId || null,
          actorId: params.actorId || null,
          actorName: params.actorName,
          actorRole: params.actorRole,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          ipAddress: params.ipAddress || null,
          details: params.details,
        },
      });
    } catch (error) {
      console.error('[AuditLog Error] Failed to write audit log:', error);
      // Non-blocking: we don't want audit log failures to crash user operations
    }
  }
}
