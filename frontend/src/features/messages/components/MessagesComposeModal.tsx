import { FaChevronDown, FaPaperPlane, FaXmark } from 'react-icons/fa6';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ComposeFormState, RecipientOption } from '../messagesPage.types';
import type { MessagePriority } from '../../../services/messagesApi';
import styles from './styles/MessagesFeature.module.css';

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
    <div className={`modal-overlay ${styles.composeModalOverlay}`} onClick={onClose}>
      <section className={`modal-dialog modal-dialog--form ${styles.composeModal}`} aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className={styles.composeHeader}>
          <h2 className={styles.composeTitle}>{title}</h2>
          <p className={styles.composeDescription}>{description}</p>
          <button className={styles.composeClose} type="button" aria-label={closeLabel} onClick={onClose}>
            <FaXmark />
          </button>
        </header>

        <form onSubmit={onSubmit}>
          {errorText ? <p className={styles.composeError}>{errorText}</p> : null}

          <div className={styles.composeGrid}>
            <div className={`form-group ${styles.composeFullWidth} ${styles.recipientsField}`}>
              <label className="form-label" htmlFor="messageRecipientsInput">{recipientsLabel}</label>
              <div className={styles.recipientPicker}>
                {selectedRecipients.map((recipient) => (
                  <button key={recipient.id} type="button" className={styles.chip} onClick={() => onRemoveRecipient(recipient.id)}>
                    <span>{recipient.name}</span>
                    <FaXmark />
                  </button>
                ))}
                <input
                  id="messageRecipientsInput"
                  type="text"
                  className={styles.recipientInput}
                  value={recipientQuery}
                  onChange={(event) => onRecipientQueryChange(event.target.value)}
                  onKeyDown={onRecipientInputKeyDown}
                  placeholder={recipientsPlaceholder}
                />
                <button type="button" className={styles.recipientToggle} aria-label={toggleRecipientsLabel} onClick={onToggleRecipientsMenu}>
                  <FaChevronDown />
                </button>
              </div>
              {showRecipientSuggestions && recipientSuggestions.length ? (
                <ul className={styles.suggestions} role="listbox" aria-label={recipientsLabel}>
                  {recipientSuggestions.map((recipient) => (
                    <li key={recipient.id}>
                      <button type="button" className={styles.suggestion} onClick={() => onAddRecipient(recipient.id)}>
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

            <div className={`form-group ${styles.composeFullWidth}`}>
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

            <div className={`form-group ${styles.composeFullWidth}`}>
              <label className="form-label" htmlFor="messageContent">{contentLabel}</label>
              <textarea
                id="messageContent"
                className={`form-input ${styles.composeContent}`}
                value={composeForm.content}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={contentPlaceholder}
              />
            </div>
          </div>

          <div className={styles.composeActions}>
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
