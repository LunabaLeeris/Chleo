import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';

export const SNAKE_THEME = {
  boardBackground: '#0c0c0cff',
  gridLines: 'rgba(172, 170, 170, 0.03)',
  snakeHead: '#07aa43ff',
  snakeBody: '#4ade80',
  food: '#ef4444',
  border: '#38384a',
  bomb: '#950bebff'
} as const;


export const SNAKE_SETTINGS = {
  gridSize: 20,               // 14x14 grid
  cellSize: 20,               // 20px per cell (Canvas = 280x280)
  initialSpeedMs: 100,        // Initial tick speed
  speedStepMs: 4,             // Speedup per apple eaten
  minSpeedMs: 40,             // Max speed cap
  targetScore: 50,            // Points needed for puzzle completion
  scorePerFood: 10,           // Points per food
  bombAmount: 2,              // How many bombs are there
  foodChompsToResetBomb: 3       // How many food must be eaten for the bombs to find another position. 
} as const;


export const SNAKE_CONFIG: PuzzleConfig = {
  id: 'snake',
  name: 'Retro Snake',
  icon: 'snake',
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
  onHighScoreBeaten,
  initialHighScore,
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
  const [highScore, setHighScore] = useState<number>(initialHighScore ?? 120);
  const highScoreRef = useRef<number>(initialHighScore ?? 120);
  const chompsRef = useRef<number>(0);

  // Load high score from puzzle-data.json on mount
  useEffect(() => {
    let isMounted = true;
    const loadHighScore = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
          const raw = await (window as any).electronAPI.readMemoryFile('puzzle-data.json');
          if (raw && isMounted) {
            const parsed = JSON.parse(raw);
            if (parsed?.snake?.highScore !== undefined && typeof parsed.snake.highScore === 'number') {
              setHighScore(parsed.snake.highScore);
              highScoreRef.current = parsed.snake.highScore;
            }
          }
        }
      } catch (e) {
        console.warn('[SnakePuzzle] Failed to load high score from puzzle-data.json:', e);
      }
    };
    loadHighScore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Snake coordinates, food, and direction
  const snakeRef = useRef<Position[]>([
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2) - 1, y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2) - 2, y: Math.floor(gridSize / 2) },
  ]);

  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Position>({ x: 3, y: 3 });
  const bombsRef = useRef<Position[]>([]);
  const speedRef = useRef<number>(initialSpeedMs);

  const canvasWidth = gridSize * cellSize;
  const canvasHeight = gridSize * cellSize;

  // Universal helper to pick N distinct unoccupied positions
  const spawnPositions = useCallback((count: number, occupied: Position[] = snakeRef.current): Position[] => {
    const totalCells = gridSize * gridSize;
    const occupiedFlags = new Uint8Array(totalCells);

    for (let i = 0; i < occupied.length; i++) {
      const pos = occupied[i];
      if (pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize) {
        occupiedFlags[pos.y * gridSize + pos.x] = 1;
      }
    }

    const unoccupied: number[] = [];
    for (let idx = 0; idx < totalCells; idx++) {
      if (occupiedFlags[idx] === 0) {
        unoccupied.push(idx);
      }
    }

    if (count > unoccupied.length) {
      throw new Error(`Cannot spawn ${count} items: only ${unoccupied.length} empty cells available.`);
    }

    const results: Position[] = [];
    for (let i = 0; i < count; i++) {
      const rand = i + Math.floor(Math.random() * (unoccupied.length - i));
      const chosenIndex = unoccupied[rand];
      unoccupied[rand] = unoccupied[i];
      unoccupied[i] = chosenIndex;

      results.push({
        x: chosenIndex % gridSize,
        y: Math.floor(chosenIndex / gridSize),
      });
    }

    return results;
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

    const [newFood, ...newBombs] = spawnPositions(1 + SNAKE_SETTINGS.bombAmount, initialSnake);
    foodRef.current = newFood;
    bombsRef.current = newBombs;

    speedRef.current = initialSpeedMs;
    chompsRef.current = 0;
    setScore(0);
    setGameState('idle');
  }, [gridSize, initialSpeedMs, spawnPositions]);

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

    // Clear background
    ctx.fillStyle = SNAKE_THEME.boardBackground;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Subtle grid lines
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

    // Draw Food (Pixel dot, prepared for sprite replacement)
    const food = foodRef.current;
    ctx.fillStyle = SNAKE_THEME.food;
    ctx.fillRect(
      food.x * cellSize + 2,
      food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );

    // Draw Bombs
    const bombs = bombsRef.current;
    for (const bomb of bombs) {
      ctx.fillStyle = SNAKE_THEME.bomb;
      ctx.fillRect(
        bomb.x * cellSize + 2,
        bomb.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
    }

    // Draw Snake Body & Head
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
      let nextY = head.y; ``

      if (currentDir === 'UP') nextY -= 1;
      else if (currentDir === 'DOWN') nextY += 1;
      else if (currentDir === 'LEFT') nextX -= 1;
      else if (currentDir === 'RIGHT') nextX += 1;

      // Check Wall Boundary Collision
      if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
        setGameState('gameover');
        return;
      }

      // Check Self Collision
      const isSelfCollision = snake.some((segment) => segment.x === nextX && segment.y === nextY);
      if (isSelfCollision) {
        setGameState('gameover');
        return;
      }

      const newHead: Position = { x: nextX, y: nextY };

      const isExploded = bombsRef.current.some(p => (p.x === newHead.x && p.y === newHead.y));
      if (isExploded) {
        setGameState('gameover');
        return;
      }

      const isEatingFood = nextX === foodRef.current.x && nextY === foodRef.current.y;
      if (isEatingFood) {
        chompsRef.current += 1;

        // Snake grows
        const newSnake = [newHead, ...snake];
        snakeRef.current = newSnake;

        const newScore = score + SNAKE_SETTINGS.scorePerFood;
        setScore(newScore);
        if (newScore > highScoreRef.current) {
          highScoreRef.current = newScore;
          setHighScore(newScore);
          onHighScoreBeaten?.('snake', newScore);
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

        // Spawn next entities: if chomps threshold met, relocate both food and bombs
        if (chompsRef.current % SNAKE_SETTINGS.foodChompsToResetBomb === 0) {
          const [newFood, ...newBombs] = spawnPositions(1 + SNAKE_SETTINGS.bombAmount, newSnake);
          foodRef.current = newFood;
          bombsRef.current = newBombs;
        } else {
          const [newFood] = spawnPositions(1, [...newSnake, ...bombsRef.current]);
          foodRef.current = newFood;
        }
      } else {
        // Normal move
        snake.pop();
        snake.unshift(newHead);
        snakeRef.current = snake;
      }

      renderCanvas();
    }, speedRef.current);

    return () => clearInterval(intervalId);
  }, [gameState, score, gridSize, minSpeedMs, speedStepMs, targetScore, targetDomain, spawnPositions, renderCanvas, onSuccess, onHighScoreBeaten]);

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
