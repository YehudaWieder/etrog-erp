import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllProfiles, getCurrentUser, isAuthenticated } from '../../../services/authService';
import { sendMessage, type Message } from '../../../services/messagesApi';
import { MESSAGES_I18N } from '../i18n';
import type { ComposeAction, ComposeFormState } from '../messagesPage.types';
import { prefixSubject } from '../services/messagesThreadHelpers.service';
import { DEFAULT_SIDEBAR_ITEM_ID, resolveSidebarFilter } from '../utils/messagesPage.utils';

export function useMessagesPage() {
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
  const [composeForm, setComposeForm] = useState<ComposeFormState>({
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

  const lang = useMemo<'he' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) {
        return stored;
      }
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

  const normalizedFilter = useMemo(() => resolveSidebarFilter(activeSidebarId), [activeSidebarId]);

  const pageTitle = useMemo(() => {
    const topSection = t.sidebar.find((section) => section.id === 'all-messages');
    const activeItem = topSection?.items.find((item) => item.id === normalizedFilter);
    const label = activeItem?.label || topSection?.title || t.pageTitle;
    const count = counts[normalizedFilter] ?? 0;
    return count > 0 ? `${label} (${count})` : label;
  }, [normalizedFilter, t.pageTitle, t.sidebar, counts]);

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

  const handleTopNavClick = (item: { id: string }) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: { id: string; href?: string }) => {
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

  return {
    navigate,
    lang,
    t,
    currentUser,
    refreshKey,
    counts,
    setCounts,
    lastActionText,
    setLastActionText,
    isComposeOpen,
    setIsComposeOpen,
    isSubmittingCompose,
    composeError,
    recipientQuery,
    setRecipientQuery,
    isRecipientMenuOpen,
    setIsRecipientMenuOpen,
    recipientOptions,
    composeForm,
    setComposeForm,
    activeSidebarId,
    normalizedFilter,
    pageTitle,
    selectedRecipients,
    recipientSuggestions,
    showRecipientSuggestions,
    initialOpenMessageId,
    handleTopNavClick,
    handleSidebarClick,
    resetComposeForm,
    handleAction,
    addRecipient,
    removeRecipient,
    handleRecipientInputKeyDown,
    handleComposeSubmit,
    handleComposeRequest,
  };
}
