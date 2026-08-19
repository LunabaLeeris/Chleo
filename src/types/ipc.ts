import type { PlutchikEmotion, EmotionalState } from '../avatar/emotions/emotion-types';
import type { MonitoringEventPayload, SiteRule } from '../monitoring/monitoring-types';
import type { BehavioralRule, BehavioralReactionResult, BehavioralActions } from '../monitoring/behavioral-engine';
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
  prompt?: ComponentRect;
  puzzle?: ComponentRect;
  backdrop?: ComponentRect;
}

export interface IgnoreMouseEventsOptions {
  forward?: boolean;
}

export interface ChleoResponsePayload {
  speechText: string;
  responseType: string;
  overallEmotion: PlutchikEmotion;
  emotionState: EmotionalState;
  domain?: string;
  eventId?: string;
  actions?: BehavioralActions;
  rewards?: {
    coins?: number;
    itemDrop?: string;
  };
}

export type MainLogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface MainLogPayload {
  type: MainLogLevel;
  source: string;
  description: string;
  details?: unknown;
}

export type InventoryTarget = 'storage' | 'fridge' | 'closet';

export interface UserItemsData {
  coins: number;
  storage?: any[];
  fridge?: any[];
  closet?: any[];
  [key: string]: any;
}

export interface PurchaseItemPayload {
  target: InventoryTarget;
  itemId: string;
  amount: number;
  costPerUnit: number;
}

export interface PurchaseItemResult {
  success: boolean;
  error?: string;
  remainingCoins: number;
}

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => void;
  dragWindow: (dx: number, dy: number) => void;
  setDragging: (dragging: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setInteractiveRects: (rects: InteractiveRects) => void;
  saveMemoryFile: (filename: string, content: string) => Promise<boolean>;
  readMemoryFile: (filename: string) => Promise<string | null>;

  // User Items & Coins APIs
  getUserItems: () => Promise<UserItemsData>;
  saveUserItems: (data: UserItemsData) => Promise<boolean>;
  getCoins: () => Promise<number>;
  setCoins: (amount: number) => Promise<number>;
  modifyCoins: (delta: number) => Promise<number>;
  purchaseItem?: (payload: PurchaseItemPayload) => Promise<PurchaseItemResult>;
  addUserItem?: (target: InventoryTarget, itemId: string, quantity?: number) => Promise<boolean>;
  onCoinsChanged?: (callback: (coins: number) => void) => () => void;

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
  saveSiteRules?: () => Promise<boolean>;
  flushMemory?: () => Promise<boolean>;

  // Actions & Puzzle APIs
  closeActiveTab: (domain?: string) => Promise<boolean>;
  modifyBlockSuccess: (domain: string, onSuccess?: any) => Promise<boolean>;

  // Main -> Renderer Logging Stream
  onMainLog?: (callback: (payload: MainLogPayload) => void) => () => void;
  getBufferedMainLogs?: () => Promise<MainLogPayload[]>;

  // Companion Broadcast Events
  onCompanionSpeak?: (callback: (payload: ChleoResponsePayload) => void) => () => void;
  onRulesChanged?: (callback: () => void) => () => void;
}


