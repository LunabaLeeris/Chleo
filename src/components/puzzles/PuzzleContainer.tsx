import React, { useState } from 'react';
import type { PuzzleConfig } from './puzzle-types';

export interface PuzzleContainerProps {
  config: PuzzleConfig;
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const PuzzleContainer: React.FC<PuzzleContainerProps> = ({
  config,
  targetDomain,
  onSuccess,
  onCancel,
  children,
}) => {
  const [testScore, setTestScore] = useState<number>(config.targetGoalScore);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const handleProceed = () => {
    if (testScore >= config.targetGoalScore) {
      setFeedback({ message: `Goal achieved (${testScore} >= ${config.targetGoalScore})! Unlocking...`, isError: false });
      setTimeout(() => {
        onSuccess(testScore);
      }, 400);
    } else {
      setFeedback({
        message: `Score ${testScore} is below target ${config.targetGoalScore}! Try a higher score or cancel.`,
        isError: true,
      });
    }
  };

  return (
    <div className="puzzle-panel-card">
      {/* Header */}
      <div className="puzzle-card-header">
        <div className="puzzle-card-title-wrap">
          <span className="puzzle-card-icon">{config.icon}</span>
          <div className="puzzle-card-meta">
            <h3 className="puzzle-card-title">{config.name} Challenge</h3>
            <span className="puzzle-card-domain">Target: {targetDomain || 'Blocked Site'}</span>
          </div>
        </div>
        <button
          type="button"
          className="puzzle-card-close-btn"
          onClick={onCancel}
          title="Cancel Puzzle"
        >
          ✕
        </button>
      </div>

      {/* Goal Banner */}
      <div className="puzzle-goal-banner">
        <span className="puzzle-goal-tag">GOAL</span>
        <span className="puzzle-goal-desc">{config.goalDescription} (Target: {config.targetGoalScore} pts)</span>
      </div>

      {/* Custom puzzle view or scaffolded content */}
      <div className="puzzle-card-body">
        {children}

        {/* Score Testing & Simulation Controls */}
        <div className="puzzle-score-tester">
          <div className="puzzle-score-field">
            <label className="puzzle-score-label" htmlFor="puzzle-score-input">
              Simulate / Test Score:
            </label>
            <input
              id="puzzle-score-input"
              type="number"
              className="puzzle-score-input"
              value={testScore}
              onChange={(e) => {
                setTestScore(Number(e.target.value) || 0);
                setFeedback(null);
              }}
              min={0}
              max={999}
            />
          </div>

          {feedback && (
            <div className={`puzzle-feedback-banner ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="puzzle-card-footer">
        <button
          type="button"
          className="puzzle-btn btn-cancel"
          onClick={onCancel}
        >
          CANCEL
        </button>
        <button
          type="button"
          className="puzzle-btn btn-proceed"
          onClick={handleProceed}
        >
          PROCEED / SOLVE
        </button>
      </div>
    </div>
  );
};
