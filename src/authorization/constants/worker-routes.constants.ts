export type WorkerAllowedRouteRule = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  exact?: string;
  prefix?: string;
  pattern?: RegExp;
};

export const WORKER_ALLOWED_ROUTE_RULES: ReadonlyArray<WorkerAllowedRouteRule> =
  [
    { prefix: '/messages/' },
    { exact: '/messages' },
    { method: 'GET', exact: '/auth/me' },
    { method: 'POST', exact: '/auth/logout' },
    { method: 'PATCH', exact: '/users' },
    { method: 'GET', exact: '/users' },
    { method: 'GET', pattern: /^\/users\/[^/]+$/ },
    { method: 'DELETE', pattern: /^\/users\/[^/]+$/ },
  ];
