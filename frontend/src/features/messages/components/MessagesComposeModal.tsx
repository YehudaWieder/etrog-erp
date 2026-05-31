import { FaChevronDown, FaPaperPlane, FaXmark } from 'react-icons/fa6';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ComposeFormState, RecipientOption } from '../messagesPage.types';
import type { MessagePriority } from '../../../services/messagesApi';

type MessagesComposeModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  closeLabel: string;
  recipientsLabel: string;
  recipientsPlaceholder: string;
  noMatchingRecipientsLabel: string;
  recipientsEmptyLabel: string;
  priorityLabel: string;
  priorities: Record<MessagePriority, string>;
  subjectLabel: string;
  subjectPlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  cancelLabel: string;
  sendLabel: string;
  sendingLabel: string;
  toggleRecipientsLabel: string;
  errorText: string;
  isSubmitting: boolean;
  composeForm: ComposeFormState;
  selectedRecipients: RecipientOption[];
  recipientOptions: RecipientOption[];
  recipientSuggestions: RecipientOption[];
  showRecipientSuggestions: boolean;
  recipientQuery: string;
  onClose: () => void;
  onRecipientQueryChange: (value: string) => void;
  onRecipientInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleRecipientsMenu: () => void;
  onAddRecipient: (recipientId: number) => void;
  onRemoveRecipient: (recipientId: number) => void;
  onPriorityChange: (value: MessagePriority) => void;
  onSubjectChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MessagesComposeModal(props: MessagesComposeModalProps) {
  const {
    isOpen,
    title,
    description,
    closeLabel,
    recipientsLabel,
    recipientsPlaceholder,
    noMatchingRecipientsLabel,
    recipientsEmptyLabel,
    priorityLabel,
    priorities,
    subjectLabel,
    subjectPlaceholder,
    contentLabel,
    contentPlaceholder,
    cancelLabel,
    sendLabel,
    sendingLabel,
    toggleRecipientsLabel,
    errorText,
    isSubmitting,
    composeForm,
    selectedRecipients,
    recipientOptions,
    recipientSuggestions,
    showRecipientSuggestions,
    recipientQuery,
    onClose,
    onRecipientQueryChange,
    onRecipientInputKeyDown,
    onToggleRecipientsMenu,
    onAddRecipient,
    onRemoveRecipient,
    onPriorityChange,
    onSubjectChange,
    onContentChange,
    onSubmit,
  } = props;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay messages-compose-modal-overlay" onClick={onClose}>
      <section className="modal-dialog modal-dialog--form messages-compose-modal" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="messages-compose__header">
          <h2 className="messages-compose__title">{title}</h2>
          <p className="messages-compose__description">{description}</p>
          <button className="messages-compose__close" type="button" aria-label={closeLabel} onClick={onClose}>
            <FaXmark />
          </button>
        </header>

        <form className="messages-compose__form" onSubmit={onSubmit}>
          {errorText ? <p className="messages-compose__error">{errorText}</p> : null}

          <div className="messages-compose__grid">
            <div className="form-group messages-compose__full-width messages-compose__recipients-field">
              <label className="form-label" htmlFor="messageRecipientsInput">{recipientsLabel}</label>
              <div className="messages-compose__recipient-picker">
                {selectedRecipients.map((recipient) => (
                  <button key={recipient.id} type="button" className="messages-compose__chip" onClick={() => onRemoveRecipient(recipient.id)}>
                    <span>{recipient.name}</span>
                    <FaXmark />
                  </button>
                ))}
                <input
                  id="messageRecipientsInput"
                  type="text"
                  className="messages-compose__recipient-input"
                  value={recipientQuery}
                  onChange={(event) => onRecipientQueryChange(event.target.value)}
                  onKeyDown={onRecipientInputKeyDown}
                  placeholder={recipientsPlaceholder}
                />
                <button type="button" className="messages-compose__recipient-toggle" aria-label={toggleRecipientsLabel} onClick={onToggleRecipientsMenu}>
                  <FaChevronDown />
                </button>
              </div>
              {showRecipientSuggestions && recipientSuggestions.length ? (
                <ul className="messages-compose__suggestions" role="listbox" aria-label={recipientsLabel}>
                  {recipientSuggestions.map((recipient) => (
                    <li key={recipient.id}>
                      <button type="button" className="messages-compose__suggestion" onClick={() => onAddRecipient(recipient.id)}>
                        {recipient.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : showRecipientSuggestions ? (
                <p className="form-helper-text">
                  {recipientOptions.length ? noMatchingRecipientsLabel : recipientsEmptyLabel}
                </p>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="messagePriority">{priorityLabel}</label>
              <select
                id="messagePriority"
                className="form-input"
                value={composeForm.priority}
                onChange={(event) => onPriorityChange(event.target.value as MessagePriority)}
              >
                <option value="LOW">{priorities.LOW}</option>
                <option value="NORMAL">{priorities.NORMAL}</option>
                <option value="HIGH">{priorities.HIGH}</option>
                <option value="URGENT">{priorities.URGENT}</option>
              </select>
            </div>

            <div className="form-group messages-compose__full-width">
              <label className="form-label" htmlFor="messageSubject">{subjectLabel}</label>
              <input
                id="messageSubject"
                type="text"
                className="form-input"
                value={composeForm.subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                placeholder={subjectPlaceholder}
              />
            </div>

            <div className="form-group messages-compose__full-width">
              <label className="form-label" htmlFor="messageContent">{contentLabel}</label>
              <textarea
                id="messageContent"
                className="form-input messages-compose__content"
                value={composeForm.content}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={contentPlaceholder}
              />
            </div>
          </div>

          <div className="messages-compose__actions">
            <button type="button" className="btn" onClick={onClose}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting}>
              <FaPaperPlane />
              <span>{isSubmitting ? sendingLabel : sendLabel}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
