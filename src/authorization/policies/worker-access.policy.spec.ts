import { isWorkerAllowedRoute } from './worker-access.policy';
import type { Request } from 'express';

type RouteRequest = Pick<Request, 'path' | 'method'>;

function request(path: string, method: string): Request {
  const routeRequest: RouteRequest = {
    path,
    method,
  };

  return routeRequest as Request;
}

describe('isWorkerAllowedRoute', () => {
  it('allows messages routes', () => {
    expect(isWorkerAllowedRoute(request('/messages', 'GET'))).toBe(true);
    expect(isWorkerAllowedRoute(request('/messages/123', 'GET'))).toBe(true);
  });

  it('allows auth profile routes with expected methods', () => {
    expect(isWorkerAllowedRoute(request('/auth/me', 'GET'))).toBe(true);
    expect(isWorkerAllowedRoute(request('/auth/logout', 'POST'))).toBe(true);
  });

  it('allows users routes for configured methods', () => {
    expect(isWorkerAllowedRoute(request('/users', 'GET'))).toBe(true);
    expect(isWorkerAllowedRoute(request('/users', 'PATCH'))).toBe(true);
    expect(isWorkerAllowedRoute(request('/users/slug-1', 'GET'))).toBe(true);
    expect(isWorkerAllowedRoute(request('/users/42', 'DELETE'))).toBe(true);
  });

  it('denies routes with wrong methods', () => {
    expect(isWorkerAllowedRoute(request('/auth/me', 'POST'))).toBe(false);
    expect(isWorkerAllowedRoute(request('/users/42', 'PATCH'))).toBe(false);
  });

  it('denies unrelated sensitive routes', () => {
    expect(isWorkerAllowedRoute(request('/system-config/1', 'GET'))).toBe(
      false,
    );
    expect(isWorkerAllowedRoute(request('/partners', 'GET'))).toBe(false);
  });
});
