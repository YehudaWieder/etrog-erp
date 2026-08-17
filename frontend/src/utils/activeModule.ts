export type AppModule = 'italy' | 'israel';

const LAST_MODULE_KEY = 'app.lastActiveModule';

export function getModuleFromPath(pathname: string): AppModule | null {
  if (pathname.startsWith('/israel')) return 'israel';
  if (pathname.startsWith('/italy')) return 'italy';
  return null;
}

export function getLastActiveModule(): AppModule {
  if (typeof window === 'undefined') {
    return 'italy';
  }
  return window.localStorage.getItem(LAST_MODULE_KEY) === 'israel' ? 'israel' : 'italy';
}

export function setLastActiveModule(module: AppModule): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_MODULE_KEY, module);
  }
}
