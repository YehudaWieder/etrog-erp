import type { Request } from 'express';
import {
  ISRAEL_ROUTE_PREFIX,
  OWNER_VIEWER_ALLOWED_MUTATION_RULES,
} from '../constants/owner-viewer-routes.constants';

export function isOwnerViewerAllowedRoute(request: Request): boolean {
  const path = request.path;
  const method = request.method.toUpperCase();

  if (path.startsWith(ISRAEL_ROUTE_PREFIX)) {
    return false;
  }

  if (method === 'GET') {
    return true;
  }

  return OWNER_VIEWER_ALLOWED_MUTATION_RULES.some((rule) => {
    if (rule.method && rule.method !== method) {
      return false;
    }

    if (rule.exact && path !== rule.exact) {
      return false;
    }

    if (rule.pattern && !rule.pattern.test(path)) {
      return false;
    }

    return true;
  });
}
