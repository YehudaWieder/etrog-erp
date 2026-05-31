import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

export type TraderWorkerCategoryRecord = {
  id: number;
  name: string;
  notes: string | null;
};

export function isManagerOrAbove(actor: AuthenticatedUser): boolean {
  return actor.role === Role.MANAGER || actor.role === Role.OWNER;
}

export function toWorkerTraderCategoryView(record: TraderWorkerCategoryRecord) {
  return {
    id: record.id,
    name: record.name,
    grade: null,
    percent: null,
    notes: record.notes,
  };
}
