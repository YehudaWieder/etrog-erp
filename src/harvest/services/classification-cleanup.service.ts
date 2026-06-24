import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

const SOFT_DELETE_TTL_DAYS = 7;

@Injectable()
export class ClassificationCleanupService {
  private readonly logger = new Logger(ClassificationCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredSoftDeleted() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SOFT_DELETE_TTL_DAYS);

    const expired = await this.prisma.classification.findMany({
      where: { isDeleted: true, updatedAt: { lt: cutoff } },
      select: { id: true },
    });

    if (expired.length === 0) return;

    const ids = expired.map((r) => r.id);

    await this.prisma.classification.deleteMany({ where: { id: { in: ids } } });

    this.logger.log(`Purged ${ids.length} expired soft-deleted classification(s) (older than ${SOFT_DELETE_TTL_DAYS} days).`);
  }
}
