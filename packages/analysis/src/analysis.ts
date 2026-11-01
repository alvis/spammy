import { NotImplementedError } from '@wrapa/domain';

import type { DateRange, ParsedChat } from '@wrapa/domain';

/** per-participant counts used by award agents */
export interface ParticipantStats {
  /** participant id */
  participantId: string;
  /** messages sent in range */
  messageCount: number;
  /** messages sent between midnight and 5am local time */
  lateNightCount: number;
  /** media messages sent in range */
  mediaCount: number;
}

/** notable message flagged by the bulk read as award material */
export interface Highlight {
  /** source message id */
  messageId: string;
  /** short reason it stands out */
  reason: string;
}

/** output of one long-context analysis pass */
export interface ChatAnalysis {
  /** deterministic per-participant statistics */
  stats: ParticipantStats[];
  /** model-selected moments */
  highlights: Highlight[];
}

/** inputs to the analysis pass */
export interface AnalyzeChatInput {
  /** pseudonymized chat */
  chat: ParsedChat;
  /** inclusive window to analyze; whole chat when null */
  range: DateRange | null;
}

/**
 * computes statistics and asks the bulk-read model for highlights in a single long-context call
 * @param input pseudonymized chat and range
 * @returns statistics and highlights
 * @throws {NotImplementedError} until implemented
 */
export async function analyzeChat(input: AnalyzeChatInput): Promise<ChatAnalysis> {
  throw new NotImplementedError('analysis.analyzeChat');
}

/**
 * estimates the token cost of analyzing the chat so the host can cancel before spending
 * @param input pseudonymized chat and range
 * @returns estimated input tokens
 * @throws {NotImplementedError} until implemented
 */
export function estimateTokens(input: AnalyzeChatInput): number {
  throw new NotImplementedError('analysis.estimateTokens');
}
