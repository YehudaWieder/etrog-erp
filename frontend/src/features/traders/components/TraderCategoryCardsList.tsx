import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import styles from './styles/TraderCategoriesShared.module.css';

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
              className={styles.miniCard}
              isSelected={isSelected}
              badgeLabel={badge}
              selector={
                <span className={`${styles.miniCardAvatar}${isSelected ? ` ${styles.miniCardAvatarSelected}` : ''}`}>
                  {isSelected ? '✓' : badge}
                </span>
              }
              onToggle={() => onToggleCategory(category.id)}
              topContent={
                <span className={styles.miniCardIdentity}>
                  <span className="seasons-manager__year">{category.name}</span>
                  <span className={styles.topId}>{t.categoryId}: {category.id}</span>
                </span>
              }
              bottomContent={
                <span className={`${styles.miniCardRows} ${styles.rows}`}>
                  {category.notes ? (
                    <span className={styles.detailRow}>
                      <span className={styles.detailRowLabel}>{t.notesLabel}</span>
                      <strong className={styles.detailRowValue}>{category.notes}</strong>
                    </span>
                  ) : null}

                  {category.shares.length > 0 ? (
                    <>
                      <span className={styles.sharesSubtitle}>{t.sharesDetailsTitle}</span>
                      {category.shares.map((share) => (
                        <span key={`${category.id}-${share.traderId}`} className={styles.detailRow}>
                          <span className={`${styles.detailRowLabel} ${styles.shareName}`}>{share.traderName}</span>
                          <strong className={styles.detailRowValue}>{share.percent}%</strong>
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
