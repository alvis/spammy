import type { Receipt, Show } from './show';

/**
 * formats source evidence with current speaker naming and other people masked
 * @param receipt verified receipt identifying the quoted message
 * @param show local source chat and current cast names
 * @returns display text without changing the stored receipt or source
 */
export function formatReceiptQuote(
  receipt: Pick<Receipt, 'messageId' | 'authorId' | 'quote'>,
  show: Pick<Show, 'chat' | 'cast'>,
): string {
  const message = show.chat?.messages.find(
    (candidate) => candidate.id === receipt.messageId && candidate.authorId === receipt.authorId,
  );
  const quote = message?.text ?? receipt.quote;
  const speaker = show.cast.find((person) => person.participantId === receipt.authorId);
  const names = new Map<string, string>();
  for (const person of show.chat?.participants ?? []) {
    const replacement =
      person.id === receipt.authorId ? (speaker?.displayName ?? person.displayName) : '[name]';
    names.set(person.displayName.toLocaleLowerCase(), replacement);
    names.set(person.id.toLocaleLowerCase(), replacement);
  }
  for (const person of show.cast) {
    names.set(
      person.displayName.toLocaleLowerCase(),
      person.participantId === receipt.authorId ? person.displayName : '[name]',
    );
  }
  const escaped = [...names.keys()]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const redacted = quote
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>]+/gi, '[link]')
    .replace(/(?<![\p{L}\p{N}])\+?\d[\d ().-]{6,}\d(?![\p{L}\p{N}])/gu, '[phone]');
  if (escaped.length === 0) return redacted;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])@?(?:${escaped.join('|')})(?![\\p{L}\\p{N}_])`,
    'giu',
  );
  return redacted.replace(
    pattern,
    (name) => names.get(name.replace(/^@/, '').toLocaleLowerCase()) ?? '[name]',
  );
}
