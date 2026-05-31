import { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { NavItem } from '../../../types/navigation';
import type { ProfileI18nLabels } from '../profilePage.types';
import { DEFAULT_PROFILE_ITEM_ID, PROFILE_LIST_VIEW_IDS } from '../utils/profilePage.utils';

type UseProfilePageNavigationStateParams = {
  pathname: string;
  navigate: NavigateFunction;
  t: ProfileI18nLabels;
};

export function useProfilePageNavigationState({
  pathname,
  navigate,
  t,
}: UseProfilePageNavigationStateParams) {
  const activeSidebarId = useMemo(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_PROFILE_ITEM_ID;
  }, [pathname]);

  const isProfilesListView = PROFILE_LIST_VIEW_IDS.has(activeSidebarId);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      if (section.id === activeSidebarId) {
        return section.title;
      }

      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.pageTitle, t.sidebar]);

  const content = useMemo(() => t.emptyState[activeSidebarId] || t.emptyState.default, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/profile/${item.id}`);
  };

  return {
    activeSidebarId,
    isProfilesListView,
    pageTitle,
    content,
    handleTopNavClick,
    handleSidebarClick,
  };
}
