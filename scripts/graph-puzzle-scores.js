#!/usr/bin/env node

/**
 * Puzzle Progression Test CLI Tool
 *
 * Reads config directly from user-data/puzzle-target-config.json
 * and visualizes target score curves based on emotional stress factor.
 *
 * Usage:
 *   node scripts/graph-puzzle-scores.js
 *   node scripts/graph-puzzle-scores.js --no-open
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const userDataConfigPath = path.resolve(__dirname, '..', 'user-data', 'puzzle-target-config.json');
const srcConfigPath = path.resolve(__dirname, '..', 'src', 'monitoring', 'config', 'puzzle-target-config.json');

let configPath = userDataConfigPath;
let loadedConfig = null;

if (fs.existsSync(userDataConfigPath)) {
  try {
    loadedConfig = JSON.parse(fs.readFileSync(userDataConfigPath, 'utf-8'));
    configPath = userDataConfigPath;
  } catch (e) {
    // fallback
  }
}

if (!loadedConfig && fs.existsSync(srcConfigPath)) {
  try {
    loadedConfig = JSON.parse(fs.readFileSync(srcConfigPath, 'utf-8'));
    configPath = srcConfigPath;
  } catch (e) {
    // fallback
  }
}

const DEFAULT_CONFIG = {
  weights: {
    joy: -1.2,
    trust: -1,
    anticipation: -0.6,
    surprise: 0,
    anger: 1.5,
    disgust: 1.2,
    sadness: 1,
    fear: 0.8,
  },
  stressDivisor: 2,
  bounds: {
    snake: { minScore: 10, baseScore: 20, maxScore: 100, roundStep: 5 },
    typing: { minScore: 250, baseScore: 300, maxScore: 500, roundStep: 10 },
    matching: { minScore: 50, baseScore: 60, maxScore: 100, roundStep: 10 },
  }
};

const config = loadedConfig || DEFAULT_CONFIG;

const COLORS = {
  snake: '\x1b[32m',    // Green
  typing: '\x1b[34m',   // Blue
  matching: '\x1b[35m', // Magenta
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function calculateScore(puzzleId, factor) {
  const bounds = config.bounds[puzzleId] || config.bounds.snake || DEFAULT_CONFIG.bounds.snake;
  let rawScore;
  if (factor >= 0) {
    rawScore = bounds.baseScore + factor * (bounds.maxScore - bounds.baseScore);
  } else {
    rawScore = bounds.baseScore + factor * (bounds.baseScore - bounds.minScore);
  }
  const step = bounds.roundStep && bounds.roundStep > 0 ? bounds.roundStep : 10;
  const rounded = Math.round(rawScore / step) * step;
  return Math.max(bounds.minScore, Math.min(bounds.maxScore, rounded));
}

// Dynamic Y-axis scale
let allMin = 10000;
let allMax = 0;
for (const b of Object.values(config.bounds)) {
  if (b.minScore < allMin) allMin = b.minScore;
  if (b.maxScore > allMax) allMax = b.maxScore;
}
const yAxisMin = Math.max(0, Math.floor((allMin - 10) / 50) * 50);
const yAxisMax = Math.ceil((allMax + 20) / 50) * 50;

const yRange = yAxisMax - yAxisMin;
const yStep = yRange > 300 ? 50 : yRange > 150 ? 25 : 10;

const yLevels = [];
for (let s = yAxisMax; s >= yAxisMin; s -= yStep) {
  yLevels.push(s);
}
const xFactors = [-1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

console.log(`${BOLD}Score (Y)${RESET}`);
yLevels.forEach((score) => {
  let line = `${String(score).padStart(4, ' ')} + `;
  xFactors.forEach((f) => {
    const snk = calculateScore('snake', f);
    const typ = calculateScore('typing', f);
    const mat = calculateScore('matching', f);

    const isSnk = snk >= score && snk < score + yStep;
    const isTyp = typ >= score && typ < score + yStep;
    const isMat = mat >= score && mat < score + yStep;

    if (isSnk && isTyp && isMat) {
      line += `${BOLD}*${RESET}   `;
    } else if (isSnk && isTyp) {
      line += `${COLORS.snake}#${RESET}   `;
    } else if (isMat) {
      line += `${COLORS.matching}M${RESET}   `;
    } else if (isSnk) {
      line += `${COLORS.snake}S${RESET}   `;
    } else if (isTyp) {
      line += `${COLORS.typing}T${RESET}   `;
    } else {
      line += `${DIM}.${RESET}   `;
    }
  });
  console.log(line);
});

// X axis line
console.log(`     +-${'----'.repeat(xFactors.length)}`);
console.log(`        ${xFactors.map(f => (f >= 0 ? `+${f.toFixed(1)}` : f.toFixed(1))).join(' ')}`);
console.log(`        ${DIM}<- Happy (Lenient)            Neutral            Angry (Stricter) ->${RESET}\n`);

const htmlPath = path.resolve(__dirname, 'graph-puzzle-scores.html');
console.log(`Interactive visualizer: file://${htmlPath.replace(/\\/g, '/')}\n`);

const shouldOpen = !process.argv.includes('--no-open');
if (shouldOpen) {
  const startCmd = process.platform === 'win32' ? `start "" "${htmlPath}"` : process.platform === 'darwin' ? `open "${htmlPath}"` : `xdg-open "${htmlPath}"`;
  exec(startCmd, (err) => {
    if (!err) {
      console.log(`Opened visualizer in browser.`);
    }
  });
}
