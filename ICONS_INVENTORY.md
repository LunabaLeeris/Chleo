# CHLEO Icon Inventory & Drawing Guide

This document lists all existing icons, emoji placeholders, and missing icon slots across the CHLEO codebase so you can draw and integrate custom pixel art icons.

---

## ⚡ Icon Loader & Caching System (`src/assets/icon-loader.ts`)
CHLEO uses an in-memory preloading and caching registry ([src/assets/icon-loader.ts](file:///c:/Users/ron/ReactProjects/Chleo/src/assets/icon-loader.ts)).

### How to add new drawn icons:
1. Save your `.png` drawing to `src/assets/icons/<name>.png` (and `assets/icons/<name>.png`).
2. In `src/assets/icon-loader.ts`, import the image and add it to `REGISTERED_ICONS`:
   ```ts
   import PUZZLE_ICON from './icons/puzzles.png';
   import MONITORING_ICON from './icons/monitoring.png';
   import DEBUG_ICON from './icons/debug.png';
   import STAR_ICON from './icons/star.png';
   import KEYBOARD_ICON from './icons/keyboard.png';
   import SNAKE_ICON from './icons/snake.png';
   
   export const REGISTERED_ICONS: Record<string, string> = {
     status: STATUS_ICON,
     puzzle: PUZZLE_ICON,
     puzzles: PUZZLE_ICON,
     monitoring: MONITORING_ICON,
     debug: DEBUG_ICON,
     reward: STAR_ICON,
     rewards: STAR_ICON,
     star: STAR_ICON,
     typing: KEYBOARD_ICON,
     keyboard: KEYBOARD_ICON,
     snake: SNAKE_ICON,
     ...
   };
   ```
3. All registered icons are automatically preloaded into memory at application startup, providing instant, flicker-free rendering across menu bars, panel headers, and cards.

---

## 1. Menu Bar Icons (`src/components/menu-bar.ts`)
The desktop companion bottom/drawer menu bar has 11 action items.

| Item ID | Label | Current Status / Icon | File Location | Suggested Icon Theme / Description |
| :--- | :--- | :---: | :--- | :--- |
| `status` | Status | ✅ `assets/icons/status.png` | `src/components/menu-bar.ts` | Pixel Companion Face / Heart |
| `puzzle` | Puzzle | ✅ `assets/icons/puzzles.png` | `src/components/menu-bar.ts` | Pixel Gamepad / Arcade Joystick |
| `debug` | Debug | ✅ `assets/icons/debug.png` | `src/components/menu-bar.ts` | Pixel Terminal / Log Bug |
| `monitoring` | Monitoring | ✅ `assets/icons/monitoring.png` | `src/components/menu-bar.ts` | Pixel Radar / Eyeball / Activity Shield |
| `reward` | Reward (Dev) | ✅ `assets/icons/star.png` | `src/components/menu-bar.ts` | Pixel Star / Victory Reward |
| `config` | Config | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Wrench, gear, or sliders |
| `marketplace`| Marketplace | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Shopping bag, store awning, or cart |
| `calendar` | Calendar | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Calendar page or clock |
| `fridge` | Fridge | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Refrigerator, apple, or food box |
| `storage` | Storage | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Treasure chest, inventory backpack, or crate |
| `closet` | Closet | `''` (Pending Drawing) | `src/components/menu-bar.ts` | Wardrobe, clothes hanger, or t-shirt |

---

## 2. Feature Panel Header Icons (`src/components/panels/`)
Each panel uses `PanelContainer` with a header `icon` slot (`icon?: string`).

| Panel Component | Panel Title | Current Status / Icon | File Location | Suggested Icon Theme / Description |
| :--- | :--- | :---: | :--- | :--- |
| `StatusPanel.tsx` | Companion Status | ✅ `status` (`status.png`) | `src/components/panels/StatusPanel.tsx` | Pixel Face / Heart / Emotion meter |
| `PuzzlesPanel.tsx` | Puzzles & Games | ✅ `puzzles` (`puzzles.png`) | `src/components/panels/PuzzlesPanel.tsx` | Arcade machine / Puzzle tile |
| `MonitoringPanel.tsx` | Site Monitoring | ✅ `monitoring` (`monitoring.png`) | `src/components/panels/MonitoringPanel.tsx` | Pixel Activity Radar / Eyeball |
| `DebugPanel.tsx` | Debug & Logs | ✅ `debug` (`debug.png`) | `src/components/panels/DebugPanel.tsx` | Pixel Console / Terminal cursor |
| `RewardPanel.tsx` | Victory Rewards | ✅ `reward` (`star.png`) | `src/components/panels/RewardPanel.tsx` | Pixel Golden Star / Victory Badge |
| `ConfigPanel.tsx` | Config | `""` (Pending Drawing) | `src/components/panels/ConfigPanel.tsx` | Settings gear |
| `MarketplacePanel.tsx` | Marketplace | `""` (Pending Drawing) | `src/components/panels/MarketplacePanel.tsx` | Market stall / Diamond coin |
| `CalendarPanel.tsx` | Calendar | `""` (Pending Drawing) | `src/components/panels/CalendarPanel.tsx` | Daily schedule page |
| `FridgePanel.tsx` | Fridge | `""` (Pending Drawing) | `src/components/panels/FridgePanel.tsx` | Ice fridge / Snack |
| `StoragePanel.tsx` | Storage | `""` (Pending Drawing) | `src/components/panels/StoragePanel.tsx` | Wooden inventory chest |
| `ClosetPanel.tsx` | Closet | `""` (Pending Drawing) | `src/components/panels/ClosetPanel.tsx` | Outfit / Hanger |

---

## 3. Puzzles Suite Icons (`src/components/puzzles/` & `PuzzlesPanel.tsx`)
Puzzles displayed in `PuzzlesPanel` cards and inside `PuzzleContainer` headers.

| Puzzle ID | Puzzle Name | Current Icon | File Location | Notes / Suggested Art |
| :--- | :--- | :---: | :--- | :--- |
| `matching` | Memory Match | ✅ `puzzles` (`puzzles.png`) | `src/components/puzzles/MatchingPuzzle.tsx` | Pixel cards / memory puzzle pieces |
| `typing` | Speed Typer | ✅ `keyboard` (`keyboard.png`) | `src/components/puzzles/TypingPuzzle.tsx` | Pixel mechanical keyboard / typing icon |
| `snake` | Retro Snake | ✅ `snake` (`snake.png`) | `src/components/puzzles/SnakePuzzle.tsx` | Pixel retro snake icon |
| `chess` | Pixel Chess | `♟️` (Emoji) | `src/components/puzzles/ChessPuzzle.tsx` | Pixel chess knight or pawn piece |
| `sudoku` | Mini Sudoku | `🔢` (Emoji) | `src/components/puzzles/SudokuPuzzle.tsx` | 4x4 numbered grid or dice |

---

## 4. Victory Rewards & Behavioral Action Icons (`RewardPanel.tsx` & `behavioral-rules.json`)
Rewards presented to the user when completing a puzzle challenge to regain browsing access.

| Reward ID / Element | Label / Context | Current Icon | File Location | Suggested Icon Theme / Description |
| :--- | :--- | :---: | :--- | :--- |
| `avoid_30m` | Avoid Mode (30m) | ✅ `assets/icons/hourglass.png` | `user-data/behavioral-rules.json`, `RewardPanel.tsx` | Hourglass / Sand timer |
| `avoid_15m` | Quick Pass (15m) | ✅ `assets/icons/lightning.png` | `user-data/behavioral-rules.json`, `RewardPanel.tsx` | Lightning bolt / Quick pass spark |
| `unblock_site` | Unblock Site | ✅ `assets/icons/unblock.png` | `user-data/behavioral-rules.json`, `RewardPanel.tsx` | Open padlock / Unblock |
| `reward-fallback` | Default Reward Icon | `🎁` (Emoji) | `src/components/panels/RewardPanel.tsx` | Gift box with ribbon |
| `timer-icon` | Reward Countdown Timer | ✅ `assets/icons/hourglass.png` | `src/components/panels/RewardPanel.tsx` | Hourglass / Sand timer |
| `star-icon` | Victory Header Star | ✅ `assets/icons/star.png` | `src/components/panels/RewardPanel.tsx` | Pixel Star badge |

---

## 5. Panel Empty States & UI Badges
Icons shown when lists or logs are empty, or in challenge prompts.

| Component | Element / Purpose | Current Icon | File Location | Suggested Icon Theme / Description |
| :--- | :--- | :---: | :--- | :--- |
| `DebugPanel.tsx` | Empty Logs State | `''` (Missing) | `src/components/panels/DebugPanel.tsx` | Sleeping terminal or empty scroll |
| `MonitoringPanel.tsx` | Empty Search / Filter State | `🔍` (Emoji) | `src/components/panels/MonitoringPanel.tsx` | Pixel magnifying glass |
| `ActionPrompt.tsx` | Challenge Dialog Header | `None` | `src/components/action-prompt/ActionPrompt.tsx` | Alert exclamation badge / Pixel swords |

---

## 6. Existing Asset Icons in Codebase (`assets/` & `web/`)
These icons already exist as image files and are used across the companion desktop app and landing page:

| File Path | Dimensions | Usage | Description |
| :--- | :--- | :--- | :--- |
| `assets/icons/status.png` | PNG | `src/components/menu-bar.ts`, `StatusPanel.tsx` | Status menu item & panel header icon |
| `assets/icons/puzzles.png` | PNG | `src/components/menu-bar.ts`, `PuzzlesPanel.tsx` | Puzzles menu item & panel header icon |
| `assets/icons/monitoring.png` | PNG | `src/components/menu-bar.ts`, `MonitoringPanel.tsx` | Monitoring menu item & panel header icon |
| `assets/icons/debug.png` | PNG | `src/components/menu-bar.ts`, `DebugPanel.tsx` | Debug menu item & panel header icon |
| `assets/icons/star.png` | PNG | `src/components/menu-bar.ts`, `RewardPanel.tsx` | Victory reward star icon |
| `assets/icons/keyboard.png` | PNG | `TypingPuzzle.tsx`, `PuzzlesPanel.tsx` | Speed Typer game icon |
| `assets/icons/snake.png` | PNG | `SnakePuzzle.tsx`, `PuzzlesPanel.tsx` | Retro Snake game icon |
| `assets/icons/unblock.png` | PNG | `RewardPanel.tsx`, `behavioral-rules.json` | Unblock site reward icon |
| `assets/icons/hourglass.png` | PNG | `RewardPanel.tsx`, `behavioral-rules.json` | Avoid mode & countdown timer icon |
| `assets/icons/lightning.png` | PNG | `RewardPanel.tsx`, `behavioral-rules.json` | Quick pass reward icon |
| `assets/icons/cardbg.png` | PNG | `MatchingPuzzle.tsx` | Memory card back face background art |
| `assets/brain.png` | PNG | `web/pages/HomePage.tsx`, `BlogPage.tsx` | Intelligence feature icon |
| `assets/eyes.png` | PNG | `web/pages/HomePage.tsx`, `BlogPage.tsx` | Monitoring feature icon |
| `assets/mouth.png` | PNG | `web/pages/HomePage.tsx`, `BlogPage.tsx` | Speech feature icon |
| `assets/heart.png` | PNG | `web/pages/HomePage.tsx`, `BlogPage.tsx` | Emotion feature icon |
| `assets/logo.png` | PNG | App window, Favicon, Branding | CHLEO companion logo |

---

## Recommended Drawing Specifications

If you are drawing custom pixel art icons for CHLEO:
- **Resolution**:
  - **Menu Bar Icons**: `16x16` or `24x24` pixels (PNG with transparent background).
  - **Panel Header / Card Icons**: `24x24` or `32x32` pixels.
  - **Reward Cards & Big Badges**: `32x32` or `48x48` pixels.
- **Color Palette**: Retro pixel art aesthetic matching CHLEO's palette (warm yellows `#fef08a`, retro green `#4ade80`, cyan `#38bdf8`, dark border `#1a1a24`).
- **File Format**: `.png` (recommended) or `.svg`.
- **Target Asset Folder**: Save drawn files to `src/assets/icons/` (and `assets/icons/`).
