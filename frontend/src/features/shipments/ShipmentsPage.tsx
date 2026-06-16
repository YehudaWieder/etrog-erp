import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { SHIPMENTS_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { AllShipmentsTable } from './components/AllShipmentsTable';
import { AllBoxesTable } from './components/AllBoxesTable';
import { ShipmentItemsTable } from './components/ShipmentItemsTable';
import { ShipmentItemsSummary } from './components/ShipmentItemsSummary';
import { ShipmentsPageHeaderActions } from './components/shared/ShipmentsPageHeaderActions';
import { NewShipmentFormModal } from './components/NewShipmentFormModal';
import { NewBoxFormModal } from './components/NewBoxFormModal';
import { NewShipmentItemFormModal } from './components/NewShipmentItemFormModal';
import { EditShipmentItemFormModal } from './components/EditShipmentItemFormModal';
import { EditBoxFormModal } from './components/EditBoxFormModal';
import { EditShipmentFormModal } from './components/EditShipmentFormModal';
import { useNewShipmentForm } from './hooks/useNewShipmentForm';
import { useNewBoxForm } from './hooks/useNewBoxForm';
import { useNewShipmentItemForm } from './hooks/useNewShipmentItemForm';
import { useEditShipmentItemForm } from './hooks/useEditShipmentItemForm';
import { useEditBoxForm } from './hooks/useEditBoxForm';
import { useEditShipmentForm } from './hooks/useEditShipmentForm';
import { useDeleteShipmentDialog } from './hooks/useDeleteShipmentDialog';
import { useDeleteBoxDialog } from './hooks/useDeleteBoxDialog';
import { useDeleteShipmentItemDialog } from './hooks/useDeleteShipmentItemDialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [isNewBoxModalOpen, setIsNewBoxModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isEditShipmentModalOpen, setIsEditShipmentModalOpen] = useState(false);
  const [isEditBoxModalOpen, setIsEditBoxModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [shipmentsRefreshKey, setShipmentsRefreshKey] = useState(0);
  const [boxesRefreshKey, setBoxesRefreshKey] = useState(0);
  const [itemsRefreshKey, setItemsRefreshKey] = useState(0);
  const [tableRowCount, setTableRowCount] = useState<number | null>(null);

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

  const pageTitleWithCount = useMemo(() => {
    const showCount = activeSidebarId === 'all-shipments' || activeSidebarId === 'all-boxes' || activeSidebarId === 'shipment-items';
    if (showCount && tableRowCount !== null) {
      return `${pageTitle} (${tableRowCount})`;
    }
    return pageTitle;
  }, [activeSidebarId, pageTitle, tableRowCount]);

  useEffect(() => {
    setTableRowCount(null);
  }, [activeSidebarId]);

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t]);

  const addActionLabel = useMemo(() => {
    if (activeSidebarId === 'all-boxes') {
      return t.pageControls.addBox;
    }

    if (activeSidebarId === 'shipment-items' || activeSidebarId === 'shipment-items-summary') {
      return t.pageControls.addItem;
    }

    return t.pageControls.addShipment;
  }, [activeSidebarId, t.pageControls]);

  const isShipmentTableActive = activeSidebarId === 'all-shipments';
  const isBoxesTableActive = activeSidebarId === 'all-boxes';
  const isShipmentItemsTableActive = activeSidebarId === 'shipment-items';
  const isShipmentItemsSummaryActive = activeSidebarId === 'shipment-items-summary';
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
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/shipments/${item.id}`);
  };

  const handleCreateAction = (label: string) => {
    setLastActionText(t.actionSelected(label));
  };

  const handleShipmentsRefresh = useCallback(() => {
    setShipmentsRefreshKey((k) => k + 1);
  }, []);

  const handleBoxesRefresh = useCallback(() => {
    setBoxesRefreshKey((k) => k + 1);
  }, []);

  const handleItemsRefresh = useCallback(() => {
    setItemsRefreshKey((k) => k + 1);
  }, []);

  const newShipmentForm = useNewShipmentForm({
    t: t.newShipmentModal,
    onSuccess: handleShipmentsRefresh,
    onClose: () => setIsNewShipmentModalOpen(false),
  });

  const newBoxForm = useNewBoxForm({
    isOpen: isNewBoxModalOpen,
    t: t.newBoxModal,
    onSuccess: handleBoxesRefresh,
    onClose: () => setIsNewBoxModalOpen(false),
  });

  const newShipmentItemForm = useNewShipmentItemForm({
    isOpen: isNewItemModalOpen,
    t: t.newShipmentItemModal,
    onSuccess: handleItemsRefresh,
    onClose: () => setIsNewItemModalOpen(false),
  });

  const editShipmentItemForm = useEditShipmentItemForm({
    itemRow: isEditItemModalOpen ? selectedItemRow : null,
    t: t.editShipmentItemModal,
    onSuccess: handleItemsRefresh,
    onClose: () => setIsEditItemModalOpen(false),
  });

  const editBoxForm = useEditBoxForm({
    boxRow: isEditBoxModalOpen ? selectedBoxRow : null,
    t: t.editBoxModal,
    onSuccess: handleBoxesRefresh,
    onClose: () => setIsEditBoxModalOpen(false),
  });

  const editShipmentForm = useEditShipmentForm({
    shipment: isEditShipmentModalOpen ? selectedShipmentRow : null,
    t: t.editShipmentModal,
    onSuccess: handleShipmentsRefresh,
    onClose: () => setIsEditShipmentModalOpen(false),
  });

  const deleteShipmentDialog = useDeleteShipmentDialog({
    shipment: selectedShipmentRow,
    t: t.deleteShipmentDialog,
    onSuccess: () => {
      setSelectedShipmentRow(null);
      handleShipmentsRefresh();
    },
  });

  const deleteBoxDialog = useDeleteBoxDialog({
    box: selectedBoxRow,
    t: t.deleteBoxDialog,
    onSuccess: () => {
      setSelectedBoxRow(null);
      handleBoxesRefresh();
    },
  });

  const deleteShipmentItemDialog = useDeleteShipmentItemDialog({
    item: selectedItemRow,
    t: t.deleteShipmentItemDialog,
    onSuccess: () => {
      setSelectedItemRow(null);
      handleItemsRefresh();
    },
  });

  const handleAddAction = useCallback(() => {
    if (activeSidebarId === 'all-shipments') {
      setIsNewShipmentModalOpen(true);
    } else if (activeSidebarId === 'all-boxes') {
      setIsNewBoxModalOpen(true);
    } else if (activeSidebarId === 'shipment-items' || activeSidebarId === 'shipment-items-summary') {
      setIsNewItemModalOpen(true);
    } else {
      handleCreateAction(addActionLabel);
    }
  }, [activeSidebarId, addActionLabel]);

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
      pageTitle={pageTitleWithCount}
      pageHeaderActions={
        <ShipmentsPageHeaderActions
          addActionLabel={addActionLabel}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          showRowActions={!isShipmentItemsSummaryActive}
          onAdd={handleAddAction}
          onEdit={() => {
            if (isShipmentTableActive && selectedShipmentRow) {
              setIsEditShipmentModalOpen(true);
            } else if (isBoxesTableActive && selectedBoxRow) {
              setIsEditBoxModalOpen(true);
            } else if (isShipmentItemsTableActive && selectedItemRow) {
              setIsEditItemModalOpen(true);
            } else {
              handleCreateAction(t.pageControls.edit);
            }
          }}
          onDelete={() => {
            if (isShipmentTableActive && selectedShipmentRow) {
              deleteShipmentDialog.handleOpen();
            } else if (isBoxesTableActive && selectedBoxRow) {
              deleteBoxDialog.handleOpen();
            } else if (isShipmentItemsTableActive && selectedItemRow) {
              deleteShipmentItemDialog.handleOpen();
            } else {
              handleCreateAction(t.pageControls.delete);
            }
          }}
          editDisabled={areRowActionsDisabled}
          deleteDisabled={areRowActionsDisabled}
          extraActions={isShipmentItemsSummaryActive ? [
            { label: t.pageControls.addShipment, onClick: () => setIsNewShipmentModalOpen(true) },
            { label: t.pageControls.addBox, onClick: () => setIsNewBoxModalOpen(true) },
          ] : undefined}
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
      <EditShipmentItemFormModal
        isOpen={isEditItemModalOpen}
        t={t.editShipmentItemModal}
        itemId={selectedItemRow?.id ?? 0}
        boxNumber={selectedItemRow?.boxNumber ?? 0}
        boxType={editShipmentItemForm.boxType}
        boxTotalQuantity={editShipmentItemForm.boxTotalQuantity}
        category={selectedItemRow?.category ?? ''}
        ownership={selectedItemRow?.ownership ?? ''}
        grade={editShipmentItemForm.grade}
        isPrivateSelection={editShipmentItemForm.isPrivateSelection}
        pitamStatus={editShipmentItemForm.pitamStatus}
        maxQuantity={editShipmentItemForm.maxQuantity}
        inventoryAvailable={editShipmentItemForm.inventoryAvailable}
        boxSpaceFree={editShipmentItemForm.boxSpaceFree}
        quantity={editShipmentItemForm.quantity}
        onQuantityChange={editShipmentItemForm.setQuantity}
        notes={editShipmentItemForm.notes}
        onNotesChange={editShipmentItemForm.setNotes}
        isLoading={editShipmentItemForm.isLoading}
        isSubmitting={editShipmentItemForm.isSubmitting}
        error={editShipmentItemForm.error}
        onSave={editShipmentItemForm.handleSave}
        onClose={editShipmentItemForm.handleClose}
      />

      <EditBoxFormModal
        isOpen={isEditBoxModalOpen}
        originalBoxNumber={selectedBoxRow?.boxNumber ?? 0}
        t={t.editBoxModal}
        shipments={editBoxForm.shipments}
        traders={editBoxForm.traders}
        customers={editBoxForm.customers}
        isLoadingOptions={editBoxForm.isLoadingOptions}
        hasItems={editBoxForm.hasItems}
        selectedShipmentId={editBoxForm.selectedShipmentId}
        onShipmentIdChange={editBoxForm.setSelectedShipmentId}
        boxNumber={editBoxForm.boxNumber}
        onBoxNumberChange={editBoxForm.setBoxNumber}
        status={editBoxForm.status}
        onStatusChange={editBoxForm.setStatus}
        boxType={editBoxForm.boxType}
        onBoxTypeChange={editBoxForm.setBoxType}
        ownershipType={editBoxForm.ownershipType}
        onOwnershipTypeChange={editBoxForm.setOwnershipType}
        traderId={editBoxForm.traderId}
        onTraderIdChange={editBoxForm.setTraderId}
        customerId={editBoxForm.customerId}
        onCustomerIdChange={editBoxForm.setCustomerId}
        notes={editBoxForm.notes}
        onNotesChange={editBoxForm.setNotes}
        isShipped={editBoxForm.isShipped}
        isShipmentFrozen={editBoxForm.isShipmentFrozen}
        isSubmitting={editBoxForm.isSubmitting}
        error={editBoxForm.error}
        onSave={editBoxForm.handleSave}
        onClose={editBoxForm.handleClose}
      />

      <NewShipmentItemFormModal
        isOpen={isNewItemModalOpen}
        t={t.newShipmentItemModal}
        openBoxes={newShipmentItemForm.openBoxes}
        availableTradersFromInventory={newShipmentItemForm.availableTradersFromInventory}
        availableCustomersFromInventory={newShipmentItemForm.availableCustomersFromInventory}
        availableTraderCategories={newShipmentItemForm.availableTraderCategories}
        availableCustomerCategories={newShipmentItemForm.availableCustomerCategories}
        availableGrades={newShipmentItemForm.availableGrades}
        availablePitamStatuses={newShipmentItemForm.availablePitamStatuses}
        availableQuantity={newShipmentItemForm.availableQuantity}
        remainingCapacity={newShipmentItemForm.remainingCapacity}
        isLoadingOptions={newShipmentItemForm.isLoadingOptions}
        isLoadingInventory={newShipmentItemForm.isLoadingInventory}
        selectedBoxId={newShipmentItemForm.selectedBoxId}
        onBoxIdChange={newShipmentItemForm.setSelectedBoxId}
        selectedBox={newShipmentItemForm.selectedBox}
        itemOwnership={newShipmentItemForm.itemOwnership}
        onItemOwnershipChange={newShipmentItemForm.setItemOwnership}
        stockSource={newShipmentItemForm.stockSource}
        onStockSourceChange={newShipmentItemForm.setStockSource}
        traderId={newShipmentItemForm.traderId}
        onTraderIdChange={newShipmentItemForm.setTraderId}
        customerId={newShipmentItemForm.customerId}
        onCustomerIdChange={newShipmentItemForm.setCustomerId}
        traderCategoryId={newShipmentItemForm.traderCategoryId}
        onTraderCategoryIdChange={newShipmentItemForm.setTraderCategoryId}
        customerCategoryId={newShipmentItemForm.customerCategoryId}
        onCustomerCategoryIdChange={newShipmentItemForm.setCustomerCategoryId}
        grade={newShipmentItemForm.grade}
        onGradeChange={newShipmentItemForm.setGrade}
        pitamStatus={newShipmentItemForm.pitamStatus}
        onPitamStatusChange={newShipmentItemForm.setPitamStatus}
        quantity={newShipmentItemForm.quantity}
        onQuantityChange={newShipmentItemForm.setQuantity}
        notes={newShipmentItemForm.notes}
        onNotesChange={newShipmentItemForm.setNotes}
        isSubmitting={newShipmentItemForm.isSubmitting}
        error={newShipmentItemForm.error}
        onSave={newShipmentItemForm.handleSave}
        onClose={newShipmentItemForm.handleClose}
      />

      <NewBoxFormModal
        isOpen={isNewBoxModalOpen}
        t={t.newBoxModal}
        shipments={newBoxForm.shipments}
        traders={newBoxForm.traders}
        customers={newBoxForm.customers}
        isLoadingOptions={newBoxForm.isLoadingOptions}
        selectedShipmentId={newBoxForm.selectedShipmentId}
        onShipmentIdChange={newBoxForm.setSelectedShipmentId}
        boxNumber={newBoxForm.boxNumber}
        onBoxNumberChange={newBoxForm.setBoxNumber}
        boxType={newBoxForm.boxType}
        onBoxTypeChange={newBoxForm.setBoxType}
        ownershipType={newBoxForm.ownershipType}
        onOwnershipTypeChange={newBoxForm.setOwnershipType}
        traderId={newBoxForm.traderId}
        onTraderIdChange={newBoxForm.setTraderId}
        customerId={newBoxForm.customerId}
        onCustomerIdChange={newBoxForm.setCustomerId}
        notes={newBoxForm.notes}
        onNotesChange={newBoxForm.setNotes}
        isSubmitting={newBoxForm.isSubmitting}
        error={newBoxForm.error}
        onSave={newBoxForm.handleSave}
        onClose={newBoxForm.handleClose}
      />

      <NewShipmentFormModal
        isOpen={isNewShipmentModalOpen}
        t={t.newShipmentModal}
        shipmentNumber={newShipmentForm.shipmentNumber}
        onShipmentNumberChange={newShipmentForm.setShipmentNumber}
        notes={newShipmentForm.notes}
        onNotesChange={newShipmentForm.setNotes}
        isSubmitting={newShipmentForm.isSubmitting}
        error={newShipmentForm.error}
        onSave={newShipmentForm.handleSave}
        onClose={newShipmentForm.handleClose}
      />

      <EditShipmentFormModal
        isOpen={isEditShipmentModalOpen}
        originalShipmentNumber={selectedShipmentRow?.shipmentNumber ?? 0}
        shipmentNumber={editShipmentForm.shipmentNumber}
        onShipmentNumberChange={editShipmentForm.setShipmentNumber}
        t={t.editShipmentModal}
        status={editShipmentForm.status}
        onStatusChange={editShipmentForm.handleStatusChange}
        shippedAt={editShipmentForm.shippedAt}
        onShippedAtChange={editShipmentForm.setShippedAt}
        isShippedAtDisabled={editShipmentForm.status !== 'SHIPPED'}
        notes={editShipmentForm.notes}
        onNotesChange={editShipmentForm.setNotes}
        isSubmitting={editShipmentForm.isSubmitting}
        error={editShipmentForm.error}
        onSave={editShipmentForm.handleSave}
        onClose={editShipmentForm.handleClose}
      />

      <ConfirmDialog
        open={deleteShipmentDialog.isOpen}
        title={t.deleteShipmentDialog.title(selectedShipmentRow?.shipmentNumber ?? 0)}
        message={t.deleteShipmentDialog.message(selectedShipmentRow?.shipmentNumber ?? 0)}
        confirmLabel={t.deleteShipmentDialog.confirm}
        cancelLabel={t.deleteShipmentDialog.cancel}
        onConfirm={deleteShipmentDialog.handleConfirm}
        onCancel={deleteShipmentDialog.handleCancel}
      >
        {deleteShipmentDialog.error ? (
          <p className="seasons-manager__error">{deleteShipmentDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteBoxDialog.isOpen}
        title={t.deleteBoxDialog.title(selectedBoxRow?.boxNumber ?? 0)}
        message={t.deleteBoxDialog.message(selectedBoxRow?.boxNumber ?? 0)}
        confirmLabel={t.deleteBoxDialog.confirm}
        cancelLabel={t.deleteBoxDialog.cancel}
        onConfirm={deleteBoxDialog.handleConfirm}
        onCancel={deleteBoxDialog.handleCancel}
      >
        {deleteBoxDialog.error ? (
          <p className="seasons-manager__error">{deleteBoxDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteShipmentItemDialog.isOpen}
        title={t.deleteShipmentItemDialog.title(selectedItemRow?.id ?? 0)}
        message={t.deleteShipmentItemDialog.message(selectedItemRow?.id ?? 0)}
        confirmLabel={t.deleteShipmentItemDialog.confirm}
        cancelLabel={t.deleteShipmentItemDialog.cancel}
        onConfirm={deleteShipmentItemDialog.handleConfirm}
        onCancel={deleteShipmentItemDialog.handleCancel}
      >
        {deleteShipmentItemDialog.error ? (
          <p className="seasons-manager__error">{deleteShipmentItemDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      {activeSidebarId === 'all-shipments' ? (
        <AllShipmentsTable
          lang={lang}
          labels={t.tableLabels}
          selectedShipmentId={selectedShipmentRow?.id ?? null}
          onSelectShipment={handleShipmentRowSelect}
          refreshKey={shipmentsRefreshKey}
          onRowCountChange={setTableRowCount}
        />
      ) : activeSidebarId === 'all-boxes' ? (
        <AllBoxesTable
          lang={lang}
          labels={t.boxesTableLabels}
          selectedBoxId={selectedBoxRow?.id ?? null}
          onSelectBox={handleBoxRowSelect}
          refreshKey={boxesRefreshKey}
          onRowCountChange={setTableRowCount}
        />
      ) : isShipmentItemsSummaryActive ? (
        <ShipmentItemsSummary
          lang={lang}
          labels={t.shipmentItemsTableLabels}
          description={content.description}
        />
      ) : activeSidebarId === 'shipment-items' ? (
        <ShipmentItemsTable
          lang={lang}
          labels={t.shipmentItemsTableLabels}
          selectedItemId={selectedItemRow?.id ?? null}
          onSelectItem={handleItemRowSelect}
          refreshKey={itemsRefreshKey}
          onRowCountChange={setTableRowCount}
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
