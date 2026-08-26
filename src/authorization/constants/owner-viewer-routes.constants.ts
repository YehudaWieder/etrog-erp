export type OwnerViewerRouteRule = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  exact?: string;
  pattern?: RegExp;
};

// OWNER_VIEWER has zero access to Israel (blocked entirely, see owner-viewer-access.policy.ts)
// and read-only (GET) access everywhere else, except this small self-service allowlist.
export const OWNER_VIEWER_ALLOWED_MUTATION_RULES: ReadonlyArray<OwnerViewerRouteRule> =
  [
    { method: 'PATCH', exact: '/api/users' },
    { method: 'DELETE', pattern: /^\/api\/users\/[^/]+$/ },
    { method: 'POST', exact: '/api/auth/logout' },
  ];

export const ISRAEL_ROUTE_PREFIX = '/api/israel/';
