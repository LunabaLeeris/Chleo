import type { PlutchikEmotion, EmotionalState } from '../avatar/emotions/emotion-types';
import type { MonitoringEventPayload, SiteRule } from '../monitoring/monitoring-types';
import type { BehavioralRule, BehavioralReactionResult } from '../monitoring/behavioral-engine';
import type { ShortTermMemoryEvent, LongTermMemoryData } from '../memory/memory-types';

export interface ComponentRect {
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
}

export interface InteractiveRects {
  avatar?: ComponentRect;
  menu?: ComponentRect;
  panel?: ComponentRect;
}

export interface IgnoreMouseEventsOptions {
  forward?: boolean;
}

export interface ChleoResponsePayload {
  speechText: string;
  responseType: string;
  overallEmotion: PlutchikEmotion;
  emotionState: EmotionalState;
}

export type MainLogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface MainLogPayload {
  type: MainLogLevel;
  source: string;
  description: string;
  details?: unknown;
}

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => void;
  dragWindow: (dx: number, dy: number) => void;
  setDragging: (dragging: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setInteractiveRects: (rects: InteractiveRects) => void;
  saveMemoryFile: (filename: string, content: string) => Promise<boolean>;
  readMemoryFile: (filename: string) => Promise<string | null>;

  // Emotion & Brain APIs
  getOverallEmotion: () => Promise<PlutchikEmotion>;
  getEmotionState: () => Promise<EmotionalState>;
  processMonitoringEvent: (event: MonitoringEventPayload) => Promise<BehavioralReactionResult | null>;
  setActiveDomain: (url: string) => Promise<string>;
  getActiveDomain: () => Promise<string>;

  // Rules & Memory APIs
  getSiteRules: () => Promise<SiteRule[]>;
  getBehavioralRules: () => Promise<BehavioralRule[]>;
  getShortTermMemoryEvents: () => Promise<ShortTermMemoryEvent[]>;
  getLongTermMemoryData: () => Promise<LongTermMemoryData>;

  // Main -> Renderer Logging Stream
  onMainLog?: (callback: (payload: MainLogPayload) => void) => () => void;
  getBufferedMainLogs?: () => Promise<MainLogPayload[]>;
}

