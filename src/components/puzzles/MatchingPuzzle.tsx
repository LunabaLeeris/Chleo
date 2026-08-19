import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';
import { getIconSrc } from '../../assets/icon-loader';
import CARDBG_IMG from '../../assets/icons/cardbg.png';

/**
 * Visual Color Theme for Matching Puzzle.
 * Easily customized for different styling or themes.
 */
export const MATCHING_THEME = {
  boardBackground: '#0c0c0c',
  boardBorder: '#38384a',
  cardBackBackground: '#000000',
  cardBackBorder: '#38384a',
  cardFrontBackground: '#ffffffff',
  cardFrontBorder: '#38384a',
  textColor: '#ffffff',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  timerNormal: '#fef08a',
  timerUrgent: '#ef4444',
  timerPreview: '#38bdf8',
} as const;

/**
 * Configurable Game Settings for Matching Puzzle.
 * Adjust pair count, grid columns, icon size, preview duration, timer, and card dimensions here.
 */
export const MATCHING_SETTINGS = {
  pairCount: 10,                 // Number of pairs (N) => total 2 * N cards (e.g. 6 pairs = 12 cards)
  columns: 5,                   // Number of columns in grid layout
  iconSize: 40,                 // Configurable icon size in pixels
  initialRevealSeconds: 3,      // S seconds cards are shown face up at start before turning face down
  timeLimitSeconds: 45,         // Countdown timer limit in seconds
  urgentTimerThreshold: 10,     // Seconds remaining when timer turns urgent/red
  scorePerMatch: 10,            // Points awarded per matched pair
  targetScore: 60,              // Target score for challenge completion (pairCount * scorePerMatch)
  mismatchDelayMs: 750,         // Delay (ms) before mismatched cards flip back down
  cardWidth: 65,                // Card width in pixels
  cardHeight: 90,               // Card height in pixels
  cardBackImage: CARDBG_IMG,    // Entire background image for the card back with no border
} as const;

export const MATCHING_CONFIG: PuzzleConfig = {
  id: 'matching',
  name: 'Memory Match',
  icon: 'matching',
  targetGoalScore: MATCHING_SETTINGS.targetScore,
  goalDescription: 'Match all pairs of pixel icons before time runs out',
  instructions: 'Memorize the cards during preview, then click to find pairs.',
};

export const AVAILABLE_CARD_ICONS = [
  'star',
  'snake',
  'keyboard',
  'hourglass',
  'lightning',
  'unblock',
  'puzzles',
  'status',
  'monitoring',
  'debug',
] as const;

export interface CardItem {
  id: string;
  iconKey: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export type MatchingGameState = 'preview' | 'playing' | 'won' | 'gameover';

export interface MatchingPuzzleProps extends PuzzleComponentProps {
  pairCount?: number;
  columns?: number;
  iconSize?: number;
  initialRevealSeconds?: number;
  timeLimitSeconds?: number;
  scorePerMatch?: number;
  targetScore?: number;
  mismatchDelayMs?: number;
  cardBackImage?: string;
}

function createShuffledDeck(pairCount: number): CardItem[] {
  const shuffledIcons = [...AVAILABLE_CARD_ICONS].sort(() => Math.random() - 0.5);
  const selectedIcons: string[] = [];
  for (let i = 0; i < pairCount; i++) {
    selectedIcons.push(shuffledIcons[i % shuffledIcons.length]);
  }

  const deck: CardItem[] = [];
  selectedIcons.forEach((iconKey, index) => {
    deck.push({
      id: `${iconKey}_a_${index}_${Math.random().toString(36).substring(2, 6)}`,
      iconKey,
      isFlipped: true, // Face-up during preview
      isMatched: false,
    });
    deck.push({
      id: `${iconKey}_b_${index}_${Math.random().toString(36).substring(2, 6)}`,
      iconKey,
      isFlipped: true, // Face-up during preview
      isMatched: false,
    });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export const MatchingPuzzle: React.FC<MatchingPuzzleProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
  onHighScoreBeaten,
  initialHighScore,
  pairCount = MATCHING_SETTINGS.pairCount,
  columns = MATCHING_SETTINGS.columns,
  iconSize = MATCHING_SETTINGS.iconSize,
  initialRevealSeconds = MATCHING_SETTINGS.initialRevealSeconds,
  timeLimitSeconds = MATCHING_SETTINGS.timeLimitSeconds,
  scorePerMatch = MATCHING_SETTINGS.scorePerMatch,
  targetScore = MATCHING_SETTINGS.targetScore,
  mismatchDelayMs = MATCHING_SETTINGS.mismatchDelayMs,
  cardBackImage = MATCHING_SETTINGS.cardBackImage,
}) => {
  // Game states
  const [gameState, setGameState] = useState<MatchingGameState>('preview');
  const [cards, setCards] = useState<CardItem[]>(() => createShuffledDeck(pairCount));
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [matchesFound, setMatchesFound] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(initialHighScore ?? 60);
  const [previewTimeLeft, setPreviewTimeLeft] = useState<number>(initialRevealSeconds);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimitSeconds);

  // Refs for timer and handler access
  const scoreRef = useRef<number>(0);
  const matchesFoundRef = useRef<number>(0);
  const highScoreRef = useRef<number>(initialHighScore ?? 60);

  // Load high score from puzzle-data.json on mount
  useEffect(() => {
    let isMounted = true;
    const loadHighScore = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
          const raw = await (window as any).electronAPI.readMemoryFile('puzzle-data.json');
          if (raw && isMounted) {
            const parsed = JSON.parse(raw);
            if (parsed?.matching?.highScore !== undefined && typeof parsed.matching.highScore === 'number') {
              setHighScore(parsed.matching.highScore);
              highScoreRef.current = parsed.matching.highScore;
            }
          }
        }
      } catch (e) {
        console.warn('[MatchingPuzzle] Failed to load high score from puzzle-data.json:', e);
      }
    };
    loadHighScore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset / Start a fresh game
  const resetGame = useCallback(() => {
    const newDeck = createShuffledDeck(pairCount);
    setCards(newDeck);
    setGameState('preview');
    setPreviewTimeLeft(initialRevealSeconds);
    setTimeLeft(timeLimitSeconds);
    setScore(0);
    scoreRef.current = 0;
    setMatchesFound(0);
    matchesFoundRef.current = 0;
    setFlippedCardIds([]);
    setIsBusy(false);
  }, [pairCount, initialRevealSeconds, timeLimitSeconds]);

  // Phase 1: Preview countdown timer (S seconds faceup)
  useEffect(() => {
    if (gameState !== 'preview') return;

    if (previewTimeLeft <= 0) {
      // Turn all cards faced down and transition to playing phase
      setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      setGameState('playing');
      return;
    }

    const timer = setInterval(() => {
      setPreviewTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCards((cardsPrev) => cardsPrev.map((c) => ({ ...c, isFlipped: false })));
          setGameState('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, previewTimeLeft]);

  // Phase 2: Playing countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Card click handler
  const handleCardClick = (cardId: string) => {
    if (gameState !== 'playing' || isBusy) return;

    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard || targetCard.isMatched || targetCard.isFlipped) return;

    // Flip the clicked card faceup
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCardIds, cardId];
    setFlippedCardIds(newFlipped);

    if (newFlipped.length === 2) {
      setIsBusy(true);
      const [firstId, secondId] = newFlipped;
      const firstCard = updatedCards.find((c) => c.id === firstId);
      const secondCard = updatedCards.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.iconKey === secondCard.iconKey) {
        // MATCH FOUND!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          );
          setFlippedCardIds([]);
          setIsBusy(false);

          const newScore = scoreRef.current + scorePerMatch;
          scoreRef.current = newScore;
          setScore(newScore);

          const newMatches = matchesFoundRef.current + 1;
          matchesFoundRef.current = newMatches;
          setMatchesFound(newMatches);

          // Beaten High Score Check
          if (newScore > highScoreRef.current) {
            highScoreRef.current = newScore;
            setHighScore(newScore);
            onHighScoreBeaten?.('matching', newScore);
          }

          // Check if all pairs are matched (Win Condition)
          if (newMatches >= pairCount) {
            setGameState('won');
            const isChallenge = Boolean(targetDomain);
            if (isChallenge) {
              // Trigger challenge success
              onSuccess(newScore);
            }
          }
        }, 280);
      } else {
        // MISMATCH -> Flip both back face down
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCardIds([]);
          setIsBusy(false);
        }, mismatchDelayMs);
      }
    }
  };

  const isChallenge = Boolean(targetDomain);
  const isUrgentTimer = timeLeft <= MATCHING_SETTINGS.urgentTimerThreshold;

  return (
    <PuzzleContainer
      config={MATCHING_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="matching-game-wrapper">
        {/* Main Board Container */}
        <div
          className="matching-board"
          style={{
            backgroundColor: MATCHING_THEME.boardBackground,
            borderColor: MATCHING_THEME.boardBorder,
          }}
        >
          {/* In-Game Top HUD */}
          <div className="matching-in-game-hud">
            {/* Matches counter / preview status */}
            <div className="matching-hud-chip">
              {gameState === 'preview' ? (
                <span style={{ color: MATCHING_THEME.timerPreview }}>
                  Memorize: {previewTimeLeft}s
                </span>
              ) : (
                <span>
                  Pairs: <span className="hud-val">{matchesFound}/{pairCount}</span>
                </span>
              )}
            </div>

            {/* Countdown timer */}
            <div className={`matching-hud-chip timer-chip ${isUrgentTimer && gameState === 'playing' ? 'urgent' : ''}`}>
              <span className="hud-label"></span>
              <span className="hud-val">{timeLeft}s</span>
            </div>

            {/* Score & Best */}
            <div className="matching-hud-chip">
              <span>Score: <span className="hud-val">{score}</span></span>
            </div>

            <div className="matching-hud-chip">
              <span>Best: <span className="hud-val">{highScore}</span></span>
            </div>
          </div>

          {/* Cards Grid */}
          <div
            className="matching-grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
          >
            {cards.map((card) => {
              const iconSrc = getIconSrc(card.iconKey);
              const isFaceUp = card.isFlipped || card.isMatched;

              return (
                <div
                  key={card.id}
                  className={`matching-card ${isFaceUp ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                  style={{
                    width: `${MATCHING_SETTINGS.cardWidth}px`,
                    height: `${MATCHING_SETTINGS.cardHeight}px`,
                  }}
                  onClick={() => handleCardClick(card.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(card.id);
                    }
                  }}
                >
                  <div className="matching-card-inner">
                    {/* Back Face (when hidden / face-down) */}
                    <div
                      className="matching-card-face matching-card-back"
                      style={{
                        backgroundImage: `url(${cardBackImage || CARDBG_IMG})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'border-box',
                        border: `2px solid ${MATCHING_THEME.cardBackBorder}`,
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Front Face (when revealed / face-up) */}
                    <div
                      className="matching-card-face matching-card-front"
                      style={{
                        backgroundColor: MATCHING_THEME.cardFrontBackground,
                        borderColor: MATCHING_THEME.cardFrontBorder,
                      }}
                    >
                      {/* Top row — small icon, left-aligned */}
                      <div className="matching-card-pip matching-card-pip-top">
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt=""
                            aria-hidden="true"
                            className="matching-card-pip-img"
                          />
                        ) : (
                          <span className="matching-card-icon-fallback matching-card-pip-text">
                            {card.iconKey.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Middle row — large icon, centered */}
                      <div className="matching-card-center">
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt={card.iconKey}
                            className="matching-card-icon-img"
                            style={{
                              width: `${iconSize}px`,
                              height: `${iconSize}px`,
                            }}
                          />
                        ) : (
                          <span
                            className="matching-card-icon-fallback"
                            style={{ fontSize: `${Math.round(iconSize * 0.45)}px` }}
                          >
                            {card.iconKey}
                          </span>
                        )}
                      </div>

                      {/* Bottom row — small icon, right-aligned, rotated 180° */}
                      <div className="matching-card-pip matching-card-pip-bottom">
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt=""
                            aria-hidden="true"
                            className="matching-card-pip-img"
                            style={{ transform: 'rotate(180deg)' }}
                          />
                        ) : (
                          <span
                            className="matching-card-icon-fallback matching-card-pip-text"
                            style={{ transform: 'rotate(180deg)', display: 'inline-block' }}
                          >
                            {card.iconKey.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Victory Overlay (Shown in Sandbox Mode or as victory summary) */}
          {gameState === 'won' && !isChallenge && (
            <div className="matching-overlay won-overlay">
              <div className="matching-prompt-title">ALL MATCHED!</div>
              <div className="matching-prompt-hint">
                Cleared in {timeLimitSeconds - timeLeft}s • Score: {score} pts
              </div>
              <button
                type="button"
                className="matching-restart-btn"
                onClick={resetGame}
              >
                Play Again
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="matching-overlay gameover-overlay">
              <div className="matching-prompt-title" style={{ color: '#ef4444' }}>
                ⏰ TIME'S UP!
              </div>
              <div className="matching-prompt-hint">
                Matched {matchesFound}/{pairCount} pairs • Score: {score} pts
              </div>
              <button
                type="button"
                className="matching-restart-btn"
                onClick={resetGame}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </PuzzleContainer>
  );
};

