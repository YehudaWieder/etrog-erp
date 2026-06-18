import type { NavItem, SidebarSection } from '../../types/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTriangleExclamation, FaXmark } from 'react-icons/fa6';
import {
  fetchUnreadUrgentInboxMessages,
  fetchInboxMessages,
  fetchUnreadCount,
  markMessageAsRead,
  type Message,
} from '../../services/messagesApi';

import { Sidebar } from '../../components/navigation/Sidebar';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { StickyHeaderBar } from '../../components/StickyHeaderBar';
import type { ProfileMenuProps } from '../../components/navigation/ProfileMenu';
import { directionFromLanguage, getPreferredLanguage } from '../../utils/locale';
import brandLogo from '../../assets/logo.svg';
import styles from './AppShell.module.css';

type TopBarOptions = ProfileMenuProps & {
  alertsCount?: number;
  onAlertsClick?: () => void;
};

type AppShellProps = {
  direction?: 'rtl' | 'ltr';
  brandName?: string;
  logoSrc?: string;
  pageTitle?: string;
  topNav: NavItem[];
  activeTopNavId?: string;
  sidebarSections: SidebarSection[];
  activeSidebarItemId?: string;
  onTopNavClick?: (item: NavItem) => void;
  onSidebarClick?: (item: NavItem) => void;
  onBrandClick?: () => void;
  topBarOptions: TopBarOptions;
  pageHeaderActions?: React.ReactNode;
  sidebarFooterSlot?: React.ReactNode;
  hideSidebar?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  direction,
  brandName = 'Wieders etrogs',
  logoSrc = brandLogo,
  pageTitle,
  topNav,
  activeTopNavId,
  sidebarSections,
  activeSidebarItemId,
  onTopNavClick,
  onSidebarClick,
  onBrandClick,
  topBarOptions,
  pageHeaderActions,
  sidebarFooterSlot,
  hideSidebar = false,
  children,
}: AppShellProps): JSX.Element {
  const navigate = useNavigate();
  const preferredLanguage = getPreferredLanguage('he');
  const resolvedDirection = direction ?? directionFromLanguage(preferredLanguage);
  const topBarLanguage: 'he' | 'en' = preferredLanguage.toLowerCase().startsWith('en') ? 'en' : 'he';
  const [urgentMessages, setUrgentMessages] = useState<Message[]>([]);
  const [activeUrgentMessageId, setActiveUrgentMessageId] = useState<number | null>(null);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number | undefined>(undefined);
  const knownInboxMessageIdsRef = useRef<Set<number>>(new Set());
  const hasHydratedInboxRef = useRef(false);
  const suppressedUrgentIdsRef = useRef<Set<number>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const BrowserAudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!BrowserAudioContext) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new BrowserAudioContext();
    }

    return audioContextRef.current;
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!topBarOptions.isAuthenticated) {
      return;
    }

    const unlockAudioOnFirstInteraction = () => {
      const context = getAudioContext();
      if (!context || context.state === 'running') {
        return;
      }
      void context.resume();
    };

    window.addEventListener('pointerdown', unlockAudioOnFirstInteraction, { passive: true });
    window.addEventListener('keydown', unlockAudioOnFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', unlockAudioOnFirstInteraction);
      window.removeEventListener('keydown', unlockAudioOnFirstInteraction);
    };
  }, [topBarOptions.isAuthenticated]);

  // Keep top bar unread badge in sync with explicit page-level updates
  // (for example, immediately after marking a thread as read).
  useEffect(() => {
    if (typeof topBarOptions.alertsCount === 'number') {
      setLiveUnreadCount(topBarOptions.alertsCount);
    }
  }, [topBarOptions.alertsCount]);

  const activeUrgentMessage = useMemo(() => {
    if (!urgentMessages.length) {
      return null;
    }
    if (activeUrgentMessageId !== null) {
      const found = urgentMessages.find((message) => message.id === activeUrgentMessageId);
      if (found) {
        return found;
      }
    }
    return urgentMessages[0];
  }, [activeUrgentMessageId, urgentMessages]);

  useEffect(() => {
    if (!topBarOptions.isAuthenticated) {
      setUrgentMessages([]);
      setActiveUrgentMessageId(null);
      setLiveUnreadCount(undefined);
      knownInboxMessageIdsRef.current = new Set();
      hasHydratedInboxRef.current = false;
      suppressedUrgentIdsRef.current = new Set();
      return;
    }

    let isMounted = true;
    const pollIntervalMs = 30 * 1000;

    const playNewMessageChime = () => {
      const context = getAudioContext();
      if (!context) {
        return;
      }

      const startTone = () => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1175, context.currentTime + 0.11);

        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.22);
      };

      if (context.state !== 'running') {
        void context.resume().then(() => {
          if (context.state === 'running') {
            startTone();
          }
        }).catch(() => {
          // Ignore playback errors (for example, autoplay policy restrictions).
        });
        return;
      }

      try {
        startTone();
      } catch {
        // Ignore playback errors (for example, autoplay policy restrictions).
      }
    };

    const refreshUrgentMessages = async () => {
      try {
        const [nextUrgentMessages, inboxMessages, unreadCount] = await Promise.all([
          fetchUnreadUrgentInboxMessages(),
          fetchInboxMessages(),
          fetchUnreadCount(),
        ]);
        if (!isMounted) {
          return;
        }
        setLiveUnreadCount(unreadCount.count);
        const latestIds = new Set(nextUrgentMessages.map((message) => message.id));
        suppressedUrgentIdsRef.current.forEach((suppressedId) => {
          if (!latestIds.has(suppressedId)) {
            suppressedUrgentIdsRef.current.delete(suppressedId);
          }
        });

        const sorted = nextUrgentMessages
          .filter((message) => !suppressedUrgentIdsRef.current.has(message.id))
          .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setUrgentMessages(sorted);
        setActiveUrgentMessageId((previousId) => {
          if (previousId === null) {
            return sorted[0]?.id ?? null;
          }
          return sorted.some((message) => message.id === previousId) ? previousId : (sorted[0]?.id ?? null);
        });

        const incomingIds = new Set<number>(inboxMessages.map((message) => message.id));
        if (!hasHydratedInboxRef.current) {
          knownInboxMessageIdsRef.current = incomingIds;
          hasHydratedInboxRef.current = true;
          return;
        }

        const hasNewMessage = inboxMessages.some(
          (message) => !knownInboxMessageIdsRef.current.has(message.id),
        );

        if (hasNewMessage) {
          playNewMessageChime();
        }

        knownInboxMessageIdsRef.current = incomingIds;
      } catch {
        // Keep the current popup state on transient refresh failures.
      }
    };

    void refreshUrgentMessages();

    const intervalId = window.setInterval(() => {
      void refreshUrgentMessages();
    }, pollIntervalMs);

    const handleWindowFocus = () => {
      void refreshUrgentMessages();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [topBarOptions.isAuthenticated]);

  const removeUrgentMessageLocally = (messageId: number) => {
    setUrgentMessages((previous) => {
      const next = previous.filter((message) => message.id !== messageId);
      setActiveUrgentMessageId(next[0]?.id ?? null);
      return next;
    });
  };

  const acknowledgeUrgentMessage = async (message: Message) => {
    suppressedUrgentIdsRef.current.add(message.id);
    removeUrgentMessageLocally(message.id);
    setLiveUnreadCount((previous) => {
      if (typeof previous !== 'number') {
        return previous;
      }
      return Math.max(0, previous - 1);
    });
    try {
      await markMessageAsRead(message.id);
    } catch {
      // Intentionally ignore API failure so the popup can always close.
    }
  };

  const handleUrgentPopupOpenThread = async () => {
    if (!activeUrgentMessage) {
      return;
    }

    await acknowledgeUrgentMessage(activeUrgentMessage);
    navigate('/messages', {
      state: {
        openMessageId: activeUrgentMessage.id,
      },
    });
  };

  const handleUrgentPopupDismiss = async () => {
    if (!activeUrgentMessage) {
      return;
    }
    await acknowledgeUrgentMessage(activeUrgentMessage);
  };

  if (typeof document !== 'undefined') {
    document.documentElement.lang = preferredLanguage;
    document.documentElement.dir = resolvedDirection;
  }

  const handleTopBarNavigate = (item: NavItem) => {
    const targetPath = item.href ?? `/${item.id}`;
    navigate(targetPath);
  };

  return (
    <div className="app-shell" data-direction={resolvedDirection}>
      <AppTopBar
        links={topNav}
        activeId={activeTopNavId}
        onNavigate={handleTopBarNavigate}
        brandName={brandName}
        logoSrc={logoSrc}
        lang={topBarLanguage}
        onBrandClick={onBrandClick}
        alertsCount={typeof liveUnreadCount === 'number' ? liveUnreadCount : topBarOptions.alertsCount}
        onAlertsClick={topBarOptions.onAlertsClick}
        isAuthenticated={topBarOptions.isAuthenticated}
        onLogin={topBarOptions.onLogin}
        onRegister={topBarOptions.onRegister}
        onLogout={topBarOptions.onLogout}
        onProfile={topBarOptions.onProfile}
        userName={topBarOptions.userName}
      />
      <div className="app-shell__body">
        {!hideSidebar && (
          <Sidebar
            sections={sidebarSections}
            activeItemId={activeSidebarItemId}
            onNavigate={onSidebarClick}
            footerSlot={sidebarFooterSlot}
          />
        )}
        <div className="app-shell__main">
          <main className={`app-shell__content${pageTitle ? ' app-shell__content--with-page-header' : ''}`}>
            {pageTitle ? (
              <div className="app-shell__page-header app-shell__page-header--sticky">
                <StickyHeaderBar
                  className="app-shell__page-header-bar"
                  title={pageTitle}
                  actions={pageHeaderActions}
                />
              </div>
            ) : null}
            <div className={`app-shell__content-body${pageTitle ? ' app-shell__content-body--with-page-header' : ''}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
      {topBarOptions.isAuthenticated && activeUrgentMessage ? (
        <div className={styles.urgentMessagePopup} role="dialog" aria-live="assertive" aria-label={topBarLanguage === 'he' ? 'הודעה דחופה' : 'Urgent message'}>
          <button
            type="button"
            className={styles.urgentMessagePopupClose}
            aria-label={topBarLanguage === 'he' ? 'סגירה וסימון כנקראה' : 'Close and mark as read'}
            onClick={() => {
              void handleUrgentPopupDismiss();
            }}
          >
            <FaXmark />
          </button>
          <button
            type="button"
            className={styles.urgentMessagePopupBody}
            onClick={() => {
              void handleUrgentPopupOpenThread();
            }}
          >
            <span className={styles.urgentMessagePopupBadge}>
              <FaTriangleExclamation />
              {topBarLanguage === 'he' ? 'דחופה' : 'Urgent'}
            </span>
            <h3 className={styles.urgentMessagePopupSubject}>{activeUrgentMessage.subject}</h3>
            <p className={styles.urgentMessagePopupMeta}>
              {topBarLanguage === 'he' ? 'מאת' : 'From'}: {activeUrgentMessage.sender.name}
            </p>
            <p className={styles.urgentMessagePopupContent}>{activeUrgentMessage.content}</p>
          </button>
        </div>
      ) : null}
    </div>
  );
}
