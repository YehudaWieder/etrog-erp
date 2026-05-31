/// <reference types="jest" />

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ActiveGuard } from './active.guard';

type User = {
  isActive: boolean;
};

function createContext(user?: User): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('ActiveGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new ActiveGuard(reflector);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows public routes', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
  });

  it('throws unauthorized when user is missing on non-public routes', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws forbidden for inactive users', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);

    expect(() => guard.canActivate(createContext({ isActive: false }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows active users on non-public routes', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);

    const result = guard.canActivate(createContext({ isActive: true }));

    expect(result).toBe(true);
  });
});
