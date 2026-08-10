import { ApiError, apiClient } from './apiClient';

export type TraderCategoryShare = {
  traderId: number;
  traderName: string;
  percent: number;
};

export type GradeGroup = {
  name: string;
  grades: string[];
};

export type TraderCategoryWithShares = {
  id: number;
  seasonId: number;
  name: string;
  notes?: string | null;
  supportedGrades: string[];
  gradeGroups: GradeGroup[];
  orderIndex: number;
  shares: TraderCategoryShare[];
  totalPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateTraderCategoryWithSharesPayload = {
  seasonId: number;
  name: string;
  notes?: string;
  supportedGrades?: string[];
  gradeGroups?: GradeGroup[];
  shares: Array<{
    traderId: number;
    percent: number;
  }>;
};

export type UpdateTraderCategoryWithSharesPayload = {
  id: number;
  name?: string;
  notes?: string;
  supportedGrades?: string[];
  gradeGroups?: GradeGroup[];
  shares: Array<{
    traderId: number;
    percent: number;
  }>;
};

type LegacyTraderCategory = {
  id: number;
  seasonId: number;
  name: string;
  notes?: string | null;
  supportedGrades?: string[];
  gradeGroups?: GradeGroup[];
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyTraderCategoryShare = {
  traderCategoryId: number;
  traderId: number;
  percent: number | string;
  trader?: {
    name: string;
  };
  traderName?: string;
};

function mapLegacyToWithShares(
  categories: LegacyTraderCategory[],
  shares: LegacyTraderCategoryShare[],
): TraderCategoryWithShares[] {
  const sharesByCategoryId = new Map<number, TraderCategoryShare[]>();

  for (const share of shares) {
    const normalizedShare: TraderCategoryShare = {
      traderId: Number(share.traderId),
      traderName: share.trader?.name ?? share.traderName ?? `#${share.traderId}`,
      percent: Number(share.percent),
    };

    const existing = sharesByCategoryId.get(share.traderCategoryId) ?? [];
    existing.push(normalizedShare);
    sharesByCategoryId.set(share.traderCategoryId, existing);
  }

  return categories.map((category, index) => {
    const categoryShares = (sharesByCategoryId.get(category.id) ?? []).sort(
      (a, b) => a.traderName.localeCompare(b.traderName, 'he'),
    );

    const totalPercent = categoryShares.reduce((sum, share) => sum + Number(share.percent), 0);

    return {
      id: category.id,
      seasonId: category.seasonId,
      name: category.name,
      notes: category.notes,
      supportedGrades: category.supportedGrades ?? [],
      gradeGroups: category.gradeGroups ?? [],
      orderIndex: category.orderIndex ?? index,
      shares: categoryShares,
      totalPercent: Number(totalPercent.toFixed(2)),
      createdAt: category.createdAt ?? '',
      updatedAt: category.updatedAt ?? '',
    };
  });
}

export async function getTraderCategoriesWithShares(seasonId: number): Promise<TraderCategoryWithShares[]> {
  try {
    return await apiClient<TraderCategoryWithShares[]>(`/traders-categories/with-shares?seasonId=${seasonId}`);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 400 && error.status !== 404)) {
      throw error;
    }

    const [categories, shares] = await Promise.all([
      apiClient<LegacyTraderCategory[]>(`/traders-categories?seasonId=${seasonId}`),
      apiClient<LegacyTraderCategoryShare[]>(`/trader-shares?seasonId=${seasonId}`),
    ]);

    return mapLegacyToWithShares(categories, shares);
  }
}

export async function createTraderCategoryWithShares(
  payload: CreateTraderCategoryWithSharesPayload,
): Promise<TraderCategoryWithShares> {
  return apiClient<TraderCategoryWithShares>('/traders-categories/with-shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTraderCategoryWithShares(
  payload: UpdateTraderCategoryWithSharesPayload,
): Promise<TraderCategoryWithShares> {
  return apiClient<TraderCategoryWithShares>('/traders-categories/with-shares', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTraderCategory(categoryId: number): Promise<{ id: number }> {
  return apiClient<{ id: number }>(`/traders-categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function reorderTraderCategories(
  seasonId: number,
  orderedIds: number[],
): Promise<{ orderedIds: number[] }> {
  return apiClient<{ orderedIds: number[] }>('/traders-categories/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ seasonId, orderedIds }),
  });
}
