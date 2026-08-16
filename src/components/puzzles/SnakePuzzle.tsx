import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';

// ============================================================================
// 🎨 Visual Palette & Colors (Easily customizable)
// ============================================================================
export const SNAKE_THEME = {
  boardBackground: '#14141e',
  gridLines: 'rgba(255, 255, 255, 0.03)',
  snakeHead: '#22c55e',       // Solid bright green head
  snakeBody: '#4ade80',       // Solid light green body
  food: '#ef4444',            // Solid red pixel dot (prepared for future sprite)
  border: '#38384a',
} as const;

// ============================================================================
// ⚙️ Game Defaults & Settings
// ============================================================================
export const SNAKE_SETTINGS = {
  gridSize: 14,               // 14x14 grid
  cellSize: 20,               // 20px per cell (Canvas = 280x280)
  initialSpeedMs: 100,        // Initial tick speed
  speedStepMs: 4,             // Speedup per apple eaten
  minSpeedMs: 20,             // Max speed cap
  targetScore: 50,            // Points needed for puzzle completion
  scorePerFood: 10,           // Points per food
} as const;

export const SNAKE_CONFIG: PuzzleConfig = {
  id: 'snake',
  name: 'Retro Snake',
  icon: '🐍',
  targetGoalScore: SNAKE_SETTINGS.targetScore,
  goalDescription: 'Collect apples without hitting walls or self',
  instructions: 'Use arrow keys or WASD to navigate.',
};

interface Position {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type GameState = 'idle' | 'playing' | 'gameover' | 'won';

export interface SnakePuzzleProps extends PuzzleComponentProps {
  gridSize?: number;
  cellSize?: number;
  initialSpeedMs?: number;
  minSpeedMs?: number;
  speedStepMs?: number;
  targetScore?: number;
}

export const SnakePuzzle: React.FC<SnakePuzzleProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
  gridSize = SNAKE_SETTINGS.gridSize,
  cellSize = SNAKE_SETTINGS.cellSize,
  initialSpeedMs = SNAKE_SETTINGS.initialSpeedMs,
  minSpeedMs = SNAKE_SETTINGS.minSpeedMs,
  speedStepMs = SNAKE_SETTINGS.speedStepMs,
  targetScore = SNAKE_SETTINGS.targetScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game logic states
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(120);

  // Snake coordinates, food, and direction
  const snakeRef = useRef<Position[]>([
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2) - 1, y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2) - 2, y: Math.floor(gridSize / 2) },
  ]);

  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Position>({ x: 3, y: 3 });
  const speedRef = useRef<number>(initialSpeedMs);

  const canvasWidth = gridSize * cellSize;
  const canvasHeight = gridSize * cellSize;

  // Helper to find a free random spot for food
  const spawnFood = useCallback((): Position => {
    const occupied = new Set(snakeRef.current.map((p) => `${p.x},${p.y}`));
    const emptyCells: Position[] = [];

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      return { x: 0, y: 0 };
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
  }, [gridSize]);

  // Reset/Initialize game
  const resetGame = useCallback(() => {
    const initialSnake: Position[] = [
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2) - 1, y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2) - 2, y: Math.floor(gridSize / 2) },
    ];
    snakeRef.current = initialSnake;
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    foodRef.current = spawnFood();
    speedRef.current = initialSpeedMs;
    setScore(0);
    setGameState('idle');
  }, [gridSize, initialSpeedMs, spawnFood]);

  // Initial setup
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Canvas drawing routine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear background
    ctx.fillStyle = SNAKE_THEME.boardBackground;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Subtle grid lines
    ctx.strokeStyle = SNAKE_THEME.gridLines;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasWidth, i * cellSize);
      ctx.stroke();
    }

    // 3. Draw Food (Pixel dot, prepared for sprite replacement)
    const food = foodRef.current;
    ctx.fillStyle = SNAKE_THEME.food;
    ctx.fillRect(
      food.x * cellSize + 2,
      food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );

    // 4. Draw Snake Body & Head
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? SNAKE_THEME.snakeHead : SNAKE_THEME.snakeBody;

      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });
  }, [canvasWidth, canvasHeight, gridSize, cellSize]);

  // Re-render canvas when state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, gameState, score]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      // Map arrow keys and WASD
      let newDirection: Direction | null = null;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') newDirection = 'UP';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') newDirection = 'DOWN';
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') newDirection = 'LEFT';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') newDirection = 'RIGHT';

      if (newDirection) {
        e.preventDefault();

        // If idle, start game on first direction press
        if (gameState === 'idle') {
          setGameState('playing');
        }

        // Prevent 180° immediate self-reversal
        const current = dirRef.current;
        if (
          (newDirection === 'UP' && current !== 'DOWN') ||
          (newDirection === 'DOWN' && current !== 'UP') ||
          (newDirection === 'LEFT' && current !== 'RIGHT') ||
          (newDirection === 'RIGHT' && current !== 'LEFT')
        ) {
          nextDirRef.current = newDirection;
        }
      } else if (key === ' ' || key === 'Enter') {
        if (gameState === 'gameover' || gameState === 'won') {
          e.preventDefault();
          resetGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, resetGame]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const intervalId = setInterval(() => {
      dirRef.current = nextDirRef.current;
      const currentDir = dirRef.current;
      const snake = [...snakeRef.current];
      const head = snake[0];

      // Calculate next head position
      let nextX = head.x;
      let nextY = head.y;

      if (currentDir === 'UP') nextY -= 1;
      else if (currentDir === 'DOWN') nextY += 1;
      else if (currentDir === 'LEFT') nextX -= 1;
      else if (currentDir === 'RIGHT') nextX += 1;

      // 1. Check Wall Boundary Collision
      if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
        setGameState('gameover');
        return;
      }

      // 2. Check Self Collision
      const isSelfCollision = snake.some((segment) => segment.x === nextX && segment.y === nextY);
      if (isSelfCollision) {
        setGameState('gameover');
        return;
      }

      const newHead: Position = { x: nextX, y: nextY };
      const isEatingFood = nextX === foodRef.current.x && nextY === foodRef.current.y;

      if (isEatingFood) {
        // Snake grows
        const newSnake = [newHead, ...snake];
        snakeRef.current = newSnake;

        const newScore = score + SNAKE_SETTINGS.scorePerFood;
        setScore(newScore);
        if (newScore > highScore) {
          setHighScore(newScore);
        }

        // Speed up slightly
        speedRef.current = Math.max(minSpeedMs, speedRef.current - speedStepMs);

        // Win check:
        // In challenge mode (with domain target), win at targetScore.
        // In sandbox mode (no domain), play endlessly until full grid or gameover.
        const isChallenge = Boolean(targetDomain);
        if (newSnake.length >= gridSize * gridSize) {
          setGameState('won');
          onSuccess(newScore);
          return;
        }

        if (isChallenge && targetScore && newScore >= targetScore) {
          setGameState('won');
          onSuccess(newScore);
          return;
        }

        // Spawn next food
        foodRef.current = spawnFood();
      } else {
        // Normal move
        snake.pop();
        snake.unshift(newHead);
        snakeRef.current = snake;
      }

      renderCanvas();
    }, speedRef.current);

    return () => clearInterval(intervalId);
  }, [gameState, score, highScore, gridSize, minSpeedMs, speedStepMs, targetScore, targetDomain, spawnFood, renderCanvas, onSuccess]);

  const isChallenge = Boolean(targetDomain);

  return (
    <PuzzleContainer
      config={SNAKE_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="snake-game-wrapper">
        {/* Canvas & In-Game Overlay Container */}
        <div className="snake-canvas-container" style={{ width: canvasWidth, height: canvasHeight }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="snake-canvas"
          />

          {/* In-Game HUD: Top Left Score & Top Right Best */}
          <div className="snake-in-game-hud">
            <span className="snake-hud-chip score-chip">
              SCORE: <span className="hud-val">{isChallenge && targetScore ? `${score}/${targetScore}` : score}</span>
            </span>
            <span className="snake-hud-chip best-chip">
              BEST: <span className="hud-val">{highScore}</span>
            </span>
          </div>

          {/* Idle Start Overlay */}
          {gameState === 'idle' && (
            <div className="snake-overlay">
              <span className="snake-prompt-title">READY TO PLAY</span>
              <span className="snake-prompt-hint">Press any arrow key to move [↑ ↓ ← →]</span>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="snake-overlay">
              <span className="snake-prompt-title" style={{ color: '#ef4444' }}>
                GAME OVER
              </span>
              <span className="snake-prompt-hint">Score: {score} pts</span>
              <button type="button" className="snake-restart-btn" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}

          {/* Win / Complete Overlay */}
          {gameState === 'won' && (
            <div className="snake-overlay">
              <span className="snake-prompt-title" style={{ color: '#22c55e' }}>
                {isChallenge ? 'GOAL ACHIEVED!' : 'BOARD CLEARED!'}
              </span>
              <span className="snake-prompt-hint">Final Score: {score} pts</span>
              <button type="button" className="snake-restart-btn" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </PuzzleContainer>
  );
};
