import React from 'react';
import { CalendarPanel } from './CalendarPanel';
import { FridgePanel } from './FridgePanel';
import { StoragePanel } from './StoragePanel';
import { ClosetPanel } from './ClosetPanel';
import { StatusPanel } from './StatusPanel';
import { MarketplacePanel } from './MarketplacePanel';
import { ConfigPanel } from './ConfigPanel';
import { DebugPanel } from './DebugPanel';
import { MonitoringPanel } from './MonitoringPanel';
import { PuzzlesPanel } from './PuzzlesPanel';
import { RewardPanel } from './RewardPanel'; // <-- [DEV PREVIEW: delete when done]

export interface PanelHostProps {
  activeOptionId: string | null;
  onClose: () => void;
  onSelectPuzzle?: (puzzleId: 'snake' | 'chess' | 'sudoku') => void;
}

export const PanelHost: React.FC<PanelHostProps> = ({
  activeOptionId,
  onClose,
  onSelectPuzzle,
}) => {
  if (!activeOptionId) return null;

  switch (activeOptionId) {
    case 'reward': // <-- [DEV PREVIEW: delete when done]
    case 'rewards':
      return (
        <RewardPanel
          rewards={[]}
          targetDomain="sample-domain.com"
          onClose={onClose}
          onSelectReward={(reward) => {
            console.log('[RewardPanel Preview] Picked reward:', reward);
            onClose();
          }}
        />
      );
    case 'puzzle':
    case 'puzzles':
      return <PuzzlesPanel onClose={onClose} onSelectPuzzle={onSelectPuzzle} />;
    case 'calendar':
      return <CalendarPanel onClose={onClose} />;
    case 'fridge':
      return <FridgePanel onClose={onClose} />;
    case 'storage':
      return <StoragePanel onClose={onClose} />;
    case 'closet':
      return <ClosetPanel onClose={onClose} />;
    case 'status':
      return <StatusPanel onClose={onClose} />;
    case 'monitoring':
      return <MonitoringPanel onClose={onClose} />;
    case 'marketplace':
      return <MarketplacePanel onClose={onClose} />;
    case 'config':
      return <ConfigPanel onClose={onClose} />;
    case 'debug':
      return <DebugPanel onClose={onClose} />;
    default:
      return null;
  }
};
