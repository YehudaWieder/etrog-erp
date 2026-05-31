import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';

type CategoryShare = {
  traderId: number;
  traderName: string;
  percent: number;
};

type CategoryCardItem = {
  id: number;
  name: string;
  notes?: string | null;
  shares: CategoryShare[];
};

type TraderCategoryCardsListText = {
  categoryId: string;
  notesLabel: string;
  sharesDetailsTitle: string;
};

type TraderCategoryCardsListProps = {
  categories: CategoryCardItem[];
  selectedCategoryId: number | null;
  onToggleCategory: (id: number) => void;
  t: TraderCategoryCardsListText;
};

export function TraderCategoryCardsList({
  categories,
  selectedCategoryId,
  onToggleCategory,
  t,
}: TraderCategoryCardsListProps): JSX.Element | null {
  if (categories.length === 0) {
    return null;
  }

  return (
    <ManagementCardsGrid>
      {categories.map((category) => {
        const isSelected = selectedCategoryId === category.id;
        const badge = category.name.trim().slice(0, 2).toUpperCase() || '#';

        return (
          <li key={category.id}>
            <ManagementSelectableCard
              isSelected={isSelected}
              badgeLabel={badge}
              selector={
                <span className={`profile-mini-card__avatar${isSelected ? ' is-selected' : ''}`}>
                  {isSelected ? '✓' : badge}
                </span>
              }
              onToggle={() => onToggleCategory(category.id)}
              topContent={
                <span className="profile-mini-card__identity">
                  <span className="seasons-manager__year">{category.name}</span>
                  <span className="default-trader-categories-manager__top-id">{t.categoryId}: {category.id}</span>
                </span>
              }
              bottomContent={
                <span className="profile-mini-card__rows default-trader-categories-manager__rows">
                  {category.notes ? (
                    <span className="profile-detail-row">
                      <span className="profile-detail-row__label">{t.notesLabel}</span>
                      <strong className="profile-detail-row__value">{category.notes}</strong>
                    </span>
                  ) : null}

                  {category.shares.length > 0 ? (
                    <>
                      <span className="default-trader-categories-manager__shares-subtitle">{t.sharesDetailsTitle}</span>
                      {category.shares.map((share) => (
                        <span key={`${category.id}-${share.traderId}`} className="profile-detail-row">
                          <span className="profile-detail-row__label default-trader-categories-manager__share-name">{share.traderName}</span>
                          <strong className="profile-detail-row__value">{share.percent}%</strong>
                        </span>
                      ))}
                    </>
                  ) : null}
                </span>
              }
            />
          </li>
        );
      })}
    </ManagementCardsGrid>
  );
}
