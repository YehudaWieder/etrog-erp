import './styles/globals.css';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HomeRoute } from './app/routes/HomeRoute';
import { ShipmentsRoute } from './app/routes/ShipmentsRoute';
import { LoginRoute } from './app/routes/LoginRoute';
import { RegisterRoute } from './app/routes/RegisterRoute';
import { ProfileRoute } from './app/routes/ProfileRoute';
import { ManagerProfileEditRoute } from './app/routes/ManagerProfileEditRoute';
import { MessagesRoute } from './app/routes/MessagesRoute';
import { AUTH_SESSION_EXPIRED_EVENT } from './services/apiClient';
import SettingsPage from './features/settings/SettingsPage';

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
      <Route path="/profile/manage-profile/:id" element={<ManagerProfileEditRoute />} />
      <Route path="/profile/*" element={<ProfileRoute />} />
      <Route path="/messages/*" element={<MessagesRoute />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
      <Route path="/settings/*" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>,
);
