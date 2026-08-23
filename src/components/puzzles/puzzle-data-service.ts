export interface PuzzleRecord {
  highScore: number;
  totalTimeSeconds: number;
  [key: string]: any;
}

export type PuzzleDataMap = Record<string, PuzzleRecord>;

export const normalizePuzzleId = (id: string): string => {
  const clean = id.toLowerCase().trim();
  if (clean === 'memory') return 'matching';
  return clean;
};

export const DEFAULT_PUZZLE_DATA: PuzzleDataMap = {
  matching: { highScore: 60, totalTimeSeconds: 0 },
  typing: { highScore: 40, totalTimeSeconds: 0 },
  snake: { highScore: 40, totalTimeSeconds: 0 },
  chess: { highScore: 100, totalTimeSeconds: 0 },
  sudoku: { highScore: 80, totalTimeSeconds: 0 },
};

/**
 * Loads puzzle-data.json via electronAPI if available.
 */
export async function loadPuzzleData(): Promise<PuzzleDataMap> {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
      const raw = await (window as any).electronAPI.readMemoryFile('puzzle-data.json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const result: PuzzleDataMap = {};
          for (const [key, val] of Object.entries(parsed)) {
            if (val && typeof val === 'object') {
              const record = val as Record<string, any>;
              const highScore = typeof record.highScore === 'number' ? record.highScore : 0;
              const totalTimeSeconds =
                typeof record.totalTimeSeconds === 'number'
                  ? record.totalTimeSeconds
                  : typeof record.timeSpentSeconds === 'number'
                  ? record.timeSpentSeconds
                  : typeof record.timePlayedSeconds === 'number'
                  ? record.timePlayedSeconds
                  : 0;

              result[normalizePuzzleId(key)] = {
                ...record,
                highScore,
                totalTimeSeconds,
              };
            }
          }
          return result;
        }
      }
    }
  } catch (e) {
    console.warn('[puzzle-data-service] Failed to load puzzle data:', e);
  }
  return { ...DEFAULT_PUZZLE_DATA };
}

/**
 * Saves puzzle data to puzzle-data.json via electronAPI.
 */
export async function savePuzzleData(data: PuzzleDataMap): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveMemoryFile) {
      const success = await (window as any).electronAPI.saveMemoryFile(
        'puzzle-data.json',
        JSON.stringify(data, null, 2)
      );
      return Boolean(success);
    }
  } catch (e) {
    console.warn('[puzzle-data-service] Failed to save puzzle data:', e);
  }
  return false;
}

let updateQueue: Promise<any> = Promise.resolve();

/**
 * Enqueues an atomic read-modify-write operation on puzzle data.
 */
export function enqueuePuzzleUpdate(
  updater: (data: PuzzleDataMap) => void | Promise<void>
): Promise<boolean> {
  const nextTask = updateQueue.then(async () => {
    try {
      const data = await loadPuzzleData();
      await updater(data);
      return await savePuzzleData(data);
    } catch (e) {
      console.warn('[puzzle-data-service] Update task failed:', e);
      return false;
    }
  });

  updateQueue = nextTask.catch(() => false);
  return nextTask;
}

/**
 * Increment total time spent playing a puzzle.
 */
export async function addPuzzleTimeSpent(puzzleId: string, secondsToAdd: number): Promise<boolean> {
  if (secondsToAdd <= 0) return true;
  const normId = normalizePuzzleId(puzzleId);

  return enqueuePuzzleUpdate((data) => {
    const existing = data[normId] || {
      highScore: DEFAULT_PUZZLE_DATA[normId]?.highScore ?? 0,
      totalTimeSeconds: 0,
    };
    data[normId] = {
      ...existing,
      totalTimeSeconds: (existing.totalTimeSeconds || 0) + secondsToAdd,
    };
  });
}

/**
 * Update high score for a puzzle.
 */
export async function updatePuzzleHighScore(puzzleId: string, newHighScore: number): Promise<boolean> {
  const normId = normalizePuzzleId(puzzleId);

  return enqueuePuzzleUpdate((data) => {
    const existing = data[normId] || {
      highScore: 0,
      totalTimeSeconds: 0,
    };
    data[normId] = {
      ...existing,
      highScore: Math.max(existing.highScore || 0, newHighScore),
    };
  });
}

/**
 * Formats a duration in seconds into a clean human-readable string.
 * Examples:
 * - 0 -> '0m'
 * - 45 -> '45s'
 * - 60 -> '1m'
 * - 75 -> '1m 15s'
 * - 3600 -> '1h'
 * - 3665 -> '1h 1m'
 */
export function formatPuzzleTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return '0m';
  }
  if (totalSeconds < 60) {
    return `${Math.floor(totalSeconds)}s`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
