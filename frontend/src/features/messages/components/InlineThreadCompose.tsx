import { FaChevronDown, FaPaperPlane, FaXmark } from 'react-icons/fa6';
import type { KeyboardEvent, RefObject } from 'react';
import type { Message } from '../../../services/messagesApi';
import type { MessagesListLabels, InlineAction } from '../messagesPage.types';

type InlineThreadComposeProps = {
  message: Message;
  lang: 'he' | 'en';
  labels: MessagesListLabels;
  inlineAction: InlineAction;
  inlineReplyContent: string;
  inlineForwardContent: string;
  inlineError: string;
  inlineLoading: boolean;
  recipientQuery: string;
  showRecipientSuggestions: boolean;
  recipientSuggestions: Array<{ id: number; name: string }>;
  selectedForwardRecipients: Array<{ id: number; name: string }>;
  recipientInputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onReplyContentChange: (value: string) => void;
  onForwardContentChange: (value: string) => void;
  onRecipientQueryChange: (value: string) => void;
  onRecipientKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleRecipientsMenu: () => void;
  onAddRecipient: (recipientId: number) => void;
  onRemoveRecipient: (recipientId: number) => void;
  onSendReply: (message: Message) => void;
  onSendForward: (message: Message) => void;
  hasAnyRecipients: boolean;
};

export function InlineThreadCompose(props: InlineThreadComposeProps) {
  const {
    message,
    lang,
    labels,
    inlineAction,
    inlineReplyContent,
    inlineForwardContent,
    inlineError,
    inlineLoading,
    recipientQuery,
    showRecipientSuggestions,
    recipientSuggestions,
    selectedForwardRecipients,
    recipientInputRef,
    onClose,
    onReplyContentChange,
    onForwardContentChange,
    onRecipientQueryChange,
    onRecipientKeyDown,
    onToggleRecipientsMenu,
    onAddRecipient,
    onRemoveRecipient,
    onSendReply,
    onSendForward,
    hasAnyRecipients,
  } = props;

  return (
    <div className="messages-inline-compose" style={{ marginTop: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px #0001', padding: 16 }}>
      <button
        type="button"
        className="messages-inline-compose__close"
        style={{ float: lang === 'he' ? 'left' : 'right', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={onClose}
        aria-label={labels.compose.close}
      >
        <FaXmark />
      </button>

      {inlineAction.type === 'reply' || inlineAction.type === 'reply-all' ? (
        <>
          <textarea
            id={`inline-reply-input-${message.id}`}
            className="form-input"
            style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            value={inlineReplyContent}
            onChange={(event) => onReplyContentChange(event.target.value)}
            placeholder={labels.compose.replyPlaceholder}
            disabled={inlineLoading}
          />
          {inlineError ? <div className="messages-compose__error">{inlineError}</div> : null}
          <button
            type="button"
            className="btn btn-success"
            style={{ marginTop: 4, width: '100%' }}
            onClick={() => onSendReply(message)}
            disabled={inlineLoading}
          >
            <FaPaperPlane /> {inlineLoading ? labels.compose.sending : inlineAction.type === 'reply-all' ? labels.compose.sendReplyAll : labels.compose.sendReply}
          </button>
        </>
      ) : (
        <>
          <div className="messages-compose__recipients-field" style={{ marginBottom: 8 }}>
            <div className="messages-compose__recipient-picker">
              {selectedForwardRecipients.map((recipient) => (
                <button key={recipient.id} type="button" className="messages-compose__chip" onClick={() => onRemoveRecipient(recipient.id)}>
                  <span>{recipient.name}</span>
                  <FaXmark />
                </button>
              ))}
              <input
                ref={recipientInputRef}
                type="text"
                className="messages-compose__recipient-input"
                value={recipientQuery}
                onChange={(event) => onRecipientQueryChange(event.target.value)}
                onKeyDown={onRecipientKeyDown}
                placeholder={labels.compose.forwardRecipientPlaceholder}
                disabled={inlineLoading}
              />
              <button
                type="button"
                className="messages-compose__recipient-toggle"
                aria-label={labels.compose.forwardRecipients}
                onClick={onToggleRecipientsMenu}
                disabled={inlineLoading}
              >
                <FaChevronDown />
              </button>
            </div>
            {showRecipientSuggestions && recipientSuggestions.length ? (
              <ul className="messages-compose__suggestions" role="listbox" aria-label={labels.compose.forwardRecipients}>
                {recipientSuggestions.map((recipient) => (
                  <li key={recipient.id}>
                    <button type="button" className="messages-compose__suggestion" onClick={() => onAddRecipient(recipient.id)} disabled={inlineLoading}>
                      {recipient.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : showRecipientSuggestions ? (
              <p className="form-helper-text">
                {hasAnyRecipients ? labels.compose.noMatchingRecipients : labels.compose.noRecipientsAvailable}
              </p>
            ) : null}
          </div>
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            value={inlineForwardContent}
            onChange={(event) => onForwardContentChange(event.target.value)}
            placeholder={labels.compose.forwardPlaceholder}
            disabled={inlineLoading}
          />
          {inlineError ? <div className="messages-compose__error">{inlineError}</div> : null}
          <button
            type="button"
            className="btn btn-success"
            style={{ marginTop: 4, width: '100%' }}
            onClick={() => onSendForward(message)}
            disabled={inlineLoading}
          >
            <FaPaperPlane /> {inlineLoading ? labels.compose.sending : labels.compose.sendForward}
          </button>
        </>
      )}
    </div>
  );
}
