import { FaCheck, FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import type { CustomersHeaderState } from '../../customers/components/CustomersManagement';
import type { CustomerCategoriesHeaderState } from '../../customers/components/CustomerCategoriesManagement';
import type { FieldsHeaderState } from '../../fields/components/FieldsManagement';
import type { SeasonsHeaderState } from '../../seasons/SeasonsManagement';
import type { DefaultTraderCategoriesHeaderState } from '../../traders/DefaultTraderCategoriesManagement';
import type { TraderCategoriesHeaderState } from '../../traders/TraderCategoriesManagement';
import type { TradersHeaderState } from '../../traders/TradersManagement';
import type { SettingsChildKey } from '../settingsPage.types';
import styles from '../../../components/ui/styles/HeaderActionButtons.module.css';

type SettingsActionText = {
  activate: string;
  remove: string;
  edit: string;
  add: string;
};

type SettingsSeasonsHeaderActionsProps = {
  activeChildId: SettingsChildKey;
  saveLabel: string;
  actionText: SettingsActionText;
  onSave: () => void;
  seasonsHeaderState: SeasonsHeaderState | null;
  fieldsHeaderState: FieldsHeaderState | null;
  tradersHeaderState: TradersHeaderState | null;
  traderCategoriesHeaderState: TraderCategoriesHeaderState | null;
  defaultTraderCategoriesHeaderState: DefaultTraderCategoriesHeaderState | null;
  customersHeaderState: CustomersHeaderState | null;
  customerCategoriesHeaderState: CustomerCategoriesHeaderState | null;
};

function renderEditDeleteActions(
  onEdit: () => void,
  isEditDisabled: boolean,
  onDelete: () => void,
  isDeleteDisabled: boolean,
  actionText: SettingsActionText,
) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onEdit}
        disabled={isEditDisabled}
      >
        <FaPenToSquare />
        <span>{actionText.edit}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.danger}`}
        onClick={onDelete}
        disabled={isDeleteDisabled}
      >
        <FaTrashCan />
        <span>{actionText.remove}</span>
      </button>
    </div>
  );
}

function renderAddEditDeleteActions(
  onAdd: () => void,
  isAddDisabled: boolean,
  onEdit: () => void,
  isEditDisabled: boolean,
  onDelete: () => void,
  isDeleteDisabled: boolean,
  actionText: SettingsActionText,
) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAdd}
        disabled={isAddDisabled}
      >
        <FaCirclePlus />
        <span>{actionText.add}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onEdit}
        disabled={isEditDisabled}
      >
        <FaPenToSquare />
        <span>{actionText.edit}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.danger}`}
        onClick={onDelete}
        disabled={isDeleteDisabled}
      >
        <FaTrashCan />
        <span>{actionText.remove}</span>
      </button>
    </div>
  );
}

export function SettingsSeasonsHeaderActions({
  activeChildId,
  saveLabel,
  actionText,
  onSave,
  seasonsHeaderState,
  fieldsHeaderState,
  tradersHeaderState,
  traderCategoriesHeaderState,
  defaultTraderCategoriesHeaderState,
  customersHeaderState,
  customerCategoriesHeaderState,
}: SettingsSeasonsHeaderActionsProps): JSX.Element | undefined {
  if (activeChildId === 'seasons' && seasonsHeaderState) {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={seasonsHeaderState.onActivate}
          disabled={seasonsHeaderState.isActivateDisabled}
        >
          <FaCheck />
          <span>{actionText.activate}</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={seasonsHeaderState.onDelete}
          disabled={seasonsHeaderState.isDeleteDisabled}
        >
          <FaTrashCan />
          <span>{actionText.remove}</span>
        </button>
      </div>
    );
  }

  if (activeChildId === 'fields' && fieldsHeaderState) {
    return renderEditDeleteActions(
      fieldsHeaderState.onEdit,
      fieldsHeaderState.isEditDisabled,
      fieldsHeaderState.onDelete,
      fieldsHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'customers' && customersHeaderState) {
    return renderEditDeleteActions(
      customersHeaderState.onEdit,
      customersHeaderState.isEditDisabled,
      customersHeaderState.onDelete,
      customersHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'customerCategories' && customerCategoriesHeaderState) {
    return renderAddEditDeleteActions(
      customerCategoriesHeaderState.onAdd,
      customerCategoriesHeaderState.isAddDisabled,
      customerCategoriesHeaderState.onEdit,
      customerCategoriesHeaderState.isEditDisabled,
      customerCategoriesHeaderState.onDelete,
      customerCategoriesHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'defaultTraderCategories' && defaultTraderCategoriesHeaderState) {
    return renderAddEditDeleteActions(
      defaultTraderCategoriesHeaderState.onAdd,
      defaultTraderCategoriesHeaderState.isAddDisabled,
      defaultTraderCategoriesHeaderState.onEdit,
      defaultTraderCategoriesHeaderState.isEditDisabled,
      defaultTraderCategoriesHeaderState.onDelete,
      defaultTraderCategoriesHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'traderCategories' && traderCategoriesHeaderState) {
    return renderAddEditDeleteActions(
      traderCategoriesHeaderState.onAdd,
      traderCategoriesHeaderState.isAddDisabled,
      traderCategoriesHeaderState.onEdit,
      traderCategoriesHeaderState.isEditDisabled,
      traderCategoriesHeaderState.onDelete,
      traderCategoriesHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'traders' && tradersHeaderState) {
    return renderEditDeleteActions(
      tradersHeaderState.onEdit,
      tradersHeaderState.isEditDisabled,
      tradersHeaderState.onDelete,
      tradersHeaderState.isDeleteDisabled,
      actionText,
    );
  }

  if (activeChildId === 'language' || activeChildId === 'themeColor') {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={onSave}
        >
          <FaCheck />
          <span>{saveLabel}</span>
        </button>
      </div>
    );
  }

  return undefined;
}