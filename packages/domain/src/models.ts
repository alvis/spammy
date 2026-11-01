/**
 * OpenAI model per task, hard-coded by design; confirm availability against `/v1/models` at setup
 */
export const OPENAI_MODELS = {
  bulkRead: 'gpt-6-luna',
  awardAgents: 'gpt-6-astra',
  script: 'gpt-6-astra',
  faceLocation: 'gpt-6.1-terra',
} as const;

export type OpenAiTask = keyof typeof OPENAI_MODELS;
