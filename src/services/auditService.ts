import prisma from '@/lib/prisma';

interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
}

export class AuditService {
  static async log(input: AuditLogInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
        afterState: input.afterState ? JSON.stringify(input.afterState) : null,
      },
    });
  }
}
