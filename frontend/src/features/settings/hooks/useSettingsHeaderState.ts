import { useState } from 'react';
import type { CustomersHeaderState } from '../../customers/components/CustomersManagement';
import type { CustomerCategoriesHeaderState } from '../../customers/components/CustomerCategoriesManagement';
import type { FieldsHeaderState } from '../../fields/components/FieldsManagement';
import type { SeasonsHeaderState } from '../../seasons/SeasonsManagement';
import type { CartonsHeaderState } from '../../system-config/components/SystemConfigManagement';
import type { PricingHeaderState } from '../../system-config/components/PricingManagement';
import type { DefaultTraderCategoriesHeaderState } from '../../traders/DefaultTraderCategoriesManagement';
import type { TraderCategoriesHeaderState } from '../../traders/TraderCategoriesManagement';
import type { TradersHeaderState } from '../../traders/TradersManagement';
import type { SettingsChildKey } from '../settingsPage.types';
import { resolveSettingsPageTitle } from '../utils/settingsHeaderCount.util';

type UseSettingsHeaderStateParams = {
  contentTitle: string;
  activeChildId: SettingsChildKey;
};

export function useSettingsHeaderState({ contentTitle, activeChildId }: UseSettingsHeaderStateParams) {
  const [seasonsHeaderState, setSeasonsHeaderState] = useState<SeasonsHeaderState | null>(null);
  const [fieldsHeaderState, setFieldsHeaderState] = useState<FieldsHeaderState | null>(null);
  const [cartonsHeaderState, setCartonsHeaderState] = useState<CartonsHeaderState | null>(null);
  const [pricingHeaderState, setPricingHeaderState] = useState<PricingHeaderState | null>(null);
  const [tradersHeaderState, setTradersHeaderState] = useState<TradersHeaderState | null>(null);
  const [traderCategoriesHeaderState, setTraderCategoriesHeaderState] = useState<TraderCategoriesHeaderState | null>(null);
  const [defaultTraderCategoriesHeaderState, setDefaultTraderCategoriesHeaderState] = useState<DefaultTraderCategoriesHeaderState | null>(null);
  const [customersHeaderState, setCustomersHeaderState] = useState<CustomersHeaderState | null>(null);
  const [customerCategoriesHeaderState, setCustomerCategoriesHeaderState] = useState<CustomerCategoriesHeaderState | null>(null);

  const pageTitle = resolveSettingsPageTitle(contentTitle, activeChildId, {
    seasons: seasonsHeaderState,
    fields: fieldsHeaderState,
    traders: tradersHeaderState,
    traderCategories: traderCategoriesHeaderState,
    defaultTraderCategories: defaultTraderCategoriesHeaderState,
    customers: customersHeaderState,
    customerCategories: customerCategoriesHeaderState,
  });
  // cartonsHeaderState has no count, excluded from title resolution

  return {
    pageTitle,
    seasonsHeaderState,
    setSeasonsHeaderState,
    fieldsHeaderState,
    setFieldsHeaderState,
    cartonsHeaderState,
    setCartonsHeaderState,
    pricingHeaderState,
    setPricingHeaderState,
    tradersHeaderState,
    setTradersHeaderState,
    traderCategoriesHeaderState,
    setTraderCategoriesHeaderState,
    defaultTraderCategoriesHeaderState,
    setDefaultTraderCategoriesHeaderState,
    customersHeaderState,
    setCustomersHeaderState,
    customerCategoriesHeaderState,
    setCustomerCategoriesHeaderState,
  };
}