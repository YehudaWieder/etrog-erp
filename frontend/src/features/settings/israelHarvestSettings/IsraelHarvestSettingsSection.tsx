import { useLocation } from 'react-router-dom';
import IsraelFieldsManagement, {
  type IsraelFieldsHeaderState,
} from '../../israelFields/components/IsraelFieldsManagement';
import IsraelFieldCategoriesManagement, {
  type IsraelFieldCategoriesHeaderState,
} from '../../israelFieldCategories/components/IsraelFieldCategoriesManagement';
import IsraelSortCategoriesManagement, {
  type IsraelSortCategoriesHeaderState,
} from '../../israelSortCategories/components/IsraelSortCategoriesManagement';
import IsraelCategoryGradesManagement, {
  type IsraelCategoryGradesHeaderState,
} from '../../israelCategoryGrades/components/IsraelCategoryGradesManagement';
import {
  getIsraelHarvestSettingsChildId,
  getIsraelHarvestSettingsTitle,
} from './israelHarvestSettings.i18n';

type IsraelHarvestSettingsSectionProps = {
  lang: 'he' | 'en';
  onFieldsHeaderStateChange?: (state: IsraelFieldsHeaderState | null) => void;
  onFieldCategoriesHeaderStateChange?: (
    state: IsraelFieldCategoriesHeaderState | null,
  ) => void;
  onSortCategoriesHeaderStateChange?: (
    state: IsraelSortCategoriesHeaderState | null,
  ) => void;
  onCategoryGradesHeaderStateChange?: (
    state: IsraelCategoryGradesHeaderState | null,
  ) => void;
};

export function IsraelHarvestSettingsSection({
  lang,
  onFieldsHeaderStateChange,
  onFieldCategoriesHeaderStateChange,
  onSortCategoriesHeaderStateChange,
  onCategoryGradesHeaderStateChange,
}: IsraelHarvestSettingsSectionProps) {
  const location = useLocation();
  const childId = getIsraelHarvestSettingsChildId(location.pathname);
  const title = getIsraelHarvestSettingsTitle(lang, childId);

  if (childId === 'harvestSellersFields') {
    return (
      <IsraelFieldsManagement
        lang={lang}
        onHeaderStateChange={onFieldsHeaderStateChange}
      />
    );
  }

  if (childId === 'harvestSellerCategories') {
    return (
      <IsraelFieldCategoriesManagement
        lang={lang}
        onHeaderStateChange={onFieldCategoriesHeaderStateChange}
      />
    );
  }

  if (childId === 'harvestSortingCategories') {
    return (
      <IsraelSortCategoriesManagement
        lang={lang}
        onHeaderStateChange={onSortCategoriesHeaderStateChange}
      />
    );
  }

  if (childId === 'harvestCategoryGrades') {
    return (
      <IsraelCategoryGradesManagement
        lang={lang}
        onHeaderStateChange={onCategoryGradesHeaderStateChange}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '1rem',
      }}
    >
      <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: '4rem', fontWeight: 'bold' }}>
        {lang === 'he' ? 'בקרוב...' : 'Coming soon...'}
      </span>
    </div>
  );
}
