import React, { useState, useEffect, useRef } from "react";
import { PanelSection, Button } from "./ui";
import { ShortTermMemory } from "../../src/memory/short-term-memory";
import { LongTermMemory } from "../../src/memory/long-term-memory";
import type {
  ShortTermMemoryEvent,
  LongTermMemoryData,
} from "../../src/memory/memory-types";

interface MemoryPanelProps {
  shortTermMemory?: ShortTermMemory;
  longTermMemory?: LongTermMemory;
  onMemoryUpdated?: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  shortTermMemory: propSTM,
  longTermMemory: propLTM,
  onMemoryUpdated,
}) => {
  const [ltm] = useState<LongTermMemory>(() => propLTM || new LongTermMemory());
  const [stm] = useState<ShortTermMemory>(
    () => propSTM || new ShortTermMemory(ltm),
  );

  const [stmEvents, setStmEvents] = useState<ShortTermMemoryEvent[]>([]);
  const [ltmData, setLtmData] = useState<LongTermMemoryData>(ltm.getData());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const stmFileInputRef = useRef<HTMLInputElement>(null);
  const ltmFileInputRef = useRef<HTMLInputElement>(null);

  const refreshLogs = () => {
    setStmEvents(stm.getAllEvents());
    setLtmData(ltm.getData());
    if (onMemoryUpdated) onMemoryUpdated();
  };

  useEffect(() => {
    refreshLogs();
  }, [stm, ltm]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // --- Short Term Memory Actions ---

  const handleConsolidateToLTM = () => {
    stm.consolidateToLongTermMemory("manual_trigger");
    refreshLogs();
    showStatus("Short-Term memory consolidated to Long-Term memory!");
  };

  const handleDownloadSTM = () => {
    stm.downloadJSON();
    showStatus("Downloaded short_term_memory.json");
  };

  const handleUploadSTM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text && stm.importJSON(text)) {
        refreshLogs();
        showStatus("Short-Term memory successfully restored from JSON!");
      } else {
        showStatus("Failed to parse Short-Term memory JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearSTM = () => {
    stm.clear();
    refreshLogs();
    showStatus("Short-Term memory cleared.");
  };

  // --- Long Term Memory Actions ---

  const handleDownloadLTM = () => {
    ltm.downloadJSON();
    showStatus("Downloaded long_term_memory.json");
  };

  const handleUploadLTM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text && ltm.importJSON(text)) {
        refreshLogs();
        showStatus("Long-Term memory successfully restored from JSON!");
      } else {
        showStatus("Failed to parse Long-Term memory JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetLTM = () => {
    ltm.reset();
    refreshLogs();
    showStatus("Long-Term memory reset to defaults.");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        fontFamily: "var(--font-body)",
      }}
    >
      {statusMessage && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            backgroundColor: "var(--bg-card-secondary, #f4ece0)",
            border: "2px solid var(--border-pixel, #2d2424)",
            fontSize: "0.85rem",
            color: "var(--text-dark, #2d2424)",
            fontWeight: 600,
            fontFamily: "var(--font-pixel)",
            textAlign: "center",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Short Term Memory Panel */}
      <PanelSection title="Short-Term Memory" bgVariant="activity">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Action Toolbar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <Button
              variant="primary"
              onClick={handleConsolidateToLTM}
              style={{ fontSize: "0.78rem", padding: "5px 8px", flex: 1 }}
              title="Consolidate all short term events into long term memory and refresh"
            >
              Log to Long-Term Memory
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadSTM}
              style={{ fontSize: "0.78rem", padding: "5px 8px" }}
              title="Download short_term_memory.json"
            >
              Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => stmFileInputRef.current?.click()}
              style={{ fontSize: "0.78rem", padding: "5px 8px" }}
              title="Upload short_term_memory.json to restore"
            >
              Import
            </Button>
            <input
              type="file"
              ref={stmFileInputRef}
              onChange={handleUploadSTM}
              accept=".json"
              style={{ display: "none" }}
            />
            <Button
              variant="secondary"
              onClick={handleClearSTM}
              style={{ fontSize: "0.78rem", padding: "5px 8px" }}
            >
              Reset
            </Button>
          </div>

          <div
            style={{ fontSize: "0.8rem", color: "var(--text-dark, #2d2424)" }}
          >
            Active Events: <strong>{stmEvents.length}</strong> | Recent Phrases:{" "}
            <strong>
              {stm.exportJSON()
                ? JSON.parse(stm.exportJSON()).recentSpeechPhrases?.length || 0
                : 0}
            </strong>
          </div>

          {/* Events Log List */}
          <div
            style={{
              maxHeight: "160px",
              overflowY: "auto",
              backgroundColor: "var(--bg-card, #fffbf5)",
              border: "2px solid var(--border-pixel, #2d2424)",
              padding: "6px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {stmEvents.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted, #6e625e)",
                  fontStyle: "italic",
                  textAlign: "center",
                  padding: "8px",
                }}
              >
                No active short-term events logged.
              </div>
            ) : (
              stmEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: "var(--bg-card-secondary, #f4ece0)",
                    borderRadius: "4px",
                    borderLeft: `4px solid ${evt.type.includes("exceeded") || evt.type.includes("blocked") ? "#e53935" : "#43a047"}`,
                    borderTop: "1px solid rgba(45, 36, 36, 0.1)",
                    borderRight: "1px solid rgba(45, 36, 36, 0.1)",
                    borderBottom: "1px solid rgba(45, 36, 36, 0.1)",
                    color: "var(--text-dark, #2d2424)",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-muted, #6e625e)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    [{new Date(evt.timestamp).toLocaleTimeString()}] — [
                    {evt.type.toUpperCase()}] {evt.domain}
                  </div>
                  <div style={{ marginTop: "2px" }}>{evt.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </PanelSection>

      {/* Long Term Memory Panel */}
      <PanelSection title="Long-Term Memory" bgVariant="marketplace">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Action Toolbar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <Button
              variant="secondary"
              onClick={handleDownloadLTM}
              style={{ fontSize: "0.78rem", padding: "5px 8px", flex: 1 }}
            >
              Export LTM JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => ltmFileInputRef.current?.click()}
              style={{ fontSize: "0.78rem", padding: "5px 8px", flex: 1 }}
            >
              Import LTM JSON
            </Button>
            <input
              type="file"
              ref={ltmFileInputRef}
              onChange={handleUploadLTM}
              accept=".json"
              style={{ display: "none" }}
            />
            <Button
              variant="secondary"
              onClick={handleResetLTM}
              style={{ fontSize: "0.78rem", padding: "5px 8px" }}
            >
              Reset
            </Button>
          </div>

          {/* Stats Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              fontSize: "0.78rem",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card-secondary, #f4ece0)",
                border: "1px solid var(--border-pixel, #2d2424)",
                padding: "6px 8px",
                borderRadius: "6px",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              Days Known: <strong>{ltmData.daysKnown}</strong>
            </div>
            <div
              style={{
                backgroundColor: "var(--bg-card-secondary, #f4ece0)",
                border: "1px solid var(--border-pixel, #2d2424)",
                padding: "6px 8px",
                borderRadius: "6px",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              Violations:{" "}
              <strong style={{ color: "#d32f2f" }}>
                {ltmData.totalViolationsCount}
              </strong>
            </div>
            <div
              style={{
                backgroundColor: "var(--bg-card-secondary, #f4ece0)",
                border: "1px solid var(--border-pixel, #2d2424)",
                padding: "6px 8px",
                borderRadius: "6px",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              Rewards:{" "}
              <strong style={{ color: "#2e7d32" }}>
                {ltmData.totalRewardsEarned}
              </strong>
            </div>
            <div
              style={{
                backgroundColor: "var(--bg-card-secondary, #f4ece0)",
                border: "1px solid var(--border-pixel, #2d2424)",
                padding: "6px 8px",
                borderRadius: "6px",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              Puzzles: <strong>{ltmData.totalPuzzlesCompleted}</strong>
            </div>
          </div>

          {/* Past Mistakes */}
          <div>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: "bold",
                marginBottom: "4px",
                color: "var(--text-dark, #2d2424)",
                fontFamily: "var(--font-pixel)",
              }}
            >
              Past Mistakes / Violations ({ltmData.pastMistakes?.length || 0})
            </div>
            <div
              style={{
                maxHeight: "80px",
                overflowY: "auto",
                backgroundColor: "var(--bg-card, #fffbf5)",
                border: "2px solid var(--border-pixel, #2d2424)",
                padding: "6px",
                borderRadius: "6px",
                fontSize: "0.74rem",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              {!ltmData.pastMistakes || ltmData.pastMistakes.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted, #6e625e)",
                    fontStyle: "italic",
                  }}
                >
                  No past mistakes recorded.
                </div>
              ) : (
                ltmData.pastMistakes.map((m, i) => (
                  <div key={i} style={{ marginBottom: "2px" }}>
                    {m}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past Achievements */}
          <div>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: "bold",
                marginBottom: "4px",
                color: "var(--text-dark, #2d2424)",
                fontFamily: "var(--font-pixel)",
              }}
            >
              Past Achievements / Rewards (
              {ltmData.pastAchievements?.length || 0})
            </div>
            <div
              style={{
                maxHeight: "80px",
                overflowY: "auto",
                backgroundColor: "var(--bg-card, #fffbf5)",
                border: "2px solid var(--border-pixel, #2d2424)",
                padding: "6px",
                borderRadius: "6px",
                fontSize: "0.74rem",
                color: "var(--text-dark, #2d2424)",
              }}
            >
              {!ltmData.pastAchievements ||
              ltmData.pastAchievements.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted, #6e625e)",
                    fontStyle: "italic",
                  }}
                >
                  No past achievements recorded.
                </div>
              ) : (
                ltmData.pastAchievements.map((a, i) => (
                  <div key={i} style={{ marginBottom: "2px" }}>
                    {a}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PanelSection>
    </div>
  );
};
