import React, { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ProjectOverview } from "../components/ProjectOverview";
import {
  AvatarCompositor,
  defaultAvatarConfig,
  defaultTTSModulator,
  defaultSpeechOrchestrator,
} from "../../src/avatar";
import type { CleoExpression } from "../../src/avatar";

// Icon imports from root assets folder
import ICON_EYES from "../../assets/eyes.png";
import ICON_MOUTH from "../../assets/mouth.png";
import ICON_BRAIN from "../../assets/brain.png";
import ICON_HEART from "../../assets/heart.png";
import { MarketplaceSection } from "../components/MarketplaceSection";

export interface HoverMessage {
  text: string;
  expression?: CleoExpression;
}

/**
 * Focus panel configuration.
 * Each panel highlights a part of CHLEO and points to it with a connecting line.
 */
interface FocusPanelConfig {
  id: string;
  title: string;
  description: string;
  /** Path to icon PNG/SVG or imported asset module */
  iconSrc: string;
  /** Which side of the avatar this panel sits on */
  side: "left" | "right";
  /** Default avatar expression to play when user hovers this panel if message has no explicit expression */
  expression?: CleoExpression;
  /** List of speech bubble messages (string or object with custom expression) that CHLEO speaks when user hovers over this panel */
  hoverMessages: (string | HoverMessage)[];
  /** Blog anchor to navigate to on click */
  blogAnchor: string;
  /** Red target box positioning on the 384x384 avatar canvas (% values) */
  boxStyle: React.CSSProperties;
}

const FOCUS_PANELS: FocusPanelConfig[] = [
  {
    id: "intelligence",
    title: "Intelligence",
    description:
      "Various behaviors and customizable rules powered by LLMs for realism.",
    iconSrc: ICON_BRAIN,
    side: "left",
    expression: "happy",
    hoverMessages: [
      { text: "Yes. I can think and reason", expression: "happy" },
      { text: "Hmm........", expression: "question" },
      { text: "I remember things", expression: "idle" },
    ],
    blogAnchor: "intelligence",
    boxStyle: { top: "15%", left: "37%", width: "26%", height: "14%" },
  },
  {
    id: "monitoring",
    title: "Monitoring",
    description: "Monitors your activity and guides you to be productive.",
    iconSrc: ICON_EYES,
    side: "right",
    expression: "focused",
    hoverMessages: [
      { text: "I'm always watching you...", expression: "focused" },
      {
        text: "I track your focus time so you stay on target!",
        expression: "blink",
      },
      { text: "Don't get distracted on my watch.", expression: "focused" },
    ],
    blogAnchor: "monitoring",
    boxStyle: { top: "43%", left: "55%", width: "15%", height: "12%" },
  },
  {
    id: "speech",
    title: "Speech",
    description: "Nuanced and realistic speech animation by using visemes.",
    iconSrc: ICON_MOUTH,
    side: "left",
    expression: "speak",
    hoverMessages: [
      {
        text: "I can talk with viseme-synced mouth animation!",
        expression: "speak",
      },
      {
        text: "My mouth moves in lockstep with my robotic voice!",
        expression: "speak",
      },
      {
        text: "Listen closely—every syllable is synthesized live!",
        expression: "happy",
      },
    ],
    blogAnchor: "speech",
    boxStyle: { top: "67%", left: "41%", width: "20%", height: "13%" },
  },
  {
    id: "emotions",
    title: "Emotions",
    description: "Have various emotions using Plutchik's wheel.",
    iconSrc: ICON_HEART,
    side: "right",
    expression: "question",
    hoverMessages: [
      { text: "I feel things deeply. Just like you", expression: "angry" },
      { text: "Dont even try to make me upset", expression: "question" },
      { text: "Do great and I will be happy", expression: "happy" },
    ],
    blogAnchor: "emotions",
    boxStyle: { top: "90%", left: "45%", width: "20%", height: "10%" },
  },
];

interface IdleMessage {
  text: string;
  expression?: CleoExpression;
}

const IDLE_MESSAGES: IdleMessage[] = [
  { text: "What are you doing?", expression: "question" },
  { text: "I can monitor your browsing habits~", expression: "focused" },
  { text: "Try hovering over my features!", expression: "happy" },
  { text: "I have real emotions, you know!", expression: "angry" },
  { text: "I like gifts", expression: "speak" },
  { text: "hmmm... what should we do today?", expression: "question" },
  {
    text: "Want to see me in action? Go to the Playground!",
    expression: "happy",
  },
];

const IDLE_DISPLAY_DURATION = 5000;
const IDLE_INTERVAL = 10000; // Interval between individual idle messages
const IDLE_CYCLE_RESET_INTERVAL = 60000; // 1 minute delay after finishing all idle messages in the list
const MIC_TEST_MESSAGE = "mic test";
const MIC_TEST_DURATION = 2000;
const GREETING_MESSAGE = "Hi there! I am Chleo!";
const GREETING_DURATION = 4000;

interface LineCoord {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositorRef = useRef<AvatarCompositor | null>(null);

  const showcaseRef = useRef<HTMLDivElement | null>(null);
  const avatarBoxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const [bubbleText, setBubbleText] = useState("");
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);
  const [lines, setLines] = useState<LineCoord[]>([]);
  const [showcaseDimensions, setShowcaseDimensions] = useState({
    width: 1000,
    height: 500,
  });

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleIndexRef = useRef(0);
  const isHoveringRef = useRef(false);
  const panelMessageIndicesRef = useRef<Record<string, number>>({});

  // Random natural blinking effect
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;

    const scheduleNextBlink = () => {
      // Random delay between 2.5 seconds and 6.5 seconds
      const delay = Math.floor(Math.random() * 4000) + 2500;
      blinkTimeout = setTimeout(() => {
        if (compositorRef.current) {
          compositorRef.current.setExpression("blink");
        }
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(blinkTimeout);
    };
  }, []);

  // Dynamically calculate red connecting lines from avatar highlight boxes to focus panels
  const updateLines = useCallback(() => {
    if (!showcaseRef.current) return;
    const sRect = showcaseRef.current.getBoundingClientRect();
    setShowcaseDimensions({ width: sRect.width, height: sRect.height });

    const computedLines: LineCoord[] = [];

    FOCUS_PANELS.forEach((panel) => {
      const boxEl = avatarBoxRefs.current[panel.id];
      const panelEl = panelRefs.current[panel.id];
      if (!boxEl || !panelEl) return;

      const bRect = boxEl.getBoundingClientRect();
      const pRect = panelEl.getBoundingClientRect();

      let x1 = 0;
      if (panel.side === "left") {
        x1 = bRect.left - sRect.left;
      } else {
        x1 = bRect.right - sRect.left;
      }
      const y1 = bRect.top + bRect.height / 2 - sRect.top;

      let x2 = 0;
      if (panel.side === "left") {
        x2 = pRect.right - sRect.left;
      } else {
        x2 = pRect.left - sRect.left;
      }
      const y2 = pRect.top + pRect.height / 2 - sRect.top;

      computedLines.push({ id: panel.id, x1, y1, x2, y2 });
    });

    setLines(computedLines);
  }, []);

  useEffect(() => {
    updateLines();
    const timer = setTimeout(updateLines, 200);
    window.addEventListener("resize", updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines]);

  // Idle speech loop
  const startIdleCycle = useCallback(() => {
    if (isHoveringRef.current) return;

    const currentIndex = idleIndexRef.current % IDLE_MESSAGES.length;
    const isLastInCycle = currentIndex === IDLE_MESSAGES.length - 1;
    const msg = IDLE_MESSAGES[currentIndex];

    setBubbleText(msg.text);
    setIsBubbleVisible(true);

    if (compositorRef.current) {
      compositorRef.current.setExpression(msg.expression || "happy");
      compositorRef.current.setExpression("speak", msg.text);
    }

    idleIndexRef.current++;

    idleTimerRef.current = setTimeout(() => {
      if (isHoveringRef.current) return;
      setIsBubbleVisible(false);
      if (compositorRef.current) {
        compositorRef.current.setExpression("idle");
      }

      // After finishing all idle messages in the list, wait 1 minute before repeating cycle
      const waitTime = isLastInCycle
        ? IDLE_CYCLE_RESET_INTERVAL
        : Math.max(0, IDLE_INTERVAL - IDLE_DISPLAY_DURATION);

      idleTimerRef.current = setTimeout(() => {
        if (!isHoveringRef.current) {
          startIdleCycle();
        }
      }, waitTime);
    }, IDLE_DISPLAY_DURATION);
  }, []);

  // Initialize avatar compositor and run load readiness tests before greeting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const compositor = new AvatarCompositor(canvas, {
      ...defaultAvatarConfig,
      scale: 6,
    });
    compositorRef.current = compositor;

    let isSubscribed = true;

    const runReadinessCheckAndGreeting = async () => {
      console.log("[HomePage] Starting Chleo load readiness tests...");

      // Load Avatar sprite sheet assets
      console.log("[HomePage Test 1/3] Preloading Avatar sprite assets...");
      await compositor.init();
      if (!isSubscribed) return;
      console.log("[HomePage Test 1/3 Passed] Avatar assets preloaded.");

      compositor.start();
      compositor.setExpression("idle");

      // Check TTS engine & Web Speech API voices readiness
      console.log("[HomePage Test 2/3] Checking TTS engine & voices...");
      const ttsReady = await defaultTTSModulator.ensureVoicesLoaded();
      if (!isSubscribed) return;
      console.log(`[HomePage Test 2/3 Passed] TTS engine ready: ${ttsReady}`);

      // Mic test speech verification ("mic test")
      console.log(
        "[HomePage Test 3/3] Performing mic test speech verification...",
      );
      if (!isHoveringRef.current) {
        setBubbleText(MIC_TEST_MESSAGE);
        setIsBubbleVisible(true);
        compositor.setExpression("speak", MIC_TEST_MESSAGE);
      }

      const tickMs =
        (defaultAvatarConfig.cycleDurationMs ?? 1000) /
        defaultAvatarConfig.masterFrameCount;
      const micTestPacket = await defaultSpeechOrchestrator.preRenderSpeech(
        MIC_TEST_MESSAGE,
        tickMs,
      );
      const micTestDuration = Math.max(
        MIC_TEST_DURATION,
        micTestPacket.totalDurationMs + 400,
      );

      await new Promise((resolve) => setTimeout(resolve, micTestDuration));
      if (!isSubscribed) return;

      // All tests passed! Perform greeting ("Hi there! I am Chleo!")
      console.log(
        "[HomePage] All readiness tests passed! Performing greeting speech...",
      );
      if (!isHoveringRef.current) {
        setBubbleText(GREETING_MESSAGE);
        setIsBubbleVisible(true);
        compositor.setExpression("happy");
        compositor.setExpression("speak", GREETING_MESSAGE);
      }

      const greetingPacket = await defaultSpeechOrchestrator.preRenderSpeech(
        GREETING_MESSAGE,
        tickMs,
      );
      const greetingDuration = Math.max(
        GREETING_DURATION,
        greetingPacket.totalDurationMs + 500,
      );

      idleTimerRef.current = setTimeout(() => {
        if (!isSubscribed) return;
        if (!isHoveringRef.current) {
          setIsBubbleVisible(false);
          compositor.setExpression("idle");
        }

        idleTimerRef.current = setTimeout(() => {
          if (!isSubscribed || isHoveringRef.current) return;
          startIdleCycle();
        }, IDLE_INTERVAL);
      }, greetingDuration);
    };

    runReadinessCheckAndGreeting();

    return () => {
      isSubscribed = false;
      compositor.stop();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [startIdleCycle]);

  // Hover handlers
  const handlePanelEnter = (panel: FocusPanelConfig) => {
    isHoveringRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setHoveredPanel(panel.id);

    // Get current message index for this panel and circulate
    const currentIndex = panelMessageIndicesRef.current[panel.id] ?? 0;
    const rawMsg =
      panel.hoverMessages[currentIndex % panel.hoverMessages.length];
    panelMessageIndicesRef.current[panel.id] =
      (currentIndex + 1) % panel.hoverMessages.length;

    const messageText = typeof rawMsg === "string" ? rawMsg : rawMsg.text;
    const messageExpression =
      typeof rawMsg === "object" && rawMsg.expression
        ? rawMsg.expression
        : panel.expression || "happy";

    setBubbleText(messageText);
    setIsBubbleVisible(true);

    if (compositorRef.current) {
      compositorRef.current.setExpression(messageExpression);
      compositorRef.current.setExpression("speak", messageText);
    }
  };

  const handlePanelLeave = () => {
    isHoveringRef.current = false;
    setHoveredPanel(null);
    setIsBubbleVisible(false);

    if (compositorRef.current) {
      compositorRef.current.setExpression("idle");
    }

    idleTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        startIdleCycle();
      }
    }, IDLE_INTERVAL);
  };

  const leftPanels = FOCUS_PANELS.filter((p) => p.side === "left");
  const rightPanels = FOCUS_PANELS.filter((p) => p.side === "right");

  return (
    <div className="app-layout">
      <Header activeTab="home" />

      <main className="page-container">
        {/* Enclosing CHLEO Panel Section wrapping Header Title + Avatar Showcase + Focus Panels */}
        <section className="panel-section panel-bg-stage home-main-card">
          {/* Header Title Section */}
          <div className="hero-content">
            <h1 className="hero-title">CHLEO</h1>
            <p className="hero-subtitle">
              Interactive Desktop &amp; Browser Companion
            </p>
            <p className="hero-description">
              She monitors your digital activity, guides you toward better focus
              habits, and adds life to your workspace.
            </p>
          </div>

          {/* Avatar Showcase Container */}
          <div className="home-showcase" ref={showcaseRef}>
            {/* SVG Connecting Lines between avatar boxes and panels */}
            <svg
              className="focus-lines-svg"
              width={showcaseDimensions.width}
              height={showcaseDimensions.height}
              viewBox={`0 0 ${showcaseDimensions.width} ${showcaseDimensions.height}`}
            >
              {lines.map((line) => {
                const isActive = hoveredPanel === line.id;
                return (
                  <line
                    key={line.id}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={isActive ? "#dc2626" : "#ef4444"}
                    strokeWidth={isActive ? 3 : 2}
                    strokeDasharray={isActive ? "none" : "4 4"}
                    style={{ transition: "all 0.2s ease" }}
                  />
                );
              })}
            </svg>

            {/* Left Panels */}
            <div className="focus-panels-column focus-panels-left">
              {leftPanels.map((panel) => (
                <a
                  key={panel.id}
                  ref={(el) => {
                    panelRefs.current[panel.id] = el;
                  }}
                  href={`./blog.html#${panel.blogAnchor}`}
                  className={`focus-panel ${hoveredPanel === panel.id ? "focus-panel-active" : ""}`}
                  onMouseEnter={() => handlePanelEnter(panel)}
                  onMouseLeave={handlePanelLeave}
                >
                  <div className="focus-panel-icon">
                    <img
                      src={panel.iconSrc}
                      alt={panel.title}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="focus-panel-text">
                    <h3 className="focus-panel-title">{panel.title}</h3>
                    <p className="focus-panel-desc">{panel.description}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Center: Avatar Canvas with Speech Bubble & Red Highlight Boxes */}
            <div className="home-avatar-center">
              <div className="home-avatar-wrap">
                <div
                  className={`speech-bubble ${isBubbleVisible ? "visible" : ""}`}
                >
                  {bubbleText}
                </div>
                <div className="avatar-canvas-box">
                  <canvas ref={canvasRef} className="home-avatar-canvas" />

                  {/* Red Target Bounding Boxes on Avatar Parts */}
                  {FOCUS_PANELS.map((panel) => (
                    <div
                      key={`box-${panel.id}`}
                      ref={(el) => {
                        avatarBoxRefs.current[panel.id] = el;
                      }}
                      className={`avatar-red-box ${hoveredPanel === panel.id ? "active" : ""}`}
                      style={panel.boxStyle}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panels */}
            <div className="focus-panels-column focus-panels-right">
              {rightPanels.map((panel) => (
                <a
                  key={panel.id}
                  ref={(el) => {
                    panelRefs.current[panel.id] = el;
                  }}
                  href={`./blog.html#${panel.blogAnchor}`}
                  className={`focus-panel ${hoveredPanel === panel.id ? "focus-panel-active" : ""}`}
                  onMouseEnter={() => handlePanelEnter(panel)}
                  onMouseLeave={handlePanelLeave}
                >
                  <div className="focus-panel-icon">
                    <img
                      src={panel.iconSrc}
                      alt={panel.title}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="focus-panel-text">
                    <h3 className="focus-panel-title">{panel.title}</h3>
                    <p className="focus-panel-desc">{panel.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Project Overview & Contact */}
        <MarketplaceSection />
        <ProjectOverview />
      </main>

      <Footer />
    </div>
  );
};
