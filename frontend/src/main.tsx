import './styles/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShipmentsRoute } from './app/routes/ShipmentsRoute';
import { LoginRoute } from './app/routes/LoginRoute';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
        <Route path="*" element={<Navigate to="/shipments" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
