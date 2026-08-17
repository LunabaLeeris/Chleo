import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';
import { getRandomWord } from './typing-words';

/**
 * Visual Color Theme for Typing Puzzle.
 * Easily customized for different styling or themes.
 */
export const TYPING_THEME = {
  boardBackground: '#0c0c0c',
  boardBorder: '#38384a',
  textColor: '#ffffff',
  correctChar: '#4ade80',         // Retro Green for correct letters
  wrongChar: '#ef4444',           // Bright Red for mistyped letters
  remainingChar: '#64748b',       // Muted slate for remaining target letters
  cursorColor: '#38bdf8',         // Cyan pulsing typing caret
  prevRowColor: 'rgba(255, 255, 255, 0.35)',
  nextRowColor: 'rgba(255, 255, 255, 0.45)',
  capsLockColor: '#f59e0b',       // Amber warning color
  capsLockBg: 'rgba(245, 158, 11, 0.15)',
  timerNormal: '#fef08a',         // Yellow
  timerUrgent: '#ef4444',         // Red under 10 seconds
} as const;

/**
 * Configurable Game Settings for Typing Puzzle.
 * Adjust font sizes, future word count, timer, and board dimensions here.
 */
export const TYPING_SETTINGS = {
  timeLimitSeconds: 30,           // 30 second timer for both sandbox & challenge
  scorePerWord: 10,               // Points awarded per correctly typed word
  targetScore: 50,                // Target score for challenge completion
  boardWidth: 300,                // Width matching Snake puzzle canvas
  boardHeight: 350,               // Height for comfortable 3-row / multi-row layout
  urgentTimerThreshold: 10,       // Seconds remaining when timer turns red/urgent

  // Amount of upcoming texts/words we can see in the future
  futureWordsCount: 2,            // How many upcoming words to preview below the current word

  // Font size settings (easily customized)
  currentWordFontSize: '2.35rem', // Font size for active middle word
  prevWordFontSize: '1.25rem',    // Font size for previously typed word
  futureWordFontSize: '1.25rem',  // Font size for upcoming future words
  rowGap: '12px',                 // Vertical spacing between word rows
} as const;

export const TYPING_CONFIG: PuzzleConfig = {
  id: 'typing',
  name: 'Speed Typer',
  icon: 'keyboard',
  targetGoalScore: TYPING_SETTINGS.targetScore,
  goalDescription: 'Type words accurately and beat the high score before time runs out',
  instructions: 'Type the middle word. Press Space to finalize, Backspace to delete.',
};

type GameState = 'idle' | 'playing' | 'gameover' | 'won';

export interface TypingPuzzleProps extends PuzzleComponentProps {
  timeLimitSeconds?: number;
  scorePerWord?: number;
  targetScore?: number;
  futureWordsCount?: number;
  currentWordFontSize?: string;
  prevWordFontSize?: string;
  futureWordFontSize?: string;
  rowGap?: string;
}

export const TypingPuzzle: React.FC<TypingPuzzleProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
  onHighScoreBeaten,
  initialHighScore,
  timeLimitSeconds = TYPING_SETTINGS.timeLimitSeconds,
  scorePerWord = TYPING_SETTINGS.scorePerWord,
  targetScore = TYPING_SETTINGS.targetScore,
  futureWordsCount = TYPING_SETTINGS.futureWordsCount,
  currentWordFontSize = TYPING_SETTINGS.currentWordFontSize,
  prevWordFontSize = TYPING_SETTINGS.prevWordFontSize,
  futureWordFontSize = TYPING_SETTINGS.futureWordFontSize,
  rowGap = TYPING_SETTINGS.rowGap,
}) => {
  // Game states
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(initialHighScore ?? 40);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimitSeconds);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);

  // Words State (Previous word, Current active word, and Array of Future preview words)
  const [prevWord, setPrevWord] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<string>('cleo');
  const [futureWords, setFutureWords] = useState<string[]>([]);

  // Active typed input buffer
  const [typedInput, setTypedInput] = useState<string>('');

  // Refs for state tracking inside timer and handlers
  const highScoreRef = useRef<number>(initialHighScore ?? 40);
  const sessionStartHighScoreRef = useRef<number>(initialHighScore ?? 40);
  const scoreRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load high score from puzzle-data.json on mount
  useEffect(() => {
    let isMounted = true;
    const loadHighScore = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
          const raw = await (window as any).electronAPI.readMemoryFile('puzzle-data.json');
          if (raw && isMounted) {
            const parsed = JSON.parse(raw);
            if (parsed?.typing?.highScore !== undefined && typeof parsed.typing.highScore === 'number') {
              setHighScore(parsed.typing.highScore);
              highScoreRef.current = parsed.typing.highScore;
              sessionStartHighScoreRef.current = parsed.typing.highScore;
            }
          }
        }
      } catch (e) {
        console.warn('[TypingPuzzle] Failed to load high score from puzzle-data.json:', e);
      }
    };
    loadHighScore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize word set with configured future words count
  const initWords = useCallback(() => {
    const first = getRandomWord();
    const futureList: string[] = [];
    let last = first;
    for (let i = 0; i < futureWordsCount; i++) {
      const next = getRandomWord(last);
      futureList.push(next);
      last = next;
    }
    setPrevWord('');
    setCurrentWord(first);
    setFutureWords(futureList);
    setTypedInput('');
  }, [futureWordsCount]);

  // Reset/Initialize game
  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    initWords();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(timeLimitSeconds);
    setGameState('idle');
    setTypedInput('');
  }, [initWords, timeLimitSeconds]);

  // Initial setup
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Countdown timer when playing
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;

          const currentScore = scoreRef.current;
          const initialBench = sessionStartHighScoreRef.current;
          const isChallenge = Boolean(targetDomain);

          if (isChallenge && targetScore && currentScore >= targetScore) {
            setGameState('won');
            onSuccess(currentScore);
          } else if (currentScore > initialBench) {
            setGameState('won');
            if (isChallenge) {
              onSuccess(currentScore);
            }
          } else {
            setGameState('gameover');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, targetDomain, targetScore, onSuccess]);

  // Keyboard Event Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check CapsLock modifier
      setCapsLockActive(e.getModifierState('CapsLock'));

      // If game is over or won, allow Space/Enter to restart
      if (gameState === 'gameover' || gameState === 'won') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          resetGame();
        }
        return;
      }

      // Ignore special modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
        return;
      }

      // Start game on first character typed if idle
      if (gameState === 'idle') {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setGameState('playing');
        } else {
          return;
        }
      }

      // Backspace handling
      if (e.key === 'Backspace') {
        e.preventDefault();
        setTypedInput((prev) => prev.slice(0, -1));
        return;
      }

      // Space or Enter: finalize the word
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!typedInput.trim()) return;

        const isExactMatch = typedInput.trim().toLowerCase() === currentWord.toLowerCase();
        if (isExactMatch) {
          // Word correctly typed!
          const newScore = scoreRef.current + scorePerWord;
          scoreRef.current = newScore;
          setScore(newScore);

          // Check High Score
          if (newScore > highScoreRef.current) {
            highScoreRef.current = newScore;
            setHighScore(newScore);
            onHighScoreBeaten?.('typing', newScore);
          }

          // Advance queue:
          // prevWord = currentWord
          // currentWord = futureWords[0]
          // futureWords = [...futureWords.slice(1), getRandomWord(...)]
          setPrevWord(currentWord);
          const nextActive = futureWords[0] || getRandomWord(currentWord);
          setCurrentWord(nextActive);

          const remainingFuture = futureWords.slice(1);
          const lastInList = remainingFuture[remainingFuture.length - 1] || nextActive;
          const newUpcomingWord = getRandomWord(lastInList);
          setFutureWords([...remainingFuture, newUpcomingWord]);
          setTypedInput('');

          // Challenge win check
          const isChallenge = Boolean(targetDomain);
          if (isChallenge && targetScore && newScore >= targetScore) {
            setGameState('won');
            onSuccess(newScore);
          }
        } else {
          // Mistyped word: allow player to correct via backspace
        }
        return;
      }

      // Single printable character typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const char = e.key.toLowerCase();
        setTypedInput((prev) => prev + char);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setCapsLockActive(e.getModifierState('CapsLock'));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, currentWord, futureWords, typedInput, scorePerWord, targetDomain, targetScore, onSuccess, onHighScoreBeaten, resetGame]);

  const isChallenge = Boolean(targetDomain);
  const isUrgentTimer = timeLeft <= TYPING_SETTINGS.urgentTimerThreshold;

  // Render character by character color reflection for current middle word
  const renderCurrentWordChars = () => {
    const targetChars = currentWord.split('');
    const typedChars = typedInput.split('');

    return (
      <span className="typing-word-chars">
        {targetChars.map((char, idx) => {
          const charStyle: React.CSSProperties = {
            color: TYPING_THEME.remainingChar,
            transition: 'color 0.08s ease',
          };
          const isCurrentCursor = idx === typedChars.length;

          if (idx < typedChars.length) {
            const isCorrect = typedChars[idx] === char;
            charStyle.color = isCorrect ? TYPING_THEME.correctChar : TYPING_THEME.wrongChar;
            if (!isCorrect) {
              charStyle.textDecoration = 'underline';
            }
          }

          return (
            <span
              key={idx}
              className={`typing-char ${isCurrentCursor ? 'typing-char-cursor' : ''}`}
              style={charStyle}
            >
              {char}
            </span>
          );
        })}
        {/* Render any overflow characters typed beyond target length */}
        {typedChars.length > targetChars.length && (
          <span
            className="typing-char-overflow"
            style={{ color: TYPING_THEME.wrongChar, textDecoration: 'line-through' }}
          >
            {typedInput.slice(targetChars.length)}
          </span>
        )}
      </span>
    );
  };

  return (
    <PuzzleContainer
      config={TYPING_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="typing-game-wrapper" ref={containerRef}>
        {/* Central Display Board */}
        <div
          className="typing-board"
          style={{
            width: TYPING_SETTINGS.boardWidth,
            minHeight: TYPING_SETTINGS.boardHeight,
            backgroundColor: TYPING_THEME.boardBackground,
            borderColor: TYPING_THEME.boardBorder,
          }}
        >
          {/* Top In-Game HUD: Score, Timer & Best */}
          <div className="typing-in-game-hud">
            <span className="typing-hud-chip score-chip">
              SCORE: <span className="hud-val">{isChallenge && targetScore ? `${score}/${targetScore}` : score}</span>
            </span>

            {/* 30s Countdown Timer */}
            <span
              className={`typing-hud-chip timer-chip ${isUrgentTimer ? 'urgent' : ''}`}
              style={{ color: isUrgentTimer ? TYPING_THEME.timerUrgent : TYPING_THEME.timerNormal }}
            >
              TIME: <span className="hud-val">{timeLeft}s</span>
            </span>

            <span className="typing-hud-chip best-chip">
              BEST: <span className="hud-val">{highScore}</span>
            </span>
          </div>

          {/* Caps Lock Warning Banner */}
          {capsLockActive && (
            <div
              className="typing-capslock-pill"
              style={{
                color: TYPING_THEME.capsLockColor,
                backgroundColor: TYPING_THEME.capsLockBg,
                borderColor: TYPING_THEME.capsLockColor,
              }}
            >
              ⚠️ CAPS LOCK IS ON
            </div>
          )}

          {/* Dynamic Multi-Row Seamless Typing Container */}
          <div className="typing-rows-container" style={{ gap: rowGap }}>
            {/* Row 1: Previous Word Typed */}
            <div
              className="typing-row typing-row-prev"
              style={{
                color: TYPING_THEME.prevRowColor,
                fontSize: prevWordFontSize,
              }}
            >
              {prevWord || '\u00A0'}
            </div>

            {/* Row 2: Current Active Word */}
            <div
              className="typing-row typing-row-current"
              style={{ fontSize: currentWordFontSize }}
            >
              {renderCurrentWordChars()}
            </div>

            {/* Future Rows: Upcoming Preview Words */}
            {futureWords.map((word, idx) => {
              const opacity = Math.max(0.18, 0.45 - idx * 0.14);
              const blurAmount = idx * 0.3;
              return (
                <div
                  key={idx}
                  className="typing-row typing-row-future"
                  style={{
                    color: TYPING_THEME.nextRowColor,
                    fontSize: futureWordFontSize,
                    opacity,
                    filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
                  }}
                >
                  {word || '\u00A0'}
                </div>
              );
            })}
          </div>

          {/* Idle Start Overlay */}
          {gameState === 'idle' && (
            <div className="typing-overlay">
              <span className="typing-prompt-title">SPEED TYPER</span>
              <span className="typing-prompt-hint">Type anything to start</span>
              <span className="typing-sub-hint">Press [Space] to finalize words</span>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="typing-overlay">
              <span className="typing-prompt-title" style={{ color: TYPING_THEME.wrongChar }}>
                TIME UP!
              </span>
              <span className="typing-prompt-hint">
                Score: {score} pts {score <= sessionStartHighScoreRef.current ? `(Best: ${highScore})` : ''}
              </span>
              <button type="button" className="typing-restart-btn" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}

          {/* Win / Success Overlay */}
          {gameState === 'won' && (
            <div className="typing-overlay">
              <span className="typing-prompt-title" style={{ color: TYPING_THEME.correctChar }}>
                {isChallenge ? 'GOAL ACHIEVED!' : 'HIGH SCORE BEATEN!'}
              </span>
              <span className="typing-prompt-hint">Final Score: {score} pts</span>
              <button type="button" className="typing-restart-btn" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </PuzzleContainer>
  );
};
