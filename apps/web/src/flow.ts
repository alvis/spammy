/** host flow steps, in order, from the Spammy design */
export const FLOW_STEPS = [
  'hello',
  'kind',
  'host',
  'chat',
  'range',
  'spice',
  'awards',
  'people',
  'show',
  'share',
] as const;

export type FlowStep = (typeof FLOW_STEPS)[number];
