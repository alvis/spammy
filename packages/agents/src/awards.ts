import { NotImplementedError } from '@wrapa/domain';

import type { ChatAnalysis } from '@wrapa/analysis';
import type { Award, CastMember, RoastLevel } from '@wrapa/domain';

/** context the award agents reason over */
export interface SuggestAwardsInput {
  /** cast eligible for nomination */
  cast: CastMember[];
  /** roast intensity chosen by the host */
  roastLevel: RoastLevel;
  /** statistics and highlights from the analysis pass */
  analysis: ChatAnalysis;
}

/**
 * runs the award agents (OpenAI Agents SDK) to propose open-ended awards with nominees and receipts
 * @param input cast, roast level, and analysis
 * @returns proposed awards, all initially sealed
 * @throws {NotImplementedError} until implemented
 */
export async function suggestAwards(input: SuggestAwardsInput): Promise<Award[]> {
  throw new NotImplementedError('agents.suggestAwards');
}

/**
 * picks winners for sealed awards without revealing them to the host
 * @param awards awards whose decision is `sealed`
 * @returns awards with `winnerId` set
 * @throws {NotImplementedError} until implemented
 */
export async function judgeSealedAwards(awards: Award[]): Promise<Award[]> {
  throw new NotImplementedError('agents.judgeSealedAwards');
}
