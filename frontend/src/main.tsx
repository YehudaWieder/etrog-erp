import './styles/design-tokens.css';
import './styles/BaseLegacyGlobal.module.css';
import './styles/ModalLegacyGlobal.module.css';
import './styles/AppShellLegacyGlobal.module.css';
import './styles/GlobalApiToastLegacyGlobal.module.css';
import './styles/SeasonsLegacyGlobal.module.css';
import './styles/AuthLegacyGlobal.module.css';
import './styles/DarkModeLegacyGlobal.module.css';
import './styles/ResponsiveLegacyGlobal.module.css';
import React, { useEffect } from 'react';
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
import { WorkersRoute } from './app/routes/WorkersRoute';
import { PaymentsRoute } from './app/routes/PaymentsRoute';
import { AUTH_SESSION_EXPIRED_EVENT } from './services/apiClient';
import SettingsPage from './features/settings/SettingsPage';

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
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/home" element={<HomeRoute />} />
      <Route path="/profile/*" element={<ProfileRoute />} />
      <Route path="/messages/*" element={<MessagesRoute />} />
      <Route path="/harvest/*" element={<HarvestRoute />} />
      <Route path="/traders/*" element={<TraderInventoryRoute />} />
      <Route path="/partners/*" element={<Navigate to="/traders" replace />} />
      <Route path="/customers/*" element={<CustomerInventoryRoute />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
      <Route path="/workers/*" element={<WorkersRoute />} />
      <Route path="/payments/*" element={<PaymentsRoute />} />
      <Route path="/settings/*" element={<SettingsPage />} />
      {/* <Route path="/seasons" element={<Navigate to="/settings/system/seasons" replace />} /> removed as per request */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
