export type PetMood = 'idle' | 'walking' | 'jumping' | 'pointing' | 'happy' | 'thinking' | 'sleeping';

export interface PetAction {
  type: 'navigate' | 'highlight' | 'theme' | 'tour';
  route?: string;
  targetSelector?: string;
  label?: string;
  explanation?: string;
  autoClick?: boolean;
}

export interface PetMessage {
  id: string;
  sender: 'user' | 'pet';
  text: string;
  action?: PetAction;
  timestamp: number;
}

export interface PetTargetCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
  explanation: string;
  targetSelector: string;
  buttonLabel?: string;
  route?: string;
}
