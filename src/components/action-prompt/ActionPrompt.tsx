import React from 'react';

export interface ActionPromptProps {
  text: string;
  options?: string[];
  onSelect: (option: string) => void;
  onClose?: () => void;
}

export const ActionPrompt: React.FC<ActionPromptProps> = ({
  text,
  options = ['yes', 'no'],
  onSelect,
  onClose,
}) => {
  return (
    <div className="action-prompt-card">
      <div className="action-prompt-header">
        <span className="action-prompt-title">CHALLENGE</span>
        <span className="action-prompt-badge">PROMPT</span>
        {onClose && (
          <button
            type="button"
            className="action-prompt-close-btn"
            onClick={onClose}
            title="Dismiss Prompt"
          >
            ✕
          </button>
        )}
      </div>
      <div className="action-prompt-body">
        <p className="action-prompt-text">{text}</p>
        <div className="action-prompt-buttons">
          {options.map((opt) => {
            const isYes = opt.toLowerCase() === 'yes';
            return (
              <button
                key={opt}
                type="button"
                className={`action-prompt-btn ${isYes ? 'btn-accept' : 'btn-decline'}`}
                onClick={() => onSelect(opt)}
              >
                {opt.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
