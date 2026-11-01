import { NotImplementedError } from '@wrapa/domain';

import type { ParsedChat } from '@wrapa/domain';

/** chat with real names replaced by stable aliases, plus the reverse map kept server-side */
export interface PseudonymizedChat {
  /** chat safe to send to OpenAI */
  chat: ParsedChat;
  /** alias → real display name */
  aliases: Record<string, string>;
}

/**
 * replaces participant names and @-mentions with stable aliases before any model call
 * @param chat parsed chat
 * @returns pseudonymized chat and alias map
 * @throws {NotImplementedError} until implemented
 */
export function pseudonymizeChat(chat: ParsedChat): PseudonymizedChat {
  throw new NotImplementedError('analysis.pseudonymizeChat');
}
