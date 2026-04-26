import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: Role;
      isActive: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
