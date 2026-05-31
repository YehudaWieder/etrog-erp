import type { MessagePriority } from '../../../services/messagesApi';
import type { MessagesListLabels } from '../messagesPage.types';

export function createMessagesListLabels(lang: 'he' | 'en'): MessagesListLabels {
  return {
    loading: lang === 'he' ? 'טוען הודעות...' : 'Loading messages...',
    error: lang === 'he' ? 'שגיאה:' : 'Error:',
    empty: lang === 'he' ? 'אין הודעות להצגה' : 'No messages to display',
    openThread: lang === 'he' ? 'בחר שרשור כדי לצפות בהודעות' : 'Select a thread to view messages',
    threadMessages: lang === 'he' ? 'הודעות בשרשור' : 'Messages in thread',
    threadViewLabel: lang === 'he' ? 'תצוגת שרשור' : 'Thread view',
    threadCount: lang === 'he' ? 'הודעות בשרשור' : 'messages in thread',
    threadMeta: {
      originalMessage: lang === 'he' ? 'הודעה מקורית' : 'Original message',
      from: lang === 'he' ? 'מאת' : 'From',
      date: lang === 'he' ? 'בתאריך' : 'Date',
      to: lang === 'he' ? 'אל' : 'To',
      toFallback: lang === 'he' ? 'אל: -' : 'To: -',
    },
    priority: {
      LOW: lang === 'he' ? 'נמוכה' : 'Low',
      NORMAL: lang === 'he' ? 'רגילה' : 'Normal',
      HIGH: lang === 'he' ? 'גבוהה' : 'High',
      URGENT: lang === 'he' ? 'דחופה' : 'Urgent',
    } as Record<MessagePriority, string>,
    actions: {
      reply: lang === 'he' ? 'מענה' : 'Reply',
      replyAll: lang === 'he' ? 'השב לכולם' : 'Reply all',
      forward: lang === 'he' ? 'העברה' : 'Forward',
      print: lang === 'he' ? 'הדפס שרשור' : 'Print thread',
      delete: lang === 'he' ? 'מחיקה' : 'Delete',
      deleting: lang === 'he' ? 'מוחק...' : 'Deleting...',
      replyNotice: lang === 'he' ? 'נבחרה פעולה: מענה להודעה' : 'Action selected: reply to message',
      replyAllNotice: lang === 'he' ? 'נבחרה פעולה: השב לכולם' : 'Action selected: reply all',
      forwardNotice: lang === 'he' ? 'נבחרה פעולה: העברת הודעה' : 'Action selected: forward message',
      deleteNotice: lang === 'he' ? 'ההודעה נמחקה' : 'Message deleted',
      deleteError: lang === 'he' ? 'מחיקת ההודעה נכשלה' : 'Failed to delete message',
    },
    multiRecipient: lang === 'he' ? 'נשלח למספר נמענים' : 'Sent to multiple recipients',
    printWindowTitle: lang === 'he' ? 'הדפסת שרשור הודעות' : 'Print Messages Thread',
    printThreadHeading: lang === 'he' ? 'שרשור הודעות' : 'Messages Thread',
    printSubjectLabel: lang === 'he' ? 'נושא' : 'Subject',
    printGeneratedAtLabel: lang === 'he' ? 'הופק בתאריך' : 'Generated at',
    compose: {
      close: lang === 'he' ? 'סגור' : 'Close',
      replyPlaceholder: lang === 'he' ? 'כתוב תשובה...' : 'Write a reply...',
      forwardRecipients: lang === 'he' ? 'נמענים' : 'Recipients',
      forwardRecipientPlaceholder: lang === 'he' ? 'הקלד שם נמען...' : 'Type recipient...',
      noMatchingRecipients: lang === 'he' ? 'אין התאמות לחיפוש' : 'No matching recipients',
      noRecipientsAvailable: lang === 'he' ? 'אין נמענים זמינים' : 'No recipients available',
      forwardPlaceholder: lang === 'he' ? 'כתוב הודעה להעברה...' : 'Write a message to forward...',
      sendReply: lang === 'he' ? 'שלח תשובה' : 'Send reply',
      sendReplyAll: lang === 'he' ? 'שלח לכולם' : 'Send to all',
      sendForward: lang === 'he' ? 'העבר הודעה' : 'Forward message',
      sending: lang === 'he' ? 'שולח...' : 'Sending...',
      replyRequired: lang === 'he' ? 'יש להזין תוכן תשובה' : 'Please enter a reply',
      replyRecipientMissing: lang === 'he' ? 'לא נמצא נמען לשליחת התשובה' : 'No recipient found for this reply',
      replyFailed: lang === 'he' ? 'שליחת התשובה נכשלה' : 'Failed to send reply',
      replySent: lang === 'he' ? 'התשובה נשלחה' : 'Reply sent',
      replyAllSent: lang === 'he' ? 'התשובה נשלחה לכולם' : 'Reply sent to all',
      forwardRecipientsRequired: lang === 'he' ? 'יש לבחור לפחות נמען אחד' : 'Select at least one recipient',
      forwardContentRequired: lang === 'he' ? 'יש להזין תוכן הודעה' : 'Please enter message content',
      forwardFailed: lang === 'he' ? 'העברה נכשלה' : 'Failed to forward message',
      forwardSent: lang === 'he' ? 'ההודעה הועברה' : 'Message forwarded',
      deleteWithReplies:
        lang === 'he'
          ? 'לא ניתן למחוק הודעה שיש לה תשובות'
          : 'Cannot delete a message that has replies',
    },
  };
}
