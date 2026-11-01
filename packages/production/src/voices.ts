import type { Persona } from '@spammy/domain';

/** environment variable holding each persona's fixed ElevenLabs voice id */
export const PERSONA_VOICE_ENV = {
  goldie: 'ELEVENLABS_VOICE_GOLDIE',
  velvet: 'ELEVENLABS_VOICE_VELVET',
  disco: 'ELEVENLABS_VOICE_DISCO',
} as const satisfies Record<Persona, string>;
