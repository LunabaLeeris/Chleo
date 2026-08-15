import './index.css';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AvatarCompositor, defaultAvatarConfig, defaultSpeechOrchestrator } from './avatar';
import { MenuBarComponent } from './components/menu-bar';
import { PanelHost } from './components/panels/PanelHost';
import { logger } from './logger';

import { ElectronAPI } from './types/ipc';

// Expose logger on window for dev console access
(window as any).__CLEO_LOGGER__ = logger;

// Type checking definitions for exposed window API
interface Window {
  electronAPI?: ElectronAPI;
}

const bubble = document.getElementById('bubble') as HTMLDivElement | null;
const avatar = document.getElementById('avatar') as HTMLDivElement;
const canvas = document.getElementById('avatar-canvas') as HTMLCanvasElement;
const menuBarContainer = document.getElementById('menu-bar') as HTMLDivElement;
const featurePanelContainer = document.getElementById('feature-panel') as HTMLDivElement;

const compositor = new AvatarCompositor(canvas, defaultAvatarConfig);
const speechOrchestrator = defaultSpeechOrchestrator;

let panelRoot: Root | null = null;

if (featurePanelContainer) {
  panelRoot = createRoot(featurePanelContainer);

  // Automatically update interactive rects whenever panel size or DOM children change
  const resizeObserver = new ResizeObserver(() => {
    updateInteractiveRects();
  });
  resizeObserver.observe(featurePanelContainer);

  const mutationObserver = new MutationObserver(() => {
    requestAnimationFrame(updateInteractiveRects);
  });
  mutationObserver.observe(featurePanelContainer, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

let activeOptionId: string | null = null;

// Send bounding rects of avatar, menu bar, and active feature panel to main process
function updateInteractiveRects() {
  const avatarRect = avatar.getBoundingClientRect();
  const menuRect = menuBarContainer.getBoundingClientRect();
  const panelRect = featurePanelContainer ? featurePanelContainer.getBoundingClientRect() : null;

  const menuVisible = menuBar ? menuBar.getIsOpen() : false;
  const panelVisible = Boolean(activeOptionId);

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
  });
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
      })
    );
  } else {
    featurePanelContainer.classList.remove('visible');
  }

  // Update rects synchronously, on next frame, and after React DOM layout finishes
  updateInteractiveRects();
  requestAnimationFrame(() => updateInteractiveRects());
  setTimeout(updateInteractiveRects, 50);
  setTimeout(updateInteractiveRects, 150);
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
    updateInteractiveRects();
  },
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

// Send initial rects & track resize
window.addEventListener('resize', updateInteractiveRects);
setTimeout(updateInteractiveRects, 100);
setTimeout(updateInteractiveRects, 500);

// State to track window dragging
let isDragging = false;
let startX = 0;
let startY = 0;

// Helper to set interactive mode
function setInteractive(interactive: boolean) {
  (window as any).electronAPI?.setIgnoreMouseEvents(!interactive, { forward: true });
}

// Mouse enter/leave handlers on interactive element (avatar, menu bar & feature panel)
avatar.addEventListener('mouseenter', () => {
  setInteractive(true);
});

avatar.addEventListener('mouseleave', () => {
  if (!isDragging && !menuBarContainer.matches(':hover')
    && (!featurePanelContainer ||
      !featurePanelContainer.matches(':hover')) &&
    (!bubble || !bubble.matches(':hover'))) {
    setInteractive(false);
  }
});

menuBarContainer.addEventListener('mouseenter', () => {
  setInteractive(true);
});

menuBarContainer.addEventListener('mouseleave', () => {
  if (!isDragging && !avatar.matches(':hover') &&
    (!featurePanelContainer || !featurePanelContainer.matches(':hover'))) {
    setInteractive(false);
  }
});

if (featurePanelContainer) {
  featurePanelContainer.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  featurePanelContainer.addEventListener('mouseleave', () => {
    if (!isDragging && !avatar.matches(':hover') && !menuBarContainer.matches(':hover')) {
      setInteractive(false);
    }
  });
}

if (bubble) {
  bubble.addEventListener('mouseenter', () => {
    setInteractive(true);
  });

  bubble.addEventListener('mouseleave', () => {
    if (!isDragging && !avatar.matches(':hover') && !menuBarContainer.matches(':hover')) {
      setInteractive(false);
    }
  });
}

// Right click on avatar toggles the menu bar
avatar.addEventListener('contextmenu', (e: MouseEvent) => {
  e.preventDefault();
  menuBar.toggle();
  updateInteractiveRects();
});

avatar.addEventListener('pointerdown', (e: PointerEvent) => {
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
    (window as any).electronAPI?.dragWindow(dx, dy);
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

    // Check if mouse is hovering over avatar, menu, panel, or speech bubble
    const isHovered = avatar.matches(':hover') ||
      menuBarContainer.matches(':hover') ||
      (featurePanelContainer && featurePanelContainer.matches(':hover')) ||
      (bubble && bubble.classList.contains('visible') && bubble.matches(':hover'));
    setInteractive(isHovered ?? false);
  }
};

window.addEventListener('pointerup', stopDragging);
window.addEventListener('pointercancel', stopDragging);
window.addEventListener('blur', () => stopDragging());

// Click to blink
canvas.addEventListener('click', () => {
  compositor.playAnimation('eyes', 'blink');
});




