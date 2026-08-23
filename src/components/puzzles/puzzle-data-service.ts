export interface PuzzleRecord {
  highScore?: number;
  totalTimeSeconds?: number;
  [key: string]: any;
}

export type PuzzleDataMap = Record<string, PuzzleRecord>;

export const normalizePuzzleId = (id: string): string => {
  const clean = id.toLowerCase().trim();
  if (clean === 'memory') return 'matching';
  return clean;
};

/**
 * Loads puzzle-data.json via electronAPI if available.
 * Returns empty record map if no data is found rather than fabricated default values.
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
              const highScore = typeof record.highScore === 'number' ? record.highScore : undefined;
              const totalTimeSeconds =
                typeof record.totalTimeSeconds === 'number'
                  ? record.totalTimeSeconds
                  : typeof record.timeSpentSeconds === 'number'
                    ? record.timeSpentSeconds
                    : typeof record.timePlayedSeconds === 'number'
                      ? record.timePlayedSeconds
                      : undefined;

              result[normalizePuzzleId(key)] = {
                ...record,
                ...(highScore !== undefined ? { highScore } : {}),
                ...(totalTimeSeconds !== undefined ? { totalTimeSeconds } : {}),
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
  return {};
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
 * If record is missing (n/a), fails safely with a debug error without crashing.
 */
export async function addPuzzleTimeSpent(puzzleId: string, secondsToAdd: number): Promise<boolean> {
  if (secondsToAdd <= 0) return true;
  const normId = normalizePuzzleId(puzzleId);

  return enqueuePuzzleUpdate((data) => {
    const existing = data[normId];
    if (!existing) {
      console.error(
        `[puzzle-data-service] Write error: Cannot add time spent for puzzle "${puzzleId}" because record is missing / n/a.`
      );
      return;
    }
    const currentSeconds = existing.totalTimeSeconds;
    if (currentSeconds === undefined || currentSeconds === null) {
      console.error(
        `[puzzle-data-service] Write error: Cannot add time spent for puzzle "${puzzleId}" because totalTimeSeconds is n/a.`
      );
      return;
    }
    data[normId] = {
      ...existing,
      totalTimeSeconds: currentSeconds + secondsToAdd,
    };
  });
}

/**
 * Update high score for a puzzle.
 * If record is missing (n/a), fails safely with a debug error without crashing.
 */
export async function updatePuzzleHighScore(puzzleId: string, newHighScore: number): Promise<boolean> {
  const normId = normalizePuzzleId(puzzleId);

  return enqueuePuzzleUpdate((data) => {
    const existing = data[normId];
    if (!existing) {
      console.error(
        `[puzzle-data-service] Write error: Cannot update high score for puzzle "${puzzleId}" because record is missing / n/a.`
      );
      return;
    }
    const currentHighScore = existing.highScore;
    if (currentHighScore === undefined || currentHighScore === null) {
      console.error(
        `[puzzle-data-service] Write error: Cannot update high score for puzzle "${puzzleId}" because highScore is n/a.`
      );
      return;
    }
    data[normId] = {
      ...existing,
      highScore: Math.max(currentHighScore, newHighScore),
    };
  });
}

/**
 * Formats a duration in seconds into a clean human-readable string.
 * Returns 'n/a' when totalSeconds is undefined, null, negative, or not loaded.
 */
export function formatPuzzleTime(totalSeconds: number | undefined | null): string {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) {
    return 'n/a';
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
