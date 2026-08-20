import type { AvatarConfig } from "./sprite-types";

import SPRITE_BODY_IDLE from "../assets/sprites/body/body_idle.png";
import SPRITE_EYES_IDLE from "../assets/sprites/eyes/eyes_idle.png";
import SPRITE_EYES_BLINK from "../assets/sprites/eyes/eyes_blink.png";
import SPRITE_MOUTH_IDLE from "../assets/sprites/mouth/mouth_idle.png";
import SPRITE_MOUTH_SPEAK from "../assets/sprites/mouth/mouth_speak.png";
import SPRITE_BROWS_IDLE from "../assets/sprites/brows/brows_idle.png";
import SPRITE_BROWS_QUESTION from "../assets/frames/brows/brows_ru.png";
import FRAME_BROWS_DOWN from "../assets/frames/brows/brows_tg.png";
import FRAME_BROWS_UP from "../assets/frames/brows/brows_bu.png";
import FRAME_EYES_OPENED from "../assets/frames/eyes/eyes_wide.png";
import FRAME_EYES_HALFCLOSED from "../assets/frames/eyes/eyes_bhc.png";
import FRAME_EYES_RIGHT_HALFCLOSED from "../assets/frames/eyes/eyes_rhc.png";

export const defaultAvatarConfig: AvatarConfig = {
  canvasWidth: 64,
  canvasHeight: 64,
  masterFrameCount: 6,
  cycleDurationMs: 1000,
  scale: 2,

  parts: {
    body: {
      basePosition: { x: 0, y: 0 },
      animations: {
        idle: {
          type: "spritesheet",
          src: SPRITE_BODY_IDLE,
          frameCount: 6,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        sleep: {
          type: "spritesheet",
          src: SPRITE_BODY_IDLE,
          frameCount: 6,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
      },
      defaultAnimation: "idle",
    },

    eyes: {
      basePosition: { x: 0, y: 0 },
      animations: {
        idle: {
          type: "spritesheet",
          src: SPRITE_EYES_IDLE,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        blink: {
          type: "spritesheet",
          src: SPRITE_EYES_BLINK,
          frameCount: 3,
          frameWidth: 64,
          frameHeight: 64,
          loop: "once",
        },
        close_eyes: {
          type: "spritesheet",
          src: SPRITE_EYES_BLINK,
          frameCount: 3,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        sleep: {
          type: "spritesheet",
          src: SPRITE_EYES_BLINK,
          frameCount: 3,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        focused: {
          type: "framearray",
          srcArray: [FRAME_EYES_HALFCLOSED],
        },
        question: {
          type: "framearray",
          srcArray: [FRAME_EYES_RIGHT_HALFCLOSED],
        },
        happy: {
          type: "framearray",
          srcArray: [FRAME_EYES_OPENED],
        },
      },
      defaultAnimation: "idle",
    },

    mouth: {
      basePosition: { x: 0, y: 0 },
      animations: {
        idle: {
          type: "spritesheet",
          src: SPRITE_MOUTH_IDLE,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        speak: {
          // Dynamically composed at runtime by SpeechOrchestrator from TTS timing.
          // This is a placeholder slot; srcArray is injected by playSpeakSequence().
          type: "framearray",
          srcArray: null,
          loop: "once",
        },
        yawn: {
          type: "spritesheet",
          src: SPRITE_MOUTH_SPEAK,
          frameCount: 6,
          frameWidth: 64,
          frameHeight: 64,
          loop: "once",
        },
      },
      defaultAnimation: "idle",
    },

    eyebrows: {
      basePosition: { x: 0, y: 0 },
      animations: {
        idle: {
          type: "spritesheet",
          src: SPRITE_BROWS_IDLE,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          loop: "infinite",
        },
        angry: {
          type: "spritesheet",
          src: FRAME_BROWS_DOWN,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          frameOffsets: [{ x: 0, y: 1 }],
          loop: "infinite",
        },
        focused: {
          type: "framearray",
          srcArray: [FRAME_BROWS_DOWN],
          frameOffsets: [{ x: 0, y: 1 }],
        },
        happy: {
          type: "framearray",
          srcArray: [FRAME_BROWS_UP],
        },
        question: {
          type: "spritesheet",
          src: SPRITE_BROWS_QUESTION,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          frameOffsets: [{ x: 0, y: 0 }],
          loop: "once",
        },
      },
      defaultAnimation: "idle",
    },
  },

  // Keyframe offsets shift non-body parts to sync breathing motion.
  globalKeyframeOffsets: {
    3: {
      eyes: { x: 0, y: 1 },
      mouth: { x: 0, y: 1 },
      eyebrows: { x: 0, y: 1 },
    },
    4: {
      eyes: { x: 0, y: 1 },
      mouth: { x: 0, y: 1 },
      eyebrows: { x: 0, y: 1 },
    },
    5: {
      eyes: { x: 0, y: 1 },
      mouth: { x: 0, y: 1 },
      eyebrows: { x: 0, y: 1 },
    },
  },
};
