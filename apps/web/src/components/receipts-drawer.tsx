import { useEffect, useRef } from 'react';
import { formatReceiptQuote } from '@spammy/domain';
import type { ReactElement } from 'react';
import type { Award, Show } from '@spammy/domain';

/** displays cited export messages in a modal sheet with keyboard focus containment */
export function ReceiptsDrawer({
  show,
  award,
  onClose,
}: {
  show: Show;
  award: Award;
  onClose: () => void;
}): ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const messages = show.chat?.messages ?? [];
  const evidence = new Set(award.receipts.map((receipt) => receipt.messageId));
  const index = messages.findIndex((message) => evidence.has(message.id));
  const context = messages.slice(Math.max(0, index - 3), Math.max(0, index) + 7);
  return (
    <dialog
      ref={dialog}
      className="receipts-drawer"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-content">
        <header>
          <span className="eyebrow">
            {show.chat?.groupName} · {context[0]?.sentAt.slice(0, 10)}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close receipts"
            onClick={onClose}
          >
            ×
          </button>
          <h2>{award.title}</h2>
        </header>
        <div className="chat-bubbles">
          {context.map((message) =>
            message.kind === 'system' ? (
              <p className="system-pill" key={message.id}>
                {formatReceiptQuote(
                  { messageId: message.id, authorId: message.authorId ?? '', quote: message.text },
                  show,
                )}
              </p>
            ) : (
              <article
                className={`chat-bubble ${evidence.has(message.id) ? 'is-evidence' : ''}`}
                key={message.id}
              >
                <strong>
                  {show.cast.find((person) => person.participantId === message.authorId)
                    ?.displayName ?? 'Participant'}
                </strong>
                {evidence.has(message.id) && <small className="evidence-tag">Evidence</small>}
                <p>
                  {formatReceiptQuote(
                    {
                      messageId: message.id,
                      authorId: message.authorId ?? '',
                      quote: message.text,
                    },
                    show,
                  )}
                </p>
                <time>{message.sentAt.slice(11, 16)}</time>
              </article>
            ),
          )}
          {!context.length && <p>No conversation context is available for this award.</p>}
        </div>
        <footer>
          Straight from your export, with the names you chose. Nothing in this drawer is sent
          elsewhere.
        </footer>
      </div>
    </dialog>
  );
}
