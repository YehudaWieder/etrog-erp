import { useEffect } from 'react';
import { getCustomerCategoriesBySeason, type CustomerCategory } from '../../../../services/customerCategoriesApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';

type UseHarvestFormCategoriesParams = {
  isOpen: boolean;
  seasonFilterId: number | null;
  setHarvestFormTraderCategories: (value: TraderCategoryWithShares[]) => void;
  setHarvestFormCustomerCategories: (value: CustomerCategory[]) => void;
};

export function useHarvestFormCategories({
  isOpen,
  seasonFilterId,
  setHarvestFormTraderCategories,
  setHarvestFormCustomerCategories,
}: UseHarvestFormCategoriesParams): void {
  useEffect(() => {
    if (!isOpen || !seasonFilterId) {
      return;
    }

    let isMounted = true;

    const loadHarvestFormCategories = async () => {
      try {
        const [traderCategories, customerCategories] = await Promise.all([
          getTraderCategoriesWithShares(seasonFilterId),
          getCustomerCategoriesBySeason(seasonFilterId),
        ]);

        if (!isMounted) {
          return;
        }

        setHarvestFormTraderCategories(traderCategories);
        setHarvestFormCustomerCategories(customerCategories);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestFormTraderCategories([]);
        setHarvestFormCustomerCategories([]);
      }
    };

    void loadHarvestFormCategories();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    seasonFilterId,
    setHarvestFormCustomerCategories,
    setHarvestFormTraderCategories,
  ]);
}

