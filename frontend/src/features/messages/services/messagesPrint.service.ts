import type { Message } from '../../../services/messagesApi';
import type { MessagesListLabels } from '../messagesPage.types';
import { buildMessageMetaMain, escapeHtml } from './messagesThreadHelpers.service';

export function printMessagesThread(params: {
  messages: Message[];
  selectedSubject: string;
  lang: 'he' | 'en';
  userId?: number;
  userNamesById: Record<number, string>;
  labels: MessagesListLabels;
}) {
  const { messages, selectedSubject, lang, userId, userNamesById, labels } = params;

  if (!messages.length) {
    return;
  }

  const renderedMessages = messages
    .map((msg) => {
      const metaMain = buildMessageMetaMain(msg, { lang, userId, userNamesById, labels: labels.threadMeta });
      const dateText = new Date(msg.createdAt).toLocaleString();
      return `
        <article style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:8px; font-size:13px; color:#444;">
            <strong>${escapeHtml(metaMain.text)}</strong>
            <span>${escapeHtml(dateText)}</span>
          </div>
          <div style="font-size:14px; line-height:1.5; white-space:pre-wrap;">${escapeHtml(msg.content)}</div>
        </article>
      `;
    })
    .join('');

  const nowText = new Date().toLocaleString();
  const html = `
    <!doctype html>
    <html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(labels.printWindowTitle)}</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 24px; color: #111;">
        <h1 style="margin: 0 0 8px;">${escapeHtml(labels.printThreadHeading)}</h1>
        <p style="margin: 0 0 6px;"><strong>${escapeHtml(labels.printSubjectLabel)}:</strong> ${escapeHtml(selectedSubject || '-')}</p>
        <p style="margin: 0 0 18px; color:#555;"><strong>${escapeHtml(labels.printGeneratedAtLabel)}:</strong> ${escapeHtml(nowText)}</p>
        ${renderedMessages}
        <script>
          window.addEventListener('load', function () {
            window.print();
          });
        </script>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const printUrl = URL.createObjectURL(blob);
  const printWindow = window.open(printUrl, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(printUrl);
    return;
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(printUrl);
  }, 30_000);
}
