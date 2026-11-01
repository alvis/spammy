import type { Award, CeremonyScript, Show } from '@spammy/domain';
import type { FlowStep } from '../flow';

/** capabilities shared by the registered setup screens */
export interface StepProps {
  show: Show;
  isReplay: boolean;
  onReplay: (show?: Show) => void;
  hostLine: string;
  isHostTalking: boolean;
  onNewShow: () => void;
  onChange: (show: Show) => void;
  onNavigate: (step: FlowStep) => void;
  onNotice: (notice: string) => void;
  isBusy: boolean;
  setBusy: (isBusy: boolean) => void;
  isUploaded: boolean;
  onUploaded: (show: Show) => void;
  onReceipts: (award: Award) => void;
  ceremonyScript: CeremonyScript | null;
  onScript: (script: CeremonyScript | null) => void;
}
