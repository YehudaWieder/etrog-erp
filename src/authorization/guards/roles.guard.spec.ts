/// <reference types="jest" />

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function createContext(user?: { role: Role }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when no roles are required', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
  });

  it('throws unauthorized when roles are required but user is missing', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue([Role.OWNER]);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws forbidden when user role does not match', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue([Role.OWNER]);

    expect(() =>
      guard.canActivate(createContext({ role: Role.WORKER })),
    ).toThrow(ForbiddenException);
  });

  it('allows when user role matches required roles', () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([Role.OWNER, Role.MANAGER]);

    const result = guard.canActivate(createContext({ role: Role.MANAGER }));

    expect(result).toBe(true);
  });
});
