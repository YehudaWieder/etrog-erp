import { useLocation } from 'react-router-dom';
import { getLastActiveModule, getModuleFromPath, type AppModule } from '../utils/activeModule';

export function useActiveModule(): AppModule {
  const location = useLocation();
  return getModuleFromPath(location.pathname) ?? getLastActiveModule();
}
