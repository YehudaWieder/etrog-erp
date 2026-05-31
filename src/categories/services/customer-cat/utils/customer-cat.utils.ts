import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

export type CustomerWorkerCategoryRecord = {
  id: number;
  name: string;
  grade: string | null;
  customerId?: number;
  customer?: { customerName: string } | null;
};

export function isManagerOrAbove(actor: AuthenticatedUser): boolean {
  return actor.role === Role.MANAGER || actor.role === Role.OWNER;
}

export function toWorkerCustomerCategoryView(record: CustomerWorkerCategoryRecord) {
  return {
    id: record.id,
    name: record.name,
    grade: record.grade,
    percent: null,
    notes: null,
    customerId: record.customerId ?? null,
    customerName: record.customer?.customerName ?? null,
  };
}
