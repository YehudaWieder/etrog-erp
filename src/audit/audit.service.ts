import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  userId: number;
  action: AuditAction;
  entityType: string;
  entityId: string | number;
  before?: unknown;
  after?: unknown;
}

// Strips non-JSON-safe values (Date, Decimal, etc.) picked up from Prisma models so
// the payload is valid for a Json column.
function toJsonSafe(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: String(entry.entityId),
          before: toJsonSafe(entry.before),
          after: toJsonSafe(entry.after),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log for ${entry.entityType}:${entry.entityId} (${entry.action})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
