import React, { useEffect, useRef, useState } from "react";
import { AvatarCompositor } from "../../src/avatar";
import type { ChleoExpression } from "../../src/avatar";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AvatarStage } from "../components/AvatarStage";
import { SpriteEditor } from "../components/SpriteEditor";
import {
  pushSpriteApplyToDesktop,
  pushSpriteResetToDesktop,
} from "../desktop-sync";

export const EditorPage: React.FC = () => {
  const compositorRef = useRef<AvatarCompositor | null>(null);
  const expressionRef = useRef<ChleoExpression>("idle");
  const [theme, setTheme] = useState<"cream" | "grid">("cream");
  const [activeExpressionLabel, setActiveExpressionLabel] =
    useState<string>("Idle");

  useEffect(() => {
    document.body.className =
      theme === "cream" ? "theme-light-pixel" : "theme-pixel-grid";
  }, [theme]);

  const showExpression = (expression: ChleoExpression) => {
    expressionRef.current = expression;
    compositorRef.current?.previewExpression(expression);
    setActiveExpressionLabel(expression.replace("_", " "));
  };

  return (
    <div className="app-layout">
      <Header
        activeTab="editor"
        theme={theme}
        onThemeChange={(next) => setTheme(next)}
      />

      <main className="main-content editor-page-content">
        <div className="editor-main">
          <SpriteEditor
            onApply={async (part, expression, frames, fps) => {
              await compositorRef.current?.applyPartClip(
                part,
                expression,
                frames,
                fps,
              );
              showExpression(expression);
              const overlay = await pushSpriteApplyToDesktop(
                part,
                expression,
                frames,
                fps,
              );
              return overlay
                ? `Applied ${part} / ${expression} · overlay updated`
                : `Applied ${part} / ${expression} · overlay offline (saved in this browser)`;
            }}
            onResetPart={async (part, expression) => {
              compositorRef.current?.restorePartClip(part, expression);
              showExpression(expression);
              const overlay = await pushSpriteResetToDesktop(part, expression);
              return overlay
                ? `Reset ${part} / ${expression} · overlay updated`
                : `Reset ${part} / ${expression} · overlay offline`;
            }}
            onExpressionChange={showExpression}
          />
        </div>

        <AvatarStage
          compact
          renderScale={2}
          speechBubbleText=""
          isBubbleVisible={false}
          activeExpressionLabel={activeExpressionLabel}
          theme={theme}
          onCompositorInit={(compositor) => {
            compositorRef.current = compositor;
            compositor.previewExpression(expressionRef.current);
          }}
        />
      </main>
      <Footer />
    </div>
  );
};
