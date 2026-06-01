import type { Dispatch, SetStateAction } from 'react';
import CustomersManagement, { type CustomersHeaderState } from '../../customers/components/CustomersManagement';
import CustomerCategoriesManagement, { type CustomerCategoriesHeaderState } from '../../customers/components/CustomerCategoriesManagement';
import FieldsManagement, { type FieldsHeaderState } from '../../fields/components/FieldsManagement';
import SeasonsManagement, { type SeasonsHeaderState } from '../../seasons/SeasonsManagement';
import DefaultTraderCategoriesManagement, { type DefaultTraderCategoriesHeaderState } from '../../traders/DefaultTraderCategoriesManagement';
import TraderCategoriesManagement, { type TraderCategoriesHeaderState } from '../../traders/TraderCategoriesManagement';
import TradersManagement, { type TradersHeaderState } from '../../traders/TradersManagement';
import type { SettingsChildKey } from '../settingsPage.types';
import feedbackStyles from '../styles/SettingsWorkspaceFeedback.module.css';

type RenderSettingsActiveChildParams = {
  activeChildId: SettingsChildKey;
  isManager: boolean;
  managerOnlyHint: string;
  setSeasonsHeaderState: Dispatch<SetStateAction<SeasonsHeaderState | null>>;
  setFieldsHeaderState: Dispatch<SetStateAction<FieldsHeaderState | null>>;
  setTradersHeaderState: Dispatch<SetStateAction<TradersHeaderState | null>>;
  setTraderCategoriesHeaderState: Dispatch<SetStateAction<TraderCategoriesHeaderState | null>>;
  setDefaultTraderCategoriesHeaderState: Dispatch<SetStateAction<DefaultTraderCategoriesHeaderState | null>>;
  setCustomersHeaderState: Dispatch<SetStateAction<CustomersHeaderState | null>>;
  setCustomerCategoriesHeaderState: Dispatch<SetStateAction<CustomerCategoriesHeaderState | null>>;
};

export function renderSettingsActiveChild({
  activeChildId,
  isManager,
  managerOnlyHint,
  setSeasonsHeaderState,
  setFieldsHeaderState,
  setTradersHeaderState,
  setTraderCategoriesHeaderState,
  setDefaultTraderCategoriesHeaderState,
  setCustomersHeaderState,
  setCustomerCategoriesHeaderState,
}: RenderSettingsActiveChildParams): JSX.Element | null {
  const childRenderers: Partial<Record<SettingsChildKey, () => JSX.Element | null>> = {
    seasons: () => <SeasonsManagement onHeaderStateChange={setSeasonsHeaderState} />,
    fields: () => <FieldsManagement onHeaderStateChange={setFieldsHeaderState} />,
    traders: () => <TradersManagement onHeaderStateChange={setTradersHeaderState} />,
    traderCategories: () => <TraderCategoriesManagement onHeaderStateChange={setTraderCategoriesHeaderState} />,
    defaultTraderCategories: () => (
      <DefaultTraderCategoriesManagement onHeaderStateChange={setDefaultTraderCategoriesHeaderState} />
    ),
    customers: () => <CustomersManagement onHeaderStateChange={setCustomersHeaderState} />,
    customerCategories: () => <CustomerCategoriesManagement onHeaderStateChange={setCustomerCategoriesHeaderState} />,
  };

  const renderChild = childRenderers[activeChildId];

  if (renderChild) {
    return renderChild();
  }

  return isManager ? null : <p className={feedbackStyles.managerNote}>{managerOnlyHint}</p>;
}