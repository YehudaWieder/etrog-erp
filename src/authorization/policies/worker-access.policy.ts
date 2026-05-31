import type { Request } from 'express';
import { WORKER_ALLOWED_ROUTE_RULES } from '../constants/worker-routes.constants';

export function isWorkerAllowedRoute(request: Request): boolean {
  const path = request.path;
  const method = request.method.toUpperCase();

  return WORKER_ALLOWED_ROUTE_RULES.some((rule) => {
    if (rule.method && rule.method !== method) {
      return false;
    }

    if (rule.exact && path !== rule.exact) {
      return false;
    }

    if (rule.prefix && !path.startsWith(rule.prefix)) {
      return false;
    }

    if (rule.pattern && !rule.pattern.test(path)) {
      return false;
    }

    return true;
  });
}
