import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import type { IsraelFieldsHeaderState } from '../fields/components/IsraelFieldsManagement';
import type { IsraelFieldCategoriesHeaderState } from '../fieldCategories/components/IsraelFieldCategoriesManagement';
import type { IsraelSortCategoriesHeaderState } from '../sortCategories/components/IsraelSortCategoriesManagement';
import type { IsraelHarvestSettingsChildId } from './israelHarvestSettings.i18n';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type IsraelHarvestSettingsActionText = {
  add: string;
  edit: string;
  remove: string;
};

type IsraelHarvestSettingsHeaderActionsProps = {
  childId: IsraelHarvestSettingsChildId;
  actionText: IsraelHarvestSettingsActionText;
  fieldsHeaderState: IsraelFieldsHeaderState | null;
  fieldCategoriesHeaderState: IsraelFieldCategoriesHeaderState | null;
  sortCategoriesHeaderState: IsraelSortCategoriesHeaderState | null;
};

export function IsraelHarvestSettingsHeaderActions({
  childId,
  actionText,
  fieldsHeaderState,
  fieldCategoriesHeaderState,
  sortCategoriesHeaderState,
}: IsraelHarvestSettingsHeaderActionsProps): JSX.Element | undefined {
  if (childId === 'harvestSellersFields' && fieldsHeaderState) {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={fieldsHeaderState.onEdit}
          disabled={fieldsHeaderState.isEditDisabled}
        >
          <FaPenToSquare />
          <span>{actionText.edit}</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={fieldsHeaderState.onDelete}
          disabled={fieldsHeaderState.isDeleteDisabled}
        >
          <FaTrashCan />
          <span>{actionText.remove}</span>
        </button>
      </div>
    );
  }

  if (childId === 'harvestSellerCategories' && fieldCategoriesHeaderState) {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={fieldCategoriesHeaderState.onAdd}
          disabled={fieldCategoriesHeaderState.isAddDisabled}
        >
          <FaCirclePlus />
          <span>{actionText.add}</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={fieldCategoriesHeaderState.onEdit}
          disabled={fieldCategoriesHeaderState.isEditDisabled}
        >
          <FaPenToSquare />
          <span>{actionText.edit}</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={fieldCategoriesHeaderState.onDelete}
          disabled={fieldCategoriesHeaderState.isDeleteDisabled}
        >
          <FaTrashCan />
          <span>{actionText.remove}</span>
        </button>
      </div>
    );
  }

  if (childId === 'harvestSortingCategories' && sortCategoriesHeaderState) {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={sortCategoriesHeaderState.onEdit}
          disabled={sortCategoriesHeaderState.isEditDisabled}
        >
          <FaPenToSquare />
          <span>{actionText.edit}</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={sortCategoriesHeaderState.onDelete}
          disabled={sortCategoriesHeaderState.isDeleteDisabled}
        >
          <FaTrashCan />
          <span>{actionText.remove}</span>
        </button>
      </div>
    );
  }

  return undefined;
}
