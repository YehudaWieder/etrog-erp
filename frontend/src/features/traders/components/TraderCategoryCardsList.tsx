import { useState } from 'react';
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
  priorityLabel: string;
  dragHandleLabel: string;
};

type TraderCategoryCardsListProps = {
  categories: CategoryCardItem[];
  selectedCategoryId: number | null;
  onToggleCategory: (id: number) => void;
  onReorder?: (orderedIds: number[]) => void;
  isReorderDisabled?: boolean;
  isSelectionDisabled?: boolean;
  selectionDisabledTitle?: string;
  t: TraderCategoryCardsListText;
};

export function TraderCategoryCardsList({
  categories,
  selectedCategoryId,
  onToggleCategory,
  onReorder,
  isReorderDisabled,
  isSelectionDisabled,
  selectionDisabledTitle,
  t,
}: TraderCategoryCardsListProps): JSX.Element | null {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  if (categories.length === 0) {
    return null;
  }

  const canReorder = Boolean(onReorder) && !isReorderDisabled;

  const handleDrop = (targetId: number) => {
    if (!canReorder || draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentIds = categories.map((category) => category.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reorderedIds = [...currentIds];
    reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, draggedId);

    onReorder?.(reorderedIds);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <ManagementCardsGrid>
      {categories.map((category, index) => {
        const isSelected = selectedCategoryId === category.id;
        const badge = category.name.trim().slice(0, 2).toUpperCase() || '#';

        return (
          <li
            key={category.id}
            draggable={canReorder}
            className={`${canReorder ? styles.draggableCard : ''}${draggedId === category.id ? ` ${styles.draggingCard}` : ''}${dragOverId === category.id && draggedId !== category.id ? ` ${styles.dragOverCard}` : ''}`}
            onDragStart={() => canReorder && setDraggedId(category.id)}
            onDragOver={(event) => {
              if (!canReorder) {
                return;
              }
              event.preventDefault();
              setDragOverId(category.id);
            }}
            onDragLeave={() => setDragOverId((current) => (current === category.id ? null : current))}
            onDrop={(event) => {
              if (!canReorder) {
                return;
              }
              event.preventDefault();
              handleDrop(category.id);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
          >
            <ManagementSelectableCard
              isSelected={isSelected}
              badgeLabel={badge}
              selector={
                <span className={`${styles.miniCardAvatar}${isSelected ? ` ${styles.miniCardAvatarSelected}` : ''}`}>
                  {isSelected ? '✓' : badge}
                </span>
              }
              onToggle={() => onToggleCategory(category.id)}
              disabled={isSelectionDisabled}
              title={isSelectionDisabled ? selectionDisabledTitle : undefined}
              topAside={
                canReorder ? (
                  <span className={styles.dragHandle} title={t.dragHandleLabel} aria-label={t.dragHandleLabel}>
                    ⠿
                  </span>
                ) : undefined
              }
              topContent={
                <span className={styles.miniCardIdentity}>
                  <span className={styles.priorityBadge}>{t.priorityLabel} {index + 1}</span>
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
