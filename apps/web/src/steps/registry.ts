import { StartStep, KindStep, HostStep, UploadStep, DatesStep, RoastStep } from './setup';
import { AwardsStep } from './awards';
import { PeopleStep } from './people';
import { ShowStep } from './ceremony';
import { ShareStep } from './share';
import type { FC } from 'react';
import type { FlowStep } from '../flow';
import type { StepProps } from './types';

/** associates each host journey stage with its screen */
export const STEP_REGISTRY: Record<FlowStep, FC<StepProps>> = {
  hello: StartStep,
  kind: KindStep,
  host: HostStep,
  chat: UploadStep,
  range: DatesStep,
  spice: RoastStep,
  awards: AwardsStep,
  people: PeopleStep,
  show: ShowStep,
  share: ShareStep,
};
