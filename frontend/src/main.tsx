import './styles/design-tokens.css';
import './styles/BaseLegacyGlobal.css';
import './styles/ModalLegacyGlobal.css';
import './styles/AppShellLegacyGlobal.css';
import './styles/GlobalApiToastLegacyGlobal.css';
import './styles/SeasonsLegacyGlobal.css';
import './styles/AuthLegacyGlobal.css';
import './styles/DarkModeLegacyGlobal.css';
import './styles/ResponsiveLegacyGlobal.css';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { HomeRoute } from './app/routes/HomeRoute';
import { ShipmentsRoute } from './app/routes/ShipmentsRoute';
import { LoginRoute } from './app/routes/LoginRoute';
import { RegisterRoute } from './app/routes/RegisterRoute';
import { ProfileRoute } from './app/routes/ProfileRoute';
import { MessagesRoute } from './app/routes/MessagesRoute';
import { HarvestRoute } from './app/routes/HarvestRoute';
import { TraderInventoryRoute } from './app/routes/TraderInventoryRoute';
import { CustomerInventoryRoute } from './app/routes/CustomerInventoryRoute';
import { IsraelHarvestRoute } from './app/routes/IsraelHarvestRoute';
import { PaymentsRoute } from './app/routes/PaymentsRoute';
import { IsraelShipmentsRoute } from './app/routes/IsraelShipmentsRoute';
import { IsraelInventoryRoute } from './app/routes/IsraelInventoryRoute';
import { IsraelPaymentsRoute } from './app/routes/IsraelPaymentsRoute';
import { AuthCallbackRoute } from './app/routes/AuthCallbackRoute';
import { ResetPasswordRoute } from './app/routes/ResetPasswordRoute';
import { AUTH_SESSION_EXPIRED_EVENT } from './services/apiClient';
import { SessionExpiryDialog } from './components/ui/SessionExpiryDialog';
import { useSessionExpiryWarning } from './hooks/useSessionExpiryWarning';
import SettingsPage from './features/settings/SettingsPage';
import { isAuthenticated, getCurrentUser, isManagerRole, isOwnerViewerRole } from './services/authService';
import { getSetupStatus } from './services/setupApi';
import { getLastActiveModule } from './utils/activeModule';

// Load saved colors from localStorage and apply to CSS variables
function initializeTheme(): void {
  if (typeof window !== 'undefined') {
    const primaryColor = window.localStorage.getItem('app.primaryColor');
    const accentColor = window.localStorage.getItem('app.accentColor');
    const textColor = window.localStorage.getItem('app.textColor');
    const darkMode = window.localStorage.getItem('app.darkMode');

    if (primaryColor) {
      document.documentElement.style.setProperty('--color-primary', primaryColor);
    }
    if (accentColor) {
      document.documentElement.style.setProperty('--color-text-accent', accentColor);
    }
    if (textColor) {
      document.documentElement.style.setProperty('--color-text-main', textColor);
    }
    if (darkMode === 'true') {
      document.documentElement.setAttribute('data-dark-mode', 'true');
    }
  }
}

initializeTheme();

// Prevent the mouse wheel from changing the value of a focused number input;
// quantity fields should only be editable via the keyboard.
if (typeof window !== 'undefined') {
  document.addEventListener(
    'wheel',
    () => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === 'number') {
        active.blur();
      }
    },
    { passive: true },
  );
}

type SetupRequirement = { path: string; step: 1 | 2 | 3 };

const SETUP_ALLOWED_PATHS: Record<1 | 2 | 3, string[]> = {
  1: ['/italy/settings/traders'],
  2: ['/italy/settings/traders', '/italy/settings/system/default-categories'],
  3: ['/italy/settings/traders', '/italy/settings/system/default-categories', '/italy/settings/system/seasons'],
};

function getSetupRequirement(status: { hasTraders: boolean; hasDefaultCategories: boolean; hasSeasons: boolean }): SetupRequirement | null {
  if (!status.hasTraders) return { path: '/italy/settings/traders', step: 1 };
  if (!status.hasDefaultCategories) return { path: '/italy/settings/system/default-categories', step: 2 };
  if (!status.hasSeasons) return { path: '/italy/settings/system/seasons', step: 3 };
  return null;
}

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback', '/auth/reset-password'];

// Blocks rendering of any protected route (and the API calls its children would fire)
// until a valid, non-expired token is confirmed — deep-linking straight into a page
// must not get further than the login screen does.
function AuthGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const isExempt = PUBLIC_PATHS.includes(location.pathname);
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed && !isExempt) {
      navigate('/login', { replace: true });
    }
  }, [authed, isExempt, location.pathname, navigate]);

  if (!authed && !isExempt) {
    return null;
  }

  return <>{children}</>;
}

// Owner-viewer accounts have no access to Israel data (cosmetic mirror of the
// backend OwnerViewerAccessGuard, which is the actual security boundary).
function ModuleAccessGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const blocked = isAuthenticated() && isOwnerViewerRole(user?.role) && location.pathname.startsWith('/israel');

  useEffect(() => {
    if (blocked) {
      navigate('/italy/home', { replace: true });
    }
  }, [blocked, navigate]);

  if (blocked) {
    return null;
  }

  return <>{children}</>;
}

function SetupGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const setupCompleteRef = useRef<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    const isManager = isAuthenticated() && isManagerRole(user?.role);
    const isExempt = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/auth/callback' || location.pathname === '/auth/reset-password';

    if (!isManager || isExempt) {
      setReady(true);
      return;
    }

    if (setupCompleteRef.current === true) {
      setReady(true);
      return;
    }

    setReady(false);
    getSetupStatus()
      .then(status => {
        setupCompleteRef.current = status.isSetupComplete;

        if (status.isSetupComplete) {
          setReady(true);
          return;
        }

        const requirement = getSetupRequirement(status);
        if (!requirement) {
          setReady(true);
          return;
        }

        if (SETUP_ALLOWED_PATHS[requirement.step].includes(location.pathname)) {
          setReady(true);
          return;
        }

        navigate(requirement.path, { replace: true, state: { setupStep: requirement.step } });
      })
      .catch(() => setReady(true));
  }, [location.pathname, navigate]);

  return ready ? <>{children}</> : null;
}

function DefaultHomeRedirect(): JSX.Element {
  return <Navigate to={`/${getLastActiveModule()}/home`} replace />;
}

function SessionExpiryWarning(): JSX.Element | null {
  const { showWarning, isExtending, extendSession, dismissSession } = useSessionExpiryWarning();

  return (
    <SessionExpiryDialog
      open={showWarning}
      isExtending={isExtending}
      onExtend={() => void extendSession()}
      onDismiss={dismissSession}
    />
  );
}

function AppRouter(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleSessionExpired = () => {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [location.pathname, navigate]);

  return (
    <AuthGuard>
      <ModuleAccessGuard>
        <SetupGuard>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            <Route path="/auth/reset-password" element={<ResetPasswordRoute />} />
            <Route path="/profile/*" element={<ProfileRoute />} />
            <Route path="/messages/*" element={<MessagesRoute />} />

            <Route path="/italy/home" element={<HomeRoute />} />
            <Route path="/italy/harvest/*" element={<HarvestRoute />} />
            <Route path="/italy/traders/*" element={<TraderInventoryRoute />} />
            <Route path="/italy/customers/*" element={<CustomerInventoryRoute />} />
            <Route path="/italy/shipments/*" element={<ShipmentsRoute />} />
            <Route path="/italy/payments/*" element={<PaymentsRoute />} />
            <Route path="/italy/settings/*" element={<SettingsPage />} />

            <Route path="/israel/home" element={<HomeRoute />} />
            <Route path="/israel/harvest/*" element={<IsraelHarvestRoute />} />
            <Route path="/israel/shipments/*" element={<IsraelShipmentsRoute />} />
            <Route path="/israel/inventory/*" element={<IsraelInventoryRoute />} />
            <Route path="/israel/payments/*" element={<IsraelPaymentsRoute />} />
            <Route path="/israel/settings/*" element={<SettingsPage />} />

            <Route path="*" element={<DefaultHomeRedirect />} />
          </Routes>
        </SetupGuard>
      </ModuleAccessGuard>
    </AuthGuard>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppRouter />
        <SessionExpiryWarning />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
