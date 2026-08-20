import './index.css';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AvatarCompositor, defaultAvatarConfig } from './avatar';
import type { ResponseType } from './avatar';
import { MenuBarComponent } from './components/menu-bar';
import { PanelHost } from './components/panels/PanelHost';
import { ActionPrompt } from './components/action-prompt/ActionPrompt';
import { PuzzleHost } from './components/puzzles/PuzzleHost';
import { RewardPanel } from './components/panels/RewardPanel';
import { logger } from './logger';
import {
  adjustBubblePosition,
  clampCompanionPosition,
  enforceCompanionInBounds,
} from './renderer/out-of-bounds';

import type { ChleoResponsePayload } from './types/ipc';

// Expose logger on window for dev console access
(window as any).__CHLEO_LOGGER__ = logger;

const modalBackdrop = document.getElementById('modal-backdrop') as HTMLDivElement;
const companionWrapper = document.getElementById('companion-wrapper') as HTMLDivElement;
const bubble = document.getElementById('bubble') as HTMLDivElement | null;
const avatar = document.getElementById('avatar') as HTMLDivElement;
const canvas = document.getElementById('avatar-canvas') as HTMLCanvasElement;
const menuBarContainer = document.getElementById('menu-bar') as HTMLDivElement;
const featurePanelContainer = document.getElementById('feature-panel') as HTMLDivElement;
const actionPromptContainer = document.getElementById('action-prompt') as HTMLDivElement;
const puzzlePanelContainer = document.getElementById('puzzle-panel') as HTMLDivElement;

const compositor = new AvatarCompositor(canvas, defaultAvatarConfig);

let panelRoot: Root | null = null;
let actionPromptRoot: Root | null = null;
let puzzlePanelRoot: Root | null = null;
let bubbleTimer: any = null;

if (featurePanelContainer) {
  panelRoot = createRoot(featurePanelContainer);
  const resizeObserver = new ResizeObserver(() => updateInteractiveRects());
  resizeObserver.observe(featurePanelContainer);
}

if (actionPromptContainer) {
  actionPromptRoot = createRoot(actionPromptContainer);
}

if (puzzlePanelContainer) {
  puzzlePanelRoot = createRoot(puzzlePanelContainer);
  const resizeObserver = new ResizeObserver(() => updateInteractiveRects());
  resizeObserver.observe(puzzlePanelContainer);
}

import type {
  PuzzleSuccessConfig,
  PuzzleRewardItem,
  PanelOrientation,
  AvatarPosition,
  Puzzles,
  BehavioralActions,
} from './monitoring/action-parser';

let activeOptionId: string | null = null;
let isInteractable = true;
let currentPosX = 0;
let currentPosY = 0;

interface ActivePromptState {
  text: string;
  options: string[];
  domain: string;
  actions?: BehavioralActions;
  overallEmotion?: any;
}

interface ActivePuzzleState {
  id: Puzzles | string;
  domain: string;
  onSuccessConfig?: PuzzleSuccessConfig;
  completionSpeech?: string;
  rewardTimeoutSeconds?: number;
  rewardUrgeSpeech?: string;
  rewardUrgePercent?: number;
  overallEmotion?: any;
  orientation?: PanelOrientation | string;
  avatarPosition?: AvatarPosition | string;
  isSandboxTest?: boolean;
}

let activePrompt: ActivePromptState | null = null;
let activePuzzle: ActivePuzzleState | null = null;

// Re-clamp companion to viewport boundaries, reposition speech bubble, and update IPC rects
function enforceBounds() {
  const result = enforceCompanionInBounds(companionWrapper, currentPosX, currentPosY, bubble);
  currentPosX = result.posX;
  currentPosY = result.posY;
  updateInteractiveRects();
}

// Send bounding rects of avatar, menu bar, active feature panel, prompt, puzzle and backdrop to main process
function updateInteractiveRects() {
  const avatarRect = avatar.getBoundingClientRect();
  const menuRect = menuBarContainer.getBoundingClientRect();
  const panelRect = featurePanelContainer ? featurePanelContainer.getBoundingClientRect() : null;
  const promptRect = actionPromptContainer ? actionPromptContainer.getBoundingClientRect() : null;
  const puzzleRect = puzzlePanelContainer ? puzzlePanelContainer.getBoundingClientRect() : null;

  const menuVisible = menuBar ? menuBar.getIsOpen() : false;
  const panelVisible = Boolean(activeOptionId);
  const promptVisible = Boolean(activePrompt);
  const puzzleVisible = Boolean(activePuzzle);
  const backdropVisible = modalBackdrop ? modalBackdrop.classList.contains('visible') : false;

  (window as any).electronAPI?.setInteractiveRects?.({
    avatar: {
      x: avatarRect.left,
      y: avatarRect.top,
      width: avatarRect.width,
      height: avatarRect.height,
    },
    menu: {
      x: menuRect.left,
      y: menuRect.top,
      width: menuRect.width,
      height: menuRect.height,
      visible: menuVisible,
    },
    panel: panelRect ? {
      x: panelRect.left,
      y: panelRect.top,
      width: panelRect.width,
      height: panelRect.height,
      visible: panelVisible,
    } : undefined,
    prompt: promptRect ? {
      x: promptRect.left,
      y: promptRect.top,
      width: promptRect.width,
      height: promptRect.height,
      visible: promptVisible,
    } : undefined,
    puzzle: puzzleRect ? {
      x: puzzleRect.left,
      y: puzzleRect.top,
      width: puzzleRect.width,
      height: puzzleRect.height,
      visible: puzzleVisible,
    } : undefined,
    backdrop: backdropVisible ? {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      visible: true,
    } : undefined,
  });
}

function applyLayoutModifiers(orientation?: string, avatarPosition?: string) {
  const container = document.getElementById('app-container');
  const isCenter = orientation === 'center';

  if (modalBackdrop) {
    if (isCenter) {
      modalBackdrop.classList.add('visible');
    } else {
      modalBackdrop.classList.remove('visible');
    }
  }

  if (container) {
    container.classList.remove('layout-center', 'layout-left');
    if (isCenter) {
      container.classList.add('layout-center');
    } else if (orientation === 'left') {
      container.classList.add('layout-left');
    }
  }

  if (!companionWrapper) return;

  // Reset classes
  companionWrapper.classList.remove(
    'layout-center',
    'layout-left',
    'avatar-pos-bottom-right',
    'avatar-pos-top-right',
    'avatar-pos-center-right'
  );

  if (isCenter) {
    companionWrapper.classList.add('layout-center');
    companionWrapper.style.transform = '';
  } else {
    companionWrapper.style.transform = (currentPosX !== 0 || currentPosY !== 0)
      ? `translate(${currentPosX}px, ${currentPosY}px)`
      : '';
    if (orientation === 'left') {
      companionWrapper.classList.add('layout-left');
    }
  }

  if (avatarPosition === 'top-right') {
    companionWrapper.classList.add('avatar-pos-top-right');
  } else if (avatarPosition === 'center-right') {
    companionWrapper.classList.add('avatar-pos-center-right');
  } else if (avatarPosition === 'bottom-right') {
    companionWrapper.classList.add('avatar-pos-bottom-right');
  }

  enforceBounds();
  requestAnimationFrame(enforceBounds);
}

function closeActionPrompt() {
  activePrompt = null;
  if (actionPromptContainer) {
    actionPromptContainer.classList.remove('visible');
  }
  if (actionPromptRoot) {
    actionPromptRoot.render(null);
  }
  enforceBounds();
}

async function playCompanionSpeech(
  speechText: string,
  overallEmotion?: any,
  responseType: ResponseType = 'declarative'
) {
  if (bubble) {
    bubble.textContent = speechText;
    bubble.classList.add('visible');
    adjustBubblePosition(bubble);
    requestAnimationFrame(() => adjustBubblePosition(bubble));
    updateInteractiveRects();
  }

  try {
    const packet = await compositor.speakWithEmotion(
      speechText,
      overallEmotion || 'annoyed',
      responseType,
      {
        onComplete: () => {
          compositor.resetAll();
        },
      }
    );

    const bubbleDuration = Math.max(1500, (packet?.totalDurationMs || 2500) + 1200);
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
    }
    bubbleTimer = setTimeout(() => {
      if (bubble) {
        bubble.classList.remove('visible');
        bubble.style.transform = '';
        bubble.style.maxWidth = '';
        bubble.style.removeProperty('--tail-offset');
        bubble.classList.remove('bubble-flipped');
        updateInteractiveRects();
      }
    }, bubbleDuration);
  } catch (err: any) {
    logger.error('companion-speech', `Speech synthesis/animation error: ${err?.message || err}`);
  }
}

function showActionPrompt(promptState: ActivePromptState) {
  activePrompt = promptState;
  if (!actionPromptContainer || !actionPromptRoot) return;

  actionPromptContainer.classList.add('visible');
  (window as any).electronAPI?.setIgnoreMouseEvents(false);

  actionPromptRoot.render(
    React.createElement(ActionPrompt, {
      text: activePrompt.text,
      options: activePrompt.options,
      onSelect: (option: string) => {
        logger.info('action-prompt', `User selected prompt option: "${option}"`);
        if (option.toLowerCase() === 'yes') {
          // Close open feature panels and menu bar
          activeOptionId = null;
          renderFeaturePanel();
          menuBar.close();

          // Prepare puzzle config from current prompt actions
          const promptPuzzle = activePrompt?.actions?.promptPuzzle;
          const candidates = activePrompt?.actions?.openPuzzle || ['snake'];
          const randomPuzzle = candidates[Math.floor(Math.random() * candidates.length)] || 'snake';
          const domain = activePrompt?.domain || '';
          const onSuccessConfig = promptPuzzle?.onSuccess;
          const completionSpeech = promptPuzzle?.completionSpeech;
          const rewardTimeoutSeconds = promptPuzzle?.rewardTimeoutSeconds;
          const rewardUrgeSpeech = promptPuzzle?.rewardUrgeSpeech;
          const rewardUrgePercent = promptPuzzle?.rewardUrgePercent;
          const overallEmotion = activePrompt?.overallEmotion;
          const orientation = activePrompt?.actions?.orientation;
          const avatarPosition = activePrompt?.actions?.avatarPosition;
          const interactable = activePrompt?.actions?.interactable;

          // Close prompt and launch puzzle
          closeActionPrompt();
          isInteractable = interactable;
          showPuzzlePanel({
            id: randomPuzzle,
            domain,
            onSuccessConfig,
            completionSpeech,
            rewardTimeoutSeconds,
            rewardUrgeSpeech,
            rewardUrgePercent,
            overallEmotion,
            orientation,
            avatarPosition,
          });
        } else {
          closeActionPrompt();
          isInteractable = true;
          applyLayoutModifiers();
        }
      },
      onClose: () => {
        closeActionPrompt();
        isInteractable = true;
        applyLayoutModifiers();
      },
    })
  );

  updateInteractiveRects();
  requestAnimationFrame(updateInteractiveRects);
}

function closePuzzlePanel() {
  activePuzzle = null;
  if (puzzlePanelContainer) {
    puzzlePanelContainer.classList.remove('visible');
  }
  if (puzzlePanelRoot) {
    puzzlePanelRoot.render(null);
  }
  isInteractable = true;
  applyLayoutModifiers();
}

function showPuzzlePanel(puzzleState: ActivePuzzleState) {
  activePuzzle = puzzleState;
  applyLayoutModifiers(puzzleState.orientation, puzzleState.avatarPosition);

  if (!puzzlePanelContainer || !puzzlePanelRoot) return;

  puzzlePanelContainer.classList.add('visible');
  (window as any).electronAPI?.setIgnoreMouseEvents(false);

  let hasTriggeredHighScoreEvent = false;

  puzzlePanelRoot.render(
    React.createElement(PuzzleHost, {
      puzzleId: puzzleState.id,
      targetDomain: puzzleState.domain,
      onSuccessConfig: puzzleState.onSuccessConfig,
      onHighScoreBeaten: async (puzzleId: string, newHighScore: number) => {
        logger.info('puzzle', `High score beaten for "${puzzleId}"! New high score: ${newHighScore}`);

        // Rewrite the high score in backend for that puzzle
        try {
          let puzzleData: Record<string, any> = {};
          const raw = await (window as any).electronAPI?.readMemoryFile?.('puzzle-data.json');
          if (raw) {
            try {
              puzzleData = JSON.parse(raw);
            } catch {
              puzzleData = {};
            }
          }
          puzzleData[puzzleId] = {
            ...(puzzleData[puzzleId] || {}),
            highScore: newHighScore,
          };
          await (window as any).electronAPI?.saveMemoryFile?.(
            'puzzle-data.json',
            JSON.stringify(puzzleData, null, 2)
          );
        } catch (err: any) {
          logger.error('puzzle', `Failed to save new high score for ${puzzleId}: ${err?.message || err}`);
        }

        // Incur an event for beating high score
        if (!hasTriggeredHighScoreEvent) {
          hasTriggeredHighScoreEvent = true;
          try {
            const reaction = await (window as any).electronAPI?.processMonitoringEvent?.({
              eventId: 'HIGH_SCORE_BEATEN',
              domain: puzzleState.domain || 'retro-snake',
              message: `High score beaten in ${puzzleId}! New high score: ${newHighScore}`,
              timestamp: Date.now(),
            });

            if (reaction?.speechText) {
              playCompanionSpeech(reaction.speechText, 'happy', reaction.responseType);
            }
          } catch (err: any) {
            logger.error('puzzle', `Failed to process HIGH_SCORE_BEATEN event: ${err?.message || err}`);
          }
        }
      },
      onSuccess: async (score: number) => {
        logger.info('puzzle', `Puzzle "${puzzleState.id}" completed with score: ${score}`);

        // Speak victory response using overall emotion from payload
        const winSpeech = puzzleState.completionSpeech || 'Fine, you win! Pick your reward.';
        playCompanionSpeech(winSpeech, puzzleState.overallEmotion);

        // Render RewardPanel in puzzle panel container
        if (puzzlePanelRoot) {
          puzzlePanelRoot.render(
            React.createElement(RewardPanel, {
              rewards: puzzleState.onSuccessConfig || [],
              targetDomain: puzzleState.domain,
              timeoutSeconds: puzzleState.rewardTimeoutSeconds || 60,
              urgePercent: puzzleState.rewardUrgePercent || 50,
              onUrge: () => {
                const urgeText =
                  puzzleState.rewardUrgeSpeech || "Just pick one or else I'll pick one for you!";
                playCompanionSpeech(urgeText, puzzleState.overallEmotion);
              },
              onSelectReward: async (selectedReward: PuzzleRewardItem) => {
                logger.info('reward-panel', `User chosen reward:`, selectedReward);
                closePuzzlePanel();
                if (puzzleState.domain && !puzzleState.isSandboxTest) {
                  await (window as any).electronAPI?.modifyBlockSuccess?.(
                    puzzleState.domain,
                    selectedReward
                  );
                }
                if (puzzleState.isSandboxTest) {
                  activeOptionId = 'puzzle';
                  menuBar.open();
                  menuBar.setActiveOption('puzzle');
                  renderFeaturePanel();
                }
              },
              onClose: () => {
                logger.info('reward-panel', 'Reward selection closed by user');
                closePuzzlePanel();
                if (puzzleState.isSandboxTest) {
                  activeOptionId = 'puzzle';
                  menuBar.open();
                  menuBar.setActiveOption('puzzle');
                  renderFeaturePanel();
                }
              },
            })
          );
          updateInteractiveRects();
          requestAnimationFrame(updateInteractiveRects);
        }
      },
      onCancel: () => {
        logger.info('puzzle', 'Puzzle cancelled by user');
        closePuzzlePanel();
        if (puzzleState.isSandboxTest) {
          activeOptionId = 'puzzle';
          menuBar.open();
          menuBar.setActiveOption('puzzle');
          renderFeaturePanel();
        }
      },
    })
  );

  updateInteractiveRects();
  requestAnimationFrame(updateInteractiveRects);
}

function renderFeaturePanel() {
  if (!featurePanelContainer || !panelRoot) return;

  if (activeOptionId) {
    featurePanelContainer.classList.add('visible');
    // Ensure mouse events are enabled on opening panel
    (window as any).electronAPI?.setIgnoreMouseEvents(false);

    panelRoot.render(
      React.createElement(PanelHost, {
        activeOptionId,
        onClose: () => {
          activeOptionId = null;
          menuBar.setActiveOption(null);
          renderFeaturePanel();
        },
        onSelectPuzzle: (puzzleId) => {
          logger.info('puzzles-panel', `User launched test puzzle: "${puzzleId}"`);
          // Close menu bar and feature panel
          activeOptionId = null;
          menuBar.close();
          renderFeaturePanel();

          // Open puzzle to the left of the avatar without centering
          showPuzzlePanel({
            id: puzzleId,
            domain: '',
            onSuccessConfig: undefined,
            orientation: 'remain',
            isSandboxTest: true,
          });
        },
      })
    );
  } else {
    featurePanelContainer.classList.remove('visible');
  }

  enforceBounds();
  requestAnimationFrame(enforceBounds);
  setTimeout(enforceBounds, 50);
  setTimeout(enforceBounds, 150);
}

// Initialize MenuBar Component
const menuBar = new MenuBarComponent(menuBarContainer, {
  onItemClick: (id: string) => {
    logger.info('menu-bar', `Selected menu item: "${id}"`);
    if (activeOptionId === id) {
      activeOptionId = null;
    } else {
      activeOptionId = id;
    }
    menuBar.setActiveOption(activeOptionId);
    renderFeaturePanel();
  },
  onStateChange: (isOpen: boolean) => {
    logger.debug('menu-bar', `Menu bar ${isOpen ? 'opened' : 'closed'}`);
    (window as any).electronAPI?.setMenuOpen?.(isOpen);
    if (!isOpen) {
      activeOptionId = null;
      renderFeaturePanel();
    }
    enforceBounds();
    requestAnimationFrame(enforceBounds);
  },
});

// Load initial coins and listen for coin updates
(async () => {
  try {
    const coins = await (window as any).electronAPI?.getCoins?.();
    if (typeof coins === 'number') {
      menuBar.setCoins(coins);
    }
  } catch (err: any) {
    logger.error('menu-bar', `Failed to load initial coins: ${err?.message || err}`);
  }
})();

(window as any).electronAPI?.onCoinsChanged?.((newCoins: number) => {
  logger.info('menu-bar', `Received coins-changed event: ${newCoins}`);
  menuBar.setCoins(newCoins);
});

// Avatar & Speech Compositor initialization
(async () => {
  try {
    await compositor.init();
    compositor.start();
    logger.success('avatar', 'AvatarCompositor successfully initialized and started');
    logger.info('speech-orchestrator', 'SpeechOrchestrator ready');
  } catch (err: any) {
    logger.error('avatar', `Avatar initialization failed: ${err?.message || err}`, err);
  }
  updateInteractiveRects();
})();

// Listen for companion speech broadcast from Main process
(window as any).electronAPI?.onCompanionSpeak?.(async (data: ChleoResponsePayload) => {
  logger.info('companion-speech', `Chleo dialogue: "${data.speechText}"`, {
    overallEmotion: data.overallEmotion,
    responseType: data.responseType,
  });

  // Check if speech event came with an action prompt
  if (data.actions?.promptPuzzle) {
    const promptConfig = data.actions.promptPuzzle;

    // Close all open menus/panels if configured
    if (promptConfig.closeAllTabs) {
      activeOptionId = null;
      renderFeaturePanel();
      menuBar.close();
    }

    // Set draggable / interactable state
    isInteractable = promptConfig.draggable;

    // Set prompt orientation (e.g. 'center' vs 'remain')
    const promptOrientation = promptConfig.orientation;
    applyLayoutModifiers(promptOrientation === 'center' ? 'center' : undefined);

    showActionPrompt({
      text: promptConfig.text,
      options: promptConfig.options,
      domain: data.domain || '',
      actions: data.actions,
      overallEmotion: data.overallEmotion,
    });
  }

  await playCompanionSpeech(
    data.speechText,
    data.overallEmotion,
    (data.responseType as ResponseType) || 'declarative'
  );
});

// Send initial rects & track resize
window.addEventListener('resize', () => {
  enforceBounds();
});
setTimeout(enforceBounds, 100);
setTimeout(enforceBounds, 500);

// State to track window dragging
let isDragging = false;
let startX = 0;
let startY = 0;

// Helper to set interactive mode
function setInteractive(interactive: boolean) {
  (window as any).electronAPI?.setIgnoreMouseEvents(!interactive, { forward: true });
}

// Check if any interactive UI component is currently hovered
function checkIsHovered(): boolean {
  return Boolean(
    avatar.matches(':hover') ||
    menuBarContainer.matches(':hover') ||
    (featurePanelContainer && featurePanelContainer.matches(':hover')) ||
    (actionPromptContainer && actionPromptContainer.classList.contains('visible') && actionPromptContainer.matches(':hover')) ||
    (puzzlePanelContainer && puzzlePanelContainer.classList.contains('visible') && puzzlePanelContainer.matches(':hover')) ||
    (bubble && bubble.classList.contains('visible') && bubble.matches(':hover'))
  );
}

// Mouse enter/leave handlers on interactive element
avatar.addEventListener('mouseenter', () => {
  setInteractive(true);
});

avatar.addEventListener('mouseleave', () => {
  if (!isDragging && !checkIsHovered()) {
    setInteractive(false);
  }
});

menuBarContainer.addEventListener('mouseenter', () => {
  setInteractive(true);
});

menuBarContainer.addEventListener('mouseleave', () => {
  if (!isDragging && !checkIsHovered()) {
    setInteractive(false);
  }
});

if (featurePanelContainer) {
  featurePanelContainer.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  featurePanelContainer.addEventListener('mouseleave', () => {
    if (!isDragging && !checkIsHovered()) {
      setInteractive(false);
    }
  });
}

if (actionPromptContainer) {
  actionPromptContainer.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  actionPromptContainer.addEventListener('mouseleave', () => {
    if (!isDragging && !checkIsHovered()) {
      setInteractive(false);
    }
  });
}

if (puzzlePanelContainer) {
  puzzlePanelContainer.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  puzzlePanelContainer.addEventListener('mouseleave', () => {
    if (!isDragging && !checkIsHovered()) {
      setInteractive(false);
    }
  });
}

if (bubble) {
  bubble.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  bubble.addEventListener('mouseleave', () => {
    if (!isDragging && !checkIsHovered()) {
      setInteractive(false);
    }
  });
}

// Right click on avatar: if a puzzle or prompt is open, close it; otherwise toggle the menu bar
avatar.addEventListener('contextmenu', (e: MouseEvent) => {
  e.preventDefault();
  if (!isInteractable) return;

  if (activePuzzle) {
    logger.info('puzzle', 'Active puzzle closed via avatar right-click');
    closePuzzlePanel();
    updateInteractiveRects();
    return;
  }

  if (activePrompt) {
    logger.info('action-prompt', 'Active prompt closed via avatar right-click');
    closeActionPrompt();
    updateInteractiveRects();
    return;
  }

  menuBar.toggle();
  updateInteractiveRects();
});

avatar.addEventListener('pointerdown', (e: PointerEvent) => {
  if (!isInteractable) return;
  const target = e.target as HTMLElement | null;
  if (target && (target.closest('#action-prompt') || target.closest('#bubble'))) {
    return;
  }

  if (e.button === 0) { // Left click only
    isDragging = true;
    startX = e.screenX;
    startY = e.screenY;
    try {
      avatar.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    avatar.style.cursor = 'grabbing';
    (window as any).electronAPI?.setDragging(true);
  }
});

window.addEventListener('pointermove', (e: PointerEvent) => {
  if (isDragging) {
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;

    const wrapperRect = companionWrapper.getBoundingClientRect();
    const clamped = clampCompanionPosition({
      currentPosX,
      currentPosY,
      dx,
      dy,
      wrapperRect,
      padding: 12,
    });

    currentPosX = clamped.posX;
    currentPosY = clamped.posY;

    companionWrapper.style.transform = `translate(${currentPosX}px, ${currentPosY}px)`;
    adjustBubblePosition(bubble);
    updateInteractiveRects();
  }
});

const stopDragging = (e?: PointerEvent) => {
  if (isDragging) {
    isDragging = false;
    avatar.style.cursor = 'grab';
    if (e) {
      try {
        if (avatar.hasPointerCapture(e.pointerId)) {
          avatar.releasePointerCapture(e.pointerId);
        }
      } catch (_) {
        /* ignore */
      }
    }
    (window as any).electronAPI?.setDragging(false);
    setInteractive(checkIsHovered());
  }
};

window.addEventListener('pointerup', stopDragging);
window.addEventListener('pointercancel', stopDragging);
window.addEventListener('blur', () => stopDragging());

// Click to blink
canvas.addEventListener('click', () => {
  compositor.playAnimation('eyes', 'blink');
});




