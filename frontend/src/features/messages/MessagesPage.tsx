import { FaPaperPlane } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { isAuthenticated, logout } from '../../services/authService';
import { MessagesComposeModal } from './components/MessagesComposeModal';
import { MessagesList } from './components/MessagesList';
import { useMessagesPage } from './hooks/useMessagesPage';

export function MessagesPage() {
  const {
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
  } = useMessagesPage();

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
      <MessagesComposeModal
        isOpen={isComposeOpen}
        title={t.compose.title}
        description={t.compose.description}
        closeLabel={t.compose.close}
        recipientsLabel={t.compose.recipients}
        recipientsPlaceholder={t.compose.recipientsPlaceholder}
        noMatchingRecipientsLabel={t.compose.noMatchingRecipients}
        recipientsEmptyLabel={t.compose.recipientsEmpty}
        priorityLabel={t.compose.priority}
        priorities={t.compose.priorities}
        subjectLabel={t.compose.subject}
        subjectPlaceholder={t.compose.subjectPlaceholder}
        contentLabel={t.compose.content}
        contentPlaceholder={t.compose.contentPlaceholder}
        cancelLabel={t.compose.cancel}
        sendLabel={t.compose.send}
        sendingLabel={t.compose.sending}
        toggleRecipientsLabel={t.compose.toggleRecipients}
        errorText={composeError}
        isSubmitting={isSubmittingCompose}
        composeForm={composeForm}
        selectedRecipients={selectedRecipients}
        recipientOptions={recipientOptions}
        recipientSuggestions={recipientSuggestions}
        showRecipientSuggestions={showRecipientSuggestions}
        recipientQuery={recipientQuery}
        onClose={() => {
          setIsComposeOpen(false);
          resetComposeForm();
        }}
        onRecipientQueryChange={(value) => {
          setRecipientQuery(value);
          if (value.trim().length > 0) {
            setIsRecipientMenuOpen(true);
          } else {
            setIsRecipientMenuOpen(false);
          }
        }}
        onRecipientInputKeyDown={handleRecipientInputKeyDown}
        onToggleRecipientsMenu={() => {
          setIsRecipientMenuOpen((prev) => !prev);
          if (recipientQuery.trim().length > 0) {
            setRecipientQuery('');
          }
        }}
        onAddRecipient={addRecipient}
        onRemoveRecipient={removeRecipient}
        onPriorityChange={(value) => setComposeForm((prev) => ({ ...prev, priority: value }))}
        onSubjectChange={(value) => setComposeForm((prev) => ({ ...prev, subject: value }))}
        onContentChange={(value) => setComposeForm((prev) => ({ ...prev, content: value }))}
        onSubmit={handleComposeSubmit}
      />

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
