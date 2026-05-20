import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { FaPaperPlane, FaXmark, FaChevronDown } from 'react-icons/fa6';
import { MessagesList, type ComposeAction } from './MessagesList';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import type { NavItem } from '../../types/navigation';
import { getAllProfiles, getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { MESSAGES_I18N } from './i18n';
import { sendMessage, type Message, type MessagePriority } from '../../services/messagesApi';

const DEFAULT_SIDEBAR_ITEM_ID = 'all-messages';
type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

export function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState({
    'all-messages': 0,
    'incoming-messages': 0,
    'outgoing-messages': 0,
    'unread-messages': 0,
  });
  const [lastActionText, setLastActionText] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSubmittingCompose, setIsSubmittingCompose] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [composeForm, setComposeForm] = useState<{
    recipientIds: number[];
    priority: MessagePriority;
    subject: string;
    content: string;
    replyToMessageId?: number;
  }>({
    recipientIds: [],
    priority: 'NORMAL',
    subject: '',
    content: '',
  });
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);

  const t = MESSAGES_I18N[lang];

  useEffect(() => {
    if (!currentUser?.id) {
      setRecipientOptions([]);
      return;
    }

    getAllProfiles()
      .then((profiles) => {
        const options = profiles
          .filter((profile) => profile.id !== currentUser.id)
          .map((profile) => ({ id: profile.id, name: profile.name }));
        setRecipientOptions(options);
      })
      .catch(() => {
        setRecipientOptions([]);
      });
  }, [currentUser?.id]);

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const initialOpenMessageId = useMemo(() => {
    const state = location.state as { openMessageId?: number } | null;
    return typeof state?.openMessageId === 'number' ? state.openMessageId : undefined;
  }, [location.state]);

  const normalizedFilter = useMemo<SidebarFilter>(() => {
    if (activeSidebarId === 'incoming-messages' || activeSidebarId === 'outgoing-messages' || activeSidebarId === 'unread-messages') {
      return activeSidebarId;
    }
    return 'all-messages';
  }, [activeSidebarId]);

  const pageTitle = useMemo(() => {
    const topSection = t.sidebar.find((s) => s.id === 'all-messages');
    const activeItem = topSection?.items.find((item) => item.id === normalizedFilter);
    const label = activeItem?.label || topSection?.title || t.pageTitle;
    const count = counts[normalizedFilter] ?? 0;
    return count > 0 ? `${label} (${count})` : label;
  }, [normalizedFilter, t.pageTitle, t.sidebar, counts]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] || t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const selectedRecipients = useMemo(() => {
    const selectedSet = new Set(composeForm.recipientIds);
    return recipientOptions.filter((recipient) => selectedSet.has(recipient.id));
  }, [composeForm.recipientIds, recipientOptions]);

  const recipientSuggestions = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    const selectedSet = new Set(composeForm.recipientIds);

    return recipientOptions
      .filter((recipient) => !selectedSet.has(recipient.id))
      .filter((recipient) => (query ? recipient.name.toLowerCase().includes(query) : true))
      .slice(0, 8);
  }, [composeForm.recipientIds, recipientOptions, recipientQuery]);

  const showRecipientSuggestions = useMemo(() => {
    const query = recipientQuery.trim();
    return query.length > 0 || isRecipientMenuOpen;
  }, [recipientQuery, isRecipientMenuOpen]);

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/messages/${item.id}`);
  };

  const resetComposeForm = () => {
    setComposeForm({
      recipientIds: [],
      priority: 'NORMAL',
      subject: '',
      content: '',
      replyToMessageId: undefined,
    });
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
    setComposeError('');
  };

  const handleAction = () => {
    setIsComposeOpen((prev) => {
      const next = !prev;
      if (!next) {
        resetComposeForm();
      }
      return next;
    });
  };

  const addRecipient = (recipientId: number) => {
    setComposeForm((prev) => {
      if (prev.recipientIds.includes(recipientId)) {
        return prev;
      }
      return { ...prev, recipientIds: [...prev.recipientIds, recipientId] };
    });
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
  };

  const removeRecipient = (recipientId: number) => {
    setComposeForm((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.filter((id) => id !== recipientId),
    }));
  };

  const handleRecipientInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (recipientSuggestions.length) {
        addRecipient(recipientSuggestions[0].id);
      }
    }

    if (event.key === 'Backspace' && !recipientQuery && composeForm.recipientIds.length) {
      removeRecipient(composeForm.recipientIds[composeForm.recipientIds.length - 1]);
    }
  };

  const handleComposeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!composeForm.recipientIds.length) {
      setComposeError(t.compose.validationRecipients);
      return;
    }
    if (!composeForm.subject.trim()) {
      setComposeError(t.compose.validationSubject);
      return;
    }
    if (!composeForm.content.trim()) {
      setComposeError(t.compose.validationContent);
      return;
    }

    try {
      setIsSubmittingCompose(true);
      setComposeError('');
      await sendMessage({
        recipientIds: composeForm.recipientIds,
        priority: composeForm.priority,
        subject: composeForm.subject.trim(),
        content: composeForm.content.trim(),
        replyToMessageId: composeForm.replyToMessageId,
      });

      setLastActionText(t.compose.success);
      setIsComposeOpen(false);
      resetComposeForm();
      setRefreshKey((prev) => prev + 1);
    } catch {
      setComposeError(t.compose.failed);
    } finally {
      setIsSubmittingCompose(false);
    }
  };

  const prefixSubject = (subject: string, prefix: string) => {
    const trimmed = subject.trim();
    if (!trimmed) {
      return prefix;
    }
    return trimmed.toLowerCase().startsWith(prefix.toLowerCase()) ? trimmed : `${prefix}${trimmed}`;
  };

  const handleComposeRequest = (action: ComposeAction, message: Message) => {
    const replyPrefix = 'Re: ';
    const forwardPrefix = 'Fwd: ';

    if (action === 'reply') {
      const recipientIds = currentUser?.id && message.senderId === currentUser.id
        ? message.recipientIds.filter((id) => id !== currentUser.id)
        : [message.senderId];

      setComposeForm({
        recipientIds,
        priority: message.priority === 'LOW' || message.priority === 'NORMAL' || message.priority === 'HIGH' || message.priority === 'URGENT'
          ? message.priority
          : 'NORMAL',
        subject: prefixSubject(message.subject, replyPrefix),
        content: '',
        replyToMessageId: message.id,
      });
      setRecipientQuery('');
      setIsRecipientMenuOpen(false);
      setComposeError('');
      setIsComposeOpen(true);
      return;
    }

    const quotedHeader =
      lang === 'he'
        ? `\n\n--- הודעה מקורית ---\nמאת: ${message.sender.name}\nבתאריך: ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}`
        : `\n\n--- Original message ---\nFrom: ${message.sender.name}\nDate: ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}`;

    setComposeForm({
      recipientIds: [],
      priority: message.priority === 'LOW' || message.priority === 'NORMAL' || message.priority === 'HIGH' || message.priority === 'URGENT'
        ? message.priority
        : 'NORMAL',
      subject: prefixSubject(message.subject, forwardPrefix),
      content: quotedHeader,
      replyToMessageId: undefined,
    });
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
    setComposeError('');
    setIsComposeOpen(true);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      pageHeaderActions={
        <div className="action-buttons">
          <button className="btn btn-primary" type="button" onClick={handleAction}>
            <FaPaperPlane />
            <span>{t.actions.sendNew}</span>
          </button>
        </div>
      }
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount: counts['unread-messages'],
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || (lang === 'he' ? 'הפרופיל שלי' : 'My Profile'),
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
        >
          {lang === 'he' ? (
            <>
              {t.settings}
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              {t.settings}
            </>
          )}
        </button>
      }
    >
      {isComposeOpen ? (
        <div className="modal-overlay messages-compose-modal-overlay" onClick={() => {
          setIsComposeOpen(false);
          resetComposeForm();
        }}>
          <section className="modal-dialog messages-compose-modal" aria-label={t.compose.title} onClick={(event) => event.stopPropagation()}>
            <header className="messages-compose__header">
              <h2 className="messages-compose__title">{t.compose.title}</h2>
              <p className="messages-compose__description">{t.compose.description}</p>
              <button
                className="messages-compose__close"
                type="button"
                aria-label={t.compose.close}
                onClick={() => {
                  setIsComposeOpen(false);
                  resetComposeForm();
                }}
              >
                <FaXmark />
              </button>
            </header>

            <form className="messages-compose__form" onSubmit={handleComposeSubmit}>
              {composeError ? <p className="messages-compose__error">{composeError}</p> : null}

              <div className="messages-compose__grid">
                <div className="form-group messages-compose__full-width messages-compose__recipients-field">
                  <label className="form-label" htmlFor="messageRecipientsInput">{t.compose.recipients}</label>
                  <div className="messages-compose__recipient-picker">
                    {selectedRecipients.map((recipient) => (
                      <button
                        key={recipient.id}
                        type="button"
                        className="messages-compose__chip"
                        onClick={() => removeRecipient(recipient.id)}
                      >
                        <span>{recipient.name}</span>
                        <FaXmark />
                      </button>
                    ))}
                    <input
                      id="messageRecipientsInput"
                      type="text"
                      className="messages-compose__recipient-input"
                      value={recipientQuery}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setRecipientQuery(nextValue);
                        if (nextValue.trim().length > 0) {
                          setIsRecipientMenuOpen(true);
                        } else {
                          setIsRecipientMenuOpen(false);
                        }
                      }}
                      onKeyDown={handleRecipientInputKeyDown}
                      placeholder={t.compose.recipientsPlaceholder}
                    />
                    <button
                      type="button"
                      className="messages-compose__recipient-toggle"
                      aria-label={t.compose.toggleRecipients}
                      onClick={() => {
                        setIsRecipientMenuOpen((prev) => !prev);
                        if (recipientQuery.trim().length > 0) {
                          setRecipientQuery('');
                        }
                      }}
                    >
                      <FaChevronDown />
                    </button>
                  </div>
                  {showRecipientSuggestions && recipientSuggestions.length ? (
                    <ul className="messages-compose__suggestions" role="listbox" aria-label={t.compose.recipients}>
                      {recipientSuggestions.map((recipient) => (
                        <li key={recipient.id}>
                          <button
                            type="button"
                            className="messages-compose__suggestion"
                            onClick={() => addRecipient(recipient.id)}
                          >
                            {recipient.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : showRecipientSuggestions ? (
                    <p className="form-helper-text">
                      {recipientOptions.length ? t.compose.noMatchingRecipients : t.compose.recipientsEmpty}
                    </p>
                  ) : null}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="messagePriority">{t.compose.priority}</label>
                  <select
                    id="messagePriority"
                    className="form-input"
                    value={composeForm.priority}
                    onChange={(event) =>
                      setComposeForm((prev) => ({ ...prev, priority: event.target.value as MessagePriority }))
                    }
                  >
                    <option value="LOW">{t.compose.priorities.LOW}</option>
                    <option value="NORMAL">{t.compose.priorities.NORMAL}</option>
                    <option value="HIGH">{t.compose.priorities.HIGH}</option>
                    <option value="URGENT">{t.compose.priorities.URGENT}</option>
                  </select>
                </div>

                <div className="form-group messages-compose__full-width">
                  <label className="form-label" htmlFor="messageSubject">{t.compose.subject}</label>
                  <input
                    id="messageSubject"
                    type="text"
                    className="form-input"
                    value={composeForm.subject}
                    onChange={(event) => setComposeForm((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder={t.compose.subjectPlaceholder}
                  />
                </div>

                <div className="form-group messages-compose__full-width">
                  <label className="form-label" htmlFor="messageContent">{t.compose.content}</label>
                  <textarea
                    id="messageContent"
                    className="form-input messages-compose__content"
                    value={composeForm.content}
                    onChange={(event) => setComposeForm((prev) => ({ ...prev, content: event.target.value }))}
                    placeholder={t.compose.contentPlaceholder}
                  />
                </div>
              </div>

              <div className="messages-compose__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsComposeOpen(false);
                    resetComposeForm();
                  }}
                >
                  {t.compose.cancel}
                </button>
                <button type="submit" className="btn btn-success" disabled={isSubmittingCompose}>
                  <FaPaperPlane />
                  <span>{isSubmittingCompose ? t.compose.sending : t.compose.send}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <MessagesList
        filter={normalizedFilter}
        lang={lang}
        userId={currentUser?.id}
        initialOpenMessageId={initialOpenMessageId}
        refreshKey={refreshKey}
        onCountsChange={setCounts}
        onActionFeedback={setLastActionText}
        onComposeRequest={handleComposeRequest}
      />
      {lastActionText ? <p className="shipments-last-action">{lastActionText}</p> : null}
    </AppShell>
  );
}
