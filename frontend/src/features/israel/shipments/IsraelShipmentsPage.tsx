import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../../app/layout/AppShell';
import { SettingsIcon } from '../../../components/ui/SettingsIcon';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ShipmentsPageHeaderActions } from '../../shipments/components/shared/ShipmentsPageHeaderActions';
import { ISRAEL_SHIPMENTS_I18N } from './i18n';
import type { NavItem } from '../../../types/navigation';
import { getCurrentUser, isAuthenticated, isWorkerRole, logout } from '../../../services/authService';
import { NoPermissionBanner } from '../../../components/ui/NoPermissionBanner';
import { getActiveSeason } from '../../../services/seasonsApi';
import { useActiveModule } from '../../../hooks/useActiveModule';
import type { IsraelShipmentRecord } from '../../../services/israel/israelShipmentsApi';
import type { IsraelBoxesTableRow, IsraelShipmentItemsTableRow } from './israelShipments.types';
import { IsraelAllShipmentsSection } from './components/all-shipments/IsraelAllShipmentsSection';
import { IsraelAllBoxesSection } from './components/all-boxes/IsraelAllBoxesSection';
import { IsraelShipmentItemsSection } from './components/all-items/IsraelShipmentItemsSection';
import { IsraelFieldShipmentItemsSummarySection } from './components/field-summary/IsraelFieldShipmentItemsSummarySection';
import { IsraelShipmentItemsSummarySection } from './components/shipment-items-summary/IsraelShipmentItemsSummarySection';
import { NewIsraelShipmentFormModal } from './components/forms/NewIsraelShipmentFormModal';
import { EditIsraelShipmentFormModal } from './components/forms/EditIsraelShipmentFormModal';
import { NewIsraelBoxFormModal } from './components/forms/NewIsraelBoxFormModal';
import { EditIsraelBoxFormModal } from './components/forms/EditIsraelBoxFormModal';
import { PackIsraelShipmentItemsFormModal } from './components/forms/PackIsraelShipmentItemsFormModal';
import { EditIsraelShipmentItemFormModal } from './components/forms/EditIsraelShipmentItemFormModal';
import { useNewIsraelShipmentForm } from './hooks/useNewIsraelShipmentForm';
import { useEditIsraelShipmentForm } from './hooks/useEditIsraelShipmentForm';
import { useDeleteIsraelShipmentDialog } from './hooks/useDeleteIsraelShipmentDialog';
import { useNewIsraelBoxForm } from './hooks/useNewIsraelBoxForm';
import { useEditIsraelBoxForm } from './hooks/useEditIsraelBoxForm';
import { useDeleteIsraelBoxDialog } from './hooks/useDeleteIsraelBoxDialog';
import { useDeleteIsraelBoxesBulkDialog } from './hooks/useDeleteIsraelBoxesBulkDialog';
import { usePackIsraelShipmentItemsForm } from './hooks/usePackIsraelShipmentItemsForm';
import { useEditIsraelShipmentItemForm } from './hooks/useEditIsraelShipmentItemForm';
import { useDeleteIsraelShipmentItemDialog } from './hooks/useDeleteIsraelShipmentItemDialog';

const DEFAULT_SIDEBAR_ITEM_ID = 'all-shipments';

export function IsraelShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('israel-shipments');
  const currentUser = getCurrentUser();
  const isWorker = isWorkerRole(currentUser?.role);
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    import('../../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    getActiveSeason().then((season) => setActiveSeasonYearName(season.yearName)).catch(() => {});
  }, []);

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = ISRAEL_SHIPMENTS_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[2];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const isAllShipmentsTab = activeSidebarId === 'all-shipments';
  const isAllBoxesTab = activeSidebarId === 'all-boxes';
  const isShipmentItemsTab = activeSidebarId === 'shipment-items';
  const isFieldShipmentItemsSummaryTab = activeSidebarId === 'shipment-items-summary-traders';
  const isShipmentItemsSummaryTab = activeSidebarId === 'shipment-items-summary';

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const [selectedShipmentRow, setSelectedShipmentRow] = useState<IsraelShipmentRecord | null>(null);
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [isEditShipmentModalOpen, setIsEditShipmentModalOpen] = useState(false);
  const [shipmentsRefreshKey, setShipmentsRefreshKey] = useState(0);

  const [selectedBoxRows, setSelectedBoxRows] = useState<IsraelBoxesTableRow[]>([]);
  const [isNewBoxModalOpen, setIsNewBoxModalOpen] = useState(false);
  const [isEditBoxModalOpen, setIsEditBoxModalOpen] = useState(false);
  const [boxesRefreshKey, setBoxesRefreshKey] = useState(0);

  const [selectedItemRow, setSelectedItemRow] = useState<IsraelShipmentItemsTableRow | null>(null);
  const [isPackItemsModalOpen, setIsPackItemsModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [packItemsBoxId, setPackItemsBoxId] = useState<number | null>(null);
  const [itemsRefreshKey, setItemsRefreshKey] = useState(0);

  const [tableRowCount, setTableRowCount] = useState<number | null>(null);
  const [activeSeasonYearName, setActiveSeasonYearName] = useState<number | null>(null);

  useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    if (state?.openPacking) {
      setPackItemsBoxId(null);
      setIsPackItemsModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const [currentTabSeasonInfo, setCurrentTabSeasonInfo] = useState<{
    selectedSeasonId: number | null;
    activeSeasonId: number | null;
  }>({ selectedSeasonId: null, activeSeasonId: null });

  useEffect(() => {
    setTableRowCount(null);
    setCurrentTabSeasonInfo({ selectedSeasonId: null, activeSeasonId: null });
  }, [activeSidebarId]);

  useEffect(() => {
    if (!isAllShipmentsTab && selectedShipmentRow !== null) {
      setSelectedShipmentRow(null);
    }
  }, [isAllShipmentsTab, selectedShipmentRow]);

  useEffect(() => {
    if (!isAllBoxesTab && selectedBoxRows.length > 0) {
      setSelectedBoxRows([]);
    }
  }, [isAllBoxesTab, selectedBoxRows]);

  useEffect(() => {
    if (!isShipmentItemsTab && selectedItemRow !== null) {
      setSelectedItemRow(null);
    }
  }, [isShipmentItemsTab, selectedItemRow]);

  const isViewingNonActiveSeason =
    currentTabSeasonInfo.selectedSeasonId !== null &&
    currentTabSeasonInfo.selectedSeasonId !== currentTabSeasonInfo.activeSeasonId;

  const pageTitleWithCount = useMemo(() => {
    if ((isAllShipmentsTab || isAllBoxesTab || isShipmentItemsTab) && tableRowCount !== null) {
      return `${content.title} (${tableRowCount})`;
    }
    return content.title;
  }, [isAllShipmentsTab, isAllBoxesTab, isShipmentItemsTab, tableRowCount, content.title]);

  const handleShipmentsRefresh = () => {
    setShipmentsRefreshKey((k) => k + 1);
  };

  const handleBoxesRefresh = () => {
    setBoxesRefreshKey((k) => k + 1);
  };

  const handleItemsRefresh = () => {
    setItemsRefreshKey((k) => k + 1);
    setBoxesRefreshKey((k) => k + 1);
  };

  const newShipmentForm = useNewIsraelShipmentForm({
    isOpen: isNewShipmentModalOpen,
    seasonId: currentTabSeasonInfo.activeSeasonId,
    t: t.newShipmentModal,
    onSuccess: handleShipmentsRefresh,
    onClose: () => setIsNewShipmentModalOpen(false),
  });

  const editShipmentForm = useEditIsraelShipmentForm({
    isOpen: isEditShipmentModalOpen,
    shipment: isEditShipmentModalOpen ? selectedShipmentRow : null,
    t: t.editShipmentModal,
    onSuccess: handleShipmentsRefresh,
    onClose: () => setIsEditShipmentModalOpen(false),
  });

  const deleteShipmentDialog = useDeleteIsraelShipmentDialog({
    shipment: selectedShipmentRow,
    t: t.deleteShipmentDialog,
    onSuccess: () => {
      setSelectedShipmentRow(null);
      handleShipmentsRefresh();
    },
  });

  const selectedBoxRow = selectedBoxRows.length === 1 ? selectedBoxRows[0] : null;
  const selectedBoxIds = useMemo(() => selectedBoxRows.map((row) => row.id), [selectedBoxRows]);

  const newBoxForm = useNewIsraelBoxForm({
    isOpen: isNewBoxModalOpen,
    seasonId: currentTabSeasonInfo.activeSeasonId,
    t: t.newBoxModal,
    onSuccess: handleBoxesRefresh,
    onClose: () => setIsNewBoxModalOpen(false),
  });

  const editBoxForm = useEditIsraelBoxForm({
    boxRow: isEditBoxModalOpen ? selectedBoxRow : null,
    seasonId: currentTabSeasonInfo.activeSeasonId,
    t: t.editBoxModal,
    onSuccess: handleBoxesRefresh,
    onClose: () => setIsEditBoxModalOpen(false),
  });

  const deleteBoxDialog = useDeleteIsraelBoxDialog({
    box: selectedBoxRow,
    t: t.deleteBoxDialog,
    onSuccess: () => {
      setSelectedBoxRows([]);
      handleBoxesRefresh();
    },
  });

  const deleteBoxesBulkDialog = useDeleteIsraelBoxesBulkDialog({
    boxes: selectedBoxRows,
    t: t.deleteBoxesBulkDialog,
    onSuccess: () => {
      setSelectedBoxRows([]);
      handleBoxesRefresh();
    },
  });

  const packItemsForm = usePackIsraelShipmentItemsForm({
    isOpen: isPackItemsModalOpen,
    seasonId: currentTabSeasonInfo.activeSeasonId,
    initialBoxId: packItemsBoxId,
    t: t.packItemsModal,
    onSuccess: handleItemsRefresh,
    onClose: () => {
      setIsPackItemsModalOpen(false);
      setPackItemsBoxId(null);
    },
  });

  const editItemForm = useEditIsraelShipmentItemForm({
    item: isEditItemModalOpen ? selectedItemRow : null,
    seasonId: currentTabSeasonInfo.activeSeasonId,
    t: t.editShipmentItemModal,
    onSuccess: handleItemsRefresh,
    onClose: () => setIsEditItemModalOpen(false),
  });

  const deleteItemDialog = useDeleteIsraelShipmentItemDialog({
    item: selectedItemRow,
    t: t.deleteShipmentItemDialog,
    onSuccess: () => {
      setSelectedItemRow(null);
      handleItemsRefresh();
    },
  });

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(`/${activeModule}${item.href || `/shipments/${item.id}`}`);
  };

  const handleShipmentRowSelect = (row: IsraelShipmentRecord | null) => {
    if (!row) {
      setSelectedShipmentRow(null);
      return;
    }

    setSelectedShipmentRow((current) => (current?.id === row.id ? null : row));
  };

  const handleBoxRowSelect = (row: IsraelBoxesTableRow | null) => {
    if (!row) {
      setSelectedBoxRows([]);
      return;
    }

    setSelectedBoxRows((current) => (current.length === 1 && current[0].id === row.id ? [] : [row]));
  };

  const handleBoxRowToggleSelection = (row: IsraelBoxesTableRow) => {
    setSelectedBoxRows((current) =>
      current.some((r) => r.id === row.id) ? current.filter((r) => r.id !== row.id) : [...current, row],
    );
  };

  const handlePruneBoxSelection = (validIds: Set<number>) => {
    setSelectedBoxRows((current) => current.filter((row) => validIds.has(row.id)));
  };

  const handleItemRowSelect = (row: IsraelShipmentItemsTableRow | null) => {
    if (!row) {
      setSelectedItemRow(null);
      return;
    }

    setSelectedItemRow((current) => (current?.id === row.id ? null : row));
  };

  const handleOpenPackItems = () => {
    if (!selectedBoxRow) return;
    setPackItemsBoxId(selectedBoxRow.id);
    setIsPackItemsModalOpen(true);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitleWithCount}
      pageHeaderActions={isWorker ? null : isAllShipmentsTab ? (
        <ShipmentsPageHeaderActions
          addActionLabel={t.pageControls.addShipment}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          onAdd={() => setIsNewShipmentModalOpen(true)}
          onEdit={() => setIsEditShipmentModalOpen(true)}
          onDelete={() => deleteShipmentDialog.handleOpen()}
          addDisabled={isViewingNonActiveSeason}
          editDisabled={isViewingNonActiveSeason || selectedShipmentRow === null}
          deleteDisabled={isViewingNonActiveSeason || selectedShipmentRow === null}
          addTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          editTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          deleteTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
        />
      ) : isAllBoxesTab ? (
        <ShipmentsPageHeaderActions
          addActionLabel={t.pageControls.addBox}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          onAdd={() => setIsNewBoxModalOpen(true)}
          onEdit={() => setIsEditBoxModalOpen(true)}
          onDelete={() => (selectedBoxRows.length > 1 ? deleteBoxesBulkDialog.handleOpen() : deleteBoxDialog.handleOpen())}
          addDisabled={isViewingNonActiveSeason}
          editDisabled={isViewingNonActiveSeason || selectedBoxRow === null}
          deleteDisabled={isViewingNonActiveSeason || selectedBoxRows.length === 0}
          addTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          editTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          deleteTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          packAction={{
            label: t.pageControls.packItems,
            onClick: handleOpenPackItems,
            disabled:
              isViewingNonActiveSeason ||
              selectedBoxRow === null ||
              selectedBoxRow?.status === 'SHIPPED' ||
              selectedBoxRow?.status === 'DELIVERED',
          }}
        />
      ) : isShipmentItemsTab ? (
        <ShipmentsPageHeaderActions
          addActionLabel={t.pageControls.packItems}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          onAdd={() => {
            setPackItemsBoxId(null);
            setIsPackItemsModalOpen(true);
          }}
          onEdit={() => setIsEditItemModalOpen(true)}
          onDelete={() => deleteItemDialog.handleOpen()}
          addDisabled={isViewingNonActiveSeason}
          editDisabled={isViewingNonActiveSeason || selectedItemRow === null}
          deleteDisabled={isViewingNonActiveSeason || selectedItemRow === null}
          addTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          editTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          deleteTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
        />
      ) : isShipmentItemsSummaryTab || isFieldShipmentItemsSummaryTab ? (
        <ShipmentsPageHeaderActions
          addActionLabel={t.pageControls.packItems}
          editActionLabel={t.pageControls.edit}
          deleteActionLabel={t.pageControls.delete}
          onAdd={() => {
            setPackItemsBoxId(null);
            setIsPackItemsModalOpen(true);
          }}
          onEdit={() => {}}
          onDelete={() => {}}
          addDisabled={isViewingNonActiveSeason}
          editDisabled
          deleteDisabled
          addTitle={isViewingNonActiveSeason ? t.pageControls.nonActiveSeasonDisabled : undefined}
          showRowActions={false}
          extraActions={[
            {
              label: t.pageControls.addShipment,
              onClick: () => setIsNewShipmentModalOpen(true),
              disabled: isViewingNonActiveSeason,
            },
            {
              label: t.pageControls.addBox,
              onClick: () => setIsNewBoxModalOpen(true),
              disabled: isViewingNonActiveSeason,
            },
          ]}
        />
      ) : null}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate(`/${activeModule}/home`)}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || t.userNameFallback,
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate(`/${activeModule}/settings`)}
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
      <NewIsraelShipmentFormModal
        isOpen={isNewShipmentModalOpen}
        t={t.newShipmentModal}
        fields={newShipmentForm.fields}
        shipmentNumber={newShipmentForm.shipmentNumber}
        onShipmentNumberChange={newShipmentForm.setShipmentNumber}
        fieldId={newShipmentForm.fieldId}
        onFieldIdChange={newShipmentForm.setFieldId}
        notes={newShipmentForm.notes}
        onNotesChange={newShipmentForm.setNotes}
        isSubmitting={newShipmentForm.isSubmitting}
        error={newShipmentForm.error}
        onSave={newShipmentForm.handleSave}
        onClose={newShipmentForm.handleClose}
      />

      <EditIsraelShipmentFormModal
        isOpen={isEditShipmentModalOpen}
        originalShipmentNumber={selectedShipmentRow?.shipmentNumber ?? 0}
        shipmentNumber={editShipmentForm.shipmentNumber}
        onShipmentNumberChange={editShipmentForm.setShipmentNumber}
        t={t.editShipmentModal}
        fields={editShipmentForm.fields}
        fieldId={editShipmentForm.fieldId}
        onFieldIdChange={editShipmentForm.setFieldId}
        isFieldLocked={editShipmentForm.isFieldLocked}
        status={editShipmentForm.status}
        onStatusChange={editShipmentForm.handleStatusChange}
        shippedAt={editShipmentForm.shippedAt}
        onShippedAtChange={editShipmentForm.setShippedAt}
        isShippedAtDisabled={editShipmentForm.status !== 'SHIPPED'}
        activeSeasonYearName={activeSeasonYearName}
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
        isConfirming={deleteShipmentDialog.isDeleting}
      >
        {deleteShipmentDialog.error ? (
          <p className="seasons-manager__error">{deleteShipmentDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      <NewIsraelBoxFormModal
        isOpen={isNewBoxModalOpen}
        t={t.newBoxModal}
        mode={newBoxForm.mode}
        onModeChange={newBoxForm.setMode}
        fields={newBoxForm.fields}
        fieldId={newBoxForm.fieldId}
        onFieldIdChange={newBoxForm.onFieldIdChange}
        isFieldLocked={newBoxForm.isFieldLocked}
        shipments={newBoxForm.shipments}
        isLoadingOptions={newBoxForm.isLoadingOptions}
        selectedShipmentId={newBoxForm.selectedShipmentId}
        onShipmentIdChange={newBoxForm.onShipmentIdChange}
        boxNumber={newBoxForm.boxNumber}
        onBoxNumberChange={newBoxForm.setBoxNumber}
        notes={newBoxForm.notes}
        onNotesChange={newBoxForm.setNotes}
        startNumber={newBoxForm.startNumber}
        onStartNumberChange={newBoxForm.setStartNumber}
        endNumber={newBoxForm.endNumber}
        onEndNumberChange={newBoxForm.setEndNumber}
        isSubmitting={newBoxForm.isSubmitting}
        error={newBoxForm.error}
        onSave={newBoxForm.handleSave}
        onClose={newBoxForm.handleClose}
      />

      <EditIsraelBoxFormModal
        isOpen={isEditBoxModalOpen}
        originalBoxNumber={selectedBoxRow?.boxNumber ?? 0}
        t={t.editBoxModal}
        fields={editBoxForm.fields}
        fieldId={editBoxForm.fieldId}
        onFieldIdChange={editBoxForm.onFieldIdChange}
        isFieldLocked={editBoxForm.isFieldLocked}
        shipments={editBoxForm.shipments}
        isLoadingOptions={editBoxForm.isLoadingOptions}
        selectedShipmentId={editBoxForm.selectedShipmentId}
        onShipmentIdChange={editBoxForm.onShipmentIdChange}
        boxNumber={editBoxForm.boxNumber}
        onBoxNumberChange={editBoxForm.setBoxNumber}
        status={editBoxForm.status}
        onStatusChange={editBoxForm.setStatus}
        notes={editBoxForm.notes}
        onNotesChange={editBoxForm.setNotes}
        isSubmitting={editBoxForm.isSubmitting}
        error={editBoxForm.error}
        onSave={editBoxForm.handleSave}
        onClose={editBoxForm.handleClose}
      />

      <ConfirmDialog
        open={deleteBoxDialog.isOpen}
        title={t.deleteBoxDialog.title(selectedBoxRow?.boxNumber ?? 0)}
        message={t.deleteBoxDialog.message(selectedBoxRow?.boxNumber ?? 0)}
        confirmLabel={t.deleteBoxDialog.confirm}
        cancelLabel={t.deleteBoxDialog.cancel}
        onConfirm={deleteBoxDialog.handleConfirm}
        onCancel={deleteBoxDialog.handleCancel}
        isConfirming={deleteBoxDialog.isDeleting}
      >
        {deleteBoxDialog.error ? (
          <p className="seasons-manager__error">{deleteBoxDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteBoxesBulkDialog.isOpen}
        title={t.deleteBoxesBulkDialog.title(selectedBoxRows.length)}
        message={t.deleteBoxesBulkDialog.message(selectedBoxRows.map((row) => row.boxNumber))}
        confirmLabel={t.deleteBoxesBulkDialog.confirm}
        cancelLabel={t.deleteBoxesBulkDialog.cancel}
        onConfirm={deleteBoxesBulkDialog.handleConfirm}
        onCancel={deleteBoxesBulkDialog.handleCancel}
        isConfirming={deleteBoxesBulkDialog.isDeleting}
      >
        {deleteBoxesBulkDialog.error ? (
          <p className="seasons-manager__error">{deleteBoxesBulkDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      <PackIsraelShipmentItemsFormModal
        isOpen={isPackItemsModalOpen}
        t={t.packItemsModal}
        pitamStatusLabels={t.editShipmentItemModal.pitamStatusLabels}
        boxStatusLabels={t.allBoxesTableLabels.statusLabels}
        boxes={packItemsForm.boxes}
        shipments={packItemsForm.shipments}
        sortCategories={packItemsForm.sortCategories}
        isLoadingOptions={packItemsForm.isLoadingOptions}
        boxId={packItemsForm.boxId}
        onBoxIdChange={packItemsForm.onBoxIdChange}
        selectedBox={packItemsForm.selectedBox}
        onBoxStatusChange={packItemsForm.onBoxStatusChange}
        onBoxShipmentChange={packItemsForm.onBoxShipmentChange}
        boxNotesDraft={packItemsForm.boxNotesDraft}
        onBoxNotesChange={packItemsForm.onBoxNotesChange}
        onBoxNotesBlur={packItemsForm.onBoxNotesBlur}
        rows={packItemsForm.rows}
        onAddRow={packItemsForm.onAddRow}
        onRemoveRow={packItemsForm.onRemoveRow}
        onRowCategoryChange={packItemsForm.onRowCategoryChange}
        onRowNotesChange={packItemsForm.onRowNotesChange}
        onCellQuantityChange={packItemsForm.onCellQuantityChange}
        availableFor={packItemsForm.availableFor}
        existingItemFor={packItemsForm.existingItemFor}
        pendingExistingItemEdits={packItemsForm.pendingExistingItemEdits}
        onStageExistingItemEdit={packItemsForm.onStageExistingItemEdit}
        totalPackedQuantity={packItemsForm.totalPackedQuantity}
        remainingCapacity={packItemsForm.remainingCapacity}
        isBoxOverCapacity={packItemsForm.isBoxOverCapacity}
        boxOverCapacityMessage={packItemsForm.boxOverCapacityMessage}
        isSubmitting={packItemsForm.isSubmitting}
        error={packItemsForm.error}
        onSave={packItemsForm.handleSave}
        onClose={packItemsForm.handleClose}
      />

      <EditIsraelShipmentItemFormModal
        isOpen={isEditItemModalOpen}
        itemId={selectedItemRow?.id ?? 0}
        category={selectedItemRow?.category ?? ''}
        grade={selectedItemRow?.grade ?? ''}
        pitamStatus={selectedItemRow?.pitamStatus ?? 'WITH_PITAM'}
        t={t.editShipmentItemModal}
        quantity={editItemForm.quantity}
        onQuantityChange={editItemForm.setQuantity}
        availableQuantity={editItemForm.availableQuantity}
        notes={editItemForm.notes}
        onNotesChange={editItemForm.setNotes}
        isSubmitting={editItemForm.isSubmitting}
        error={editItemForm.error}
        onSave={editItemForm.handleSave}
        onClose={editItemForm.handleClose}
      />

      <ConfirmDialog
        open={deleteItemDialog.isOpen}
        title={t.deleteShipmentItemDialog.title(selectedItemRow?.id ?? 0)}
        message={t.deleteShipmentItemDialog.message(selectedItemRow?.id ?? 0)}
        confirmLabel={t.deleteShipmentItemDialog.confirm}
        cancelLabel={t.deleteShipmentItemDialog.cancel}
        onConfirm={deleteItemDialog.handleConfirm}
        onCancel={deleteItemDialog.handleCancel}
        isConfirming={deleteItemDialog.isDeleting}
      >
        {deleteItemDialog.error ? (
          <p className="seasons-manager__error">{deleteItemDialog.error}</p>
        ) : null}
      </ConfirmDialog>

      {isWorker ? (
        <NoPermissionBanner message={lang === 'he' ? 'אין לך הרשאת גישה לאזור זה.' : "You don't have permission to access this area."} />
      ) : isAllShipmentsTab ? (
        <IsraelAllShipmentsSection
          lang={lang}
          labels={t.allShipmentsTableLabels}
          selectedShipmentId={selectedShipmentRow?.id ?? null}
          onSelectShipment={handleShipmentRowSelect}
          refreshKey={shipmentsRefreshKey}
          onRowCountChange={setTableRowCount}
          onSeasonInfoChange={setCurrentTabSeasonInfo}
        />
      ) : isAllBoxesTab ? (
        <IsraelAllBoxesSection
          lang={lang}
          labels={t.allBoxesTableLabels}
          selectedBoxIds={selectedBoxIds}
          onSelectBox={handleBoxRowSelect}
          onToggleBoxSelection={handleBoxRowToggleSelection}
          onPruneSelection={handlePruneBoxSelection}
          refreshKey={boxesRefreshKey}
          onRowCountChange={setTableRowCount}
          onSeasonInfoChange={setCurrentTabSeasonInfo}
        />
      ) : isShipmentItemsTab ? (
        <IsraelShipmentItemsSection
          lang={lang}
          labels={t.shipmentItemsTableLabels}
          selectedItemId={selectedItemRow?.id ?? null}
          onSelectItem={handleItemRowSelect}
          refreshKey={itemsRefreshKey}
          onRowCountChange={setTableRowCount}
          onSeasonInfoChange={setCurrentTabSeasonInfo}
        />
      ) : isFieldShipmentItemsSummaryTab ? (
        <IsraelFieldShipmentItemsSummarySection
          lang={lang}
          labels={t.fieldShipmentItemsTableLabels}
          refreshKey={itemsRefreshKey}
          onSeasonInfoChange={setCurrentTabSeasonInfo}
        />
      ) : isShipmentItemsSummaryTab ? (
        <IsraelShipmentItemsSummarySection
          lang={lang}
          labels={t.shipmentItemsSummaryTableLabels}
          refreshKey={shipmentsRefreshKey}
          onSeasonInfoChange={setCurrentTabSeasonInfo}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
