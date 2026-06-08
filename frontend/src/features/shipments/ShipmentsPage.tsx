import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { SHIPMENTS_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { AllShipmentsTable } from './components/AllShipmentsTable';
import { AllBoxesTable } from './components/AllBoxesTable';
import { ShipmentItemsTable } from './components/ShipmentItemsTable';
import { ShipmentsPageHeaderActions } from './components/shared/ShipmentsPageHeaderActions';
import type { BoxesTableRow, ShipmentItemsTableRow, ShipmentRecord } from './shipments.types';

const DEFAULT_SIDEBAR_ITEM_ID = 'all-shipments';

// Removed sidebarTextById. All text now comes from i18n object.

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('shipments');
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [selectedShipmentRow, setSelectedShipmentRow] = useState<ShipmentRecord | null>(null);
  const [selectedBoxRow, setSelectedBoxRow] = useState<BoxesTableRow | null>(null);
  const [selectedItemRow, setSelectedItemRow] = useState<ShipmentItemsTableRow | null>(null);

  useEffect(() => {
    // טען כמות הודעות שלא נקראו
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);
  const [lastActionText, setLastActionText] = useState<string>('');
  const currentUser = getCurrentUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => alert(t.pageControls.addShipment);
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const handleProfile = () => navigate('/profile');

  // Detect language from localStorage or default to 'he'
  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = SHIPMENTS_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }

      if (section.id === activeSidebarId) {
        return section.title;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.sidebar, t.pageTitle]);

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t]);

  const addActionLabel = useMemo(() => {
    if (activeSidebarId === 'all-boxes') {
      return t.pageControls.addBox;
    }

    if (activeSidebarId === 'shipment-items') {
      return t.pageControls.addItem;
    }

    return t.pageControls.addShipment;
  }, [activeSidebarId, t.pageControls]);

  const isShipmentTableActive = activeSidebarId === 'all-shipments';
  const isBoxesTableActive = activeSidebarId === 'all-boxes';
  const isShipmentItemsTableActive = activeSidebarId === 'shipment-items';
  const areRowActionsDisabled = useMemo(() => {
    if (isShipmentTableActive) {
      return selectedShipmentRow === null;
    }

    if (isBoxesTableActive) {
      return selectedBoxRow === null;
    }

    if (isShipmentItemsTableActive) {
      return selectedItemRow === null;
    }

    return true;
  }, [isBoxesTableActive, isShipmentItemsTableActive, isShipmentTableActive, selectedBoxRow, selectedItemRow, selectedShipmentRow]);

  useEffect(() => {
    if (!isShipmentTableActive && selectedShipmentRow !== null) {
      setSelectedShipmentRow(null);
    }
  }, [isShipmentTableActive, selectedShipmentRow]);

  useEffect(() => {
    if (activeSidebarId !== 'all-boxes' && selectedBoxRow !== null) {
      setSelectedBoxRow(null);
    }
  }, [activeSidebarId, selectedBoxRow]);

  useEffect(() => {
    if (activeSidebarId !== 'shipment-items' && selectedItemRow !== null) {
      setSelectedItemRow(null);
    }
  }, [activeSidebarId, selectedItemRow]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/shipments/${item.id}`);
  };

  const handleCreateAction = (label: string) => {
    setLastActionText(t.actionSelected(label));
  };

  const handleShipmentRowSelect = (row: ShipmentRecord | null) => {
    if (!row) {
      setSelectedShipmentRow(null);
      return;
    }

    setSelectedShipmentRow((current) => (current?.id === row.id ? null : row));
  };

  const handleBoxRowSelect = (row: BoxesTableRow | null) => {
    if (!row) {
      setSelectedBoxRow(null);
      return;
    }

    setSelectedBoxRow((current) => (current?.id === row.id ? null : row));
  };

  const handleItemRowSelect = (row: ShipmentItemsTableRow | null) => {
    if (!row) {
      setSelectedItemRow(null);
      return;
    }

    setSelectedItemRow((current) => (current?.id === row.id ? null : row));
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      pageHeaderActions={
        <ShipmentsPageHeaderActions
          addActionLabel={addActionLabel}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          onAdd={() => handleCreateAction(addActionLabel)}
          onEdit={() => handleCreateAction(t.pageControls.edit)}
          onDelete={() => handleCreateAction(t.pageControls.delete)}
          editDisabled={areRowActionsDisabled}
          deleteDisabled={areRowActionsDisabled}
        />
      }
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: handleLogin,
        onRegister: handleRegister,
        onLogout: handleLogout,
        onProfile: handleProfile,
        userName: currentUser?.name || t.userNameFallback,
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
        >
          {lang === 'he' ? (
            <>
              {t.settings}
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              {t.settings}
            </>
          )}
        </button>
      }
    >
      {activeSidebarId === 'all-shipments' ? (
        <AllShipmentsTable
          labels={t.tableLabels}
          selectedShipmentId={selectedShipmentRow?.id ?? null}
          onSelectShipment={handleShipmentRowSelect}
        />
      ) : activeSidebarId === 'all-boxes' ? (
        <AllBoxesTable
          labels={t.boxesTableLabels}
          selectedBoxId={selectedBoxRow?.id ?? null}
          onSelectBox={handleBoxRowSelect}
        />
      ) : activeSidebarId === 'shipment-items' ? (
        <ShipmentItemsTable
          labels={t.shipmentItemsTableLabels}
          selectedItemId={selectedItemRow?.id ?? null}
          onSelectItem={handleItemRowSelect}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
          {lastActionText ? <p className="shipments-last-action">{lastActionText}</p> : null}
        </section>
      )}
    </AppShell>
  );
}
