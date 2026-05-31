import type { SidebarFilter } from '../messagesPage.types';

export const DEFAULT_SIDEBAR_ITEM_ID = 'all-messages';

export function resolveSidebarFilter(activeSidebarId: string): SidebarFilter {
  if (activeSidebarId === 'incoming-messages' || activeSidebarId === 'outgoing-messages' || activeSidebarId === 'unread-messages') {
    return activeSidebarId;
  }

  return 'all-messages';
}
