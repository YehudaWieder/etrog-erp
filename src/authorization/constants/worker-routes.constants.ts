export type WorkerAllowedRouteRule = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  exact?: string;
  prefix?: string;
  pattern?: RegExp;
};

export const WORKER_ALLOWED_ROUTE_RULES: ReadonlyArray<WorkerAllowedRouteRule> =
  [
    { prefix: '/api/messages/' },
    { exact: '/api/messages' },
    { method: 'GET', exact: '/api/auth/me' },
    { method: 'POST', exact: '/api/auth/logout' },
    { method: 'PATCH', exact: '/api/users' },
    { method: 'GET', exact: '/api/users' },
    { method: 'GET', pattern: /^\/api\/users\/[^/]+$/ },
    { method: 'DELETE', pattern: /^\/api\/users\/[^/]+$/ },
  ];
