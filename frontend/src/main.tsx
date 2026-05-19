import './styles/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomeRoute } from './app/routes/HomeRoute';
import { ShipmentsRoute } from './app/routes/ShipmentsRoute';
import { LoginRoute } from './app/routes/LoginRoute';
import { RegisterRoute } from './app/routes/RegisterRoute';
import { ProfileRoute } from './app/routes/ProfileRoute';
import { ManagerProfileEditRoute } from './app/routes/ManagerProfileEditRoute';
import { MessagesRoute } from './app/routes/MessagesRoute';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/home" element={<HomeRoute />} />
        <Route path="/profile/manage-profile/:id" element={<ManagerProfileEditRoute />} />
        <Route path="/profile/*" element={<ProfileRoute />} />
        <Route path="/messages/*" element={<MessagesRoute />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
