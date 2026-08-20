import React from "react";
import {
  ContentHeader,
  ContentParagraph,
  ContentImage,
  ContentCallout,
  ContentToggle,
  ContentDivider,
  ContentList,
  ContentCode,
  ContentQuote,
} from "../components/content-blocks";

import PHENOME_ANALYSIS from "../public/assets/content-images/phoneme.png";
import { ContentTable } from "./ContentTable";
import { WORD_FRAME_MAP } from "../../src/avatar";

// ---------------------------------------------------------------------------
// Mouth frame sprite imports from @frames
// ---------------------------------------------------------------------------
import MOUTH_NEUTRAL from "../../src/assets/frames/mouth/mouth_neutral.png";
import MOUTH_PBM from "../../src/assets/frames/mouth/mouth_pbm.png";
import MOUTH_FV from "../../src/assets/frames/mouth/mouth_fv.png";
import MOUTH_TH from "../../src/assets/frames/mouth/mouth_th.png";
import MOUTH_TDKGN from "../../src/assets/frames/mouth/mouth_tdkgn.png";
import MOUTH_SS from "../../src/assets/frames/mouth/mouth_ss.png";
import MOUTH_CH from "../../src/assets/frames/mouth/mouth_ch.png";
import MOUTH_R from "../../src/assets/frames/mouth/mouth_r.png";
import MOUTH_A from "../../src/assets/frames/mouth/mouth_a.png";
import MOUTH_AA from "../../src/assets/frames/mouth/mouth_aa.png";
import MOUTH_AAA from "../../src/assets/frames/mouth/mouth_aaa.png";
import MOUTH_E from "../../src/assets/frames/mouth/mouth_e.png";
import MOUTH_EE from "../../src/assets/frames/mouth/mouth_ee.png";
import MOUTH_EH from "../../src/assets/frames/mouth/mouth_eh.png";
import MOUTH_EY from "../../src/assets/frames/mouth/mouth_ey.png";
import MOUTH_I from "../../src/assets/frames/mouth/mouth_i.png";
import MOUTH_O from "../../src/assets/frames/mouth/mouth_o.png";
import MOUTH_OO from "../../src/assets/frames/mouth/mouth_oo.png";
import MOUTH_U from "../../src/assets/frames/mouth/mouth_u.png";

interface VisemeDefinition {
  id: string;
  name: string;
  image: string;
  sound: string;
  type: string;
  examples: string;
}

const ALL_VISEMES: VisemeDefinition[] = [
  {
    id: "neutral",
    name: "neutral",
    image: MOUTH_NEUTRAL,
    sound: "Rest / Silence",
    type: "Silent rest position",
    examples: "— (rest, breath pause)",
  },
  {
    id: "pbm",
    name: "pbm",
    image: MOUTH_PBM,
    sound: "P, B, M",
    type: "Bilabial closure (lips pressed)",
    examples: '"bye", "my", "people", "help"',
  },
  {
    id: "fv",
    name: "fv",
    image: MOUTH_FV,
    sound: "F, V",
    type: "Labiodental (lower lip to teeth)",
    examples: '"have", "for", "feel", "five"',
  },
  {
    id: "th",
    name: "th",
    image: MOUTH_TH,
    sound: "TH / [θ, ð]",
    type: "Interdental (tongue between teeth)",
    examples: '"the", "think", "with", "three"',
  },
  {
    id: "tdkgn",
    name: "tdkgn",
    image: MOUTH_TDKGN,
    sound: "T, D, K, G, N",
    type: "Alveolar & velar stops / nasal",
    examples: '"did", "get", "take", "need"',
  },
  {
    id: "ss",
    name: "ss",
    image: MOUTH_SS,
    sound: "S, Z",
    type: "Alveolar sibilants (teeth together)",
    examples: '"this", "see", "so", "yes"',
  },
  {
    id: "ch",
    name: "ch",
    image: MOUTH_CH,
    sound: "SH, CH, J",
    type: "Post-alveolar affricates",
    examples: '"she", "much", "which", "just"',
  },
  {
    id: "r",
    name: "r",
    image: MOUTH_R,
    sound: "R",
    type: "Retroflex approximant",
    examples: '"run", "are", "right", "try"',
  },
  {
    id: "a",
    name: "a",
    image: MOUTH_A,
    sound: "A / [æ]",
    type: "Short front open vowel",
    examples: '"thank", "thanks", "cat"',
  },
  {
    id: "aa",
    name: "aa",
    image: MOUTH_AA,
    sound: "AA / [ɑː]",
    type: "Open back vowel (jaw drop)",
    examples: '"car", "father", "start", "not"',
  },
  {
    id: "aaa",
    name: "aaa",
    image: MOUTH_AAA,
    sound: "AAA (Exclamation)",
    type: "Wide open exclamatory vowel",
    examples: '"wow", "ahhh!", shouting',
  },
  {
    id: "e",
    name: "e",
    image: MOUTH_E,
    sound: "E / [ɛ]",
    type: "Mid-front open vowel",
    examples: '"bed", "red", "get", "when"',
  },
  {
    id: "ee",
    name: "ee",
    image: MOUTH_EE,
    sound: "EE / [iː]",
    type: "Close-front vowel (wide smile)",
    examples: '"see", "be", "we", "feel"',
  },
  {
    id: "eh",
    name: "eh",
    image: MOUTH_EH,
    sound: "EH / [e]",
    type: "Open-mid front vowel",
    examples: '"hello", "yes", "tell", "them"',
  },
  {
    id: "ey",
    name: "ey",
    image: MOUTH_EY,
    sound: "EY / [eɪ]",
    type: "Diphthong vowel glide",
    examples: '"hey", "say", "take", "make"',
  },
  {
    id: "i",
    name: "i",
    image: MOUTH_I,
    sound: "I / [ɪ]",
    type: "Close-mid front vowel",
    examples: '"it", "with", "big", "thing"',
  },
  {
    id: "o",
    name: "o",
    image: MOUTH_O,
    sound: "O / [oʊ]",
    type: "Mid-back rounded vowel",
    examples: '"go", "no", "so", "old"',
  },
  {
    id: "oo",
    name: "oo",
    image: MOUTH_OO,
    sound: "OO / [uː, ʊ]",
    type: "Close rounded back vowel",
    examples: '"who", "look", "good", "what"',
  },
  {
    id: "u",
    name: "u",
    image: MOUTH_U,
    sound: "U / [u]",
    type: "Close-back rounded vowel",
    examples: '"you", "to", "do", "blue"',
  },
];

const FRAME_TO_NAME: Record<string, string> = {
  [MOUTH_NEUTRAL]: "neutral",
  [MOUTH_PBM]: "pbm",
  [MOUTH_FV]: "fv",
  [MOUTH_TH]: "th",
  [MOUTH_TDKGN]: "tdkgn",
  [MOUTH_SS]: "ss",
  [MOUTH_CH]: "ch",
  [MOUTH_R]: "r",
  [MOUTH_A]: "a",
  [MOUTH_AA]: "aa",
  [MOUTH_AAA]: "aaa",
  [MOUTH_E]: "e",
  [MOUTH_EE]: "ee",
  [MOUTH_EH]: "eh",
  [MOUTH_EY]: "ey",
  [MOUTH_I]: "i",
  [MOUTH_O]: "o",
  [MOUTH_OO]: "oo",
  [MOUTH_U]: "u",
};

// Helper to render mouth sprite frame
const renderSpriteCell = (item: VisemeDefinition) => (
  <div className="cb-table-sprite-box" title={`Frame: ${item.name}`}>
    <img src={item.image} alt={item.name} className="cb-table-sprite-img" />
  </div>
);

// Helper to render viseme details
const renderInfoCell = (item: VisemeDefinition) => (
  <div className="cb-table-viseme-info">
    <div className="cb-table-viseme-head">
      <span className="cb-table-viseme-badge">{item.name}</span>
      <span className="cb-table-viseme-sound">{item.sound}</span>
    </div>
    <div className="cb-table-viseme-type">{item.type}</div>
    <div className="cb-table-viseme-example">
      <span className="cb-table-viseme-label">e.g.</span> {item.examples}
    </div>
  </div>
);

// Helper to render word badge
const renderWordCell = (word: string) => (
  <span className="cb-table-word-badge">{word}</span>
);

// Helper to render phoneme/viseme sequence flow
const renderPhonemeFlowCell = (word: string) => {
  const frames = WORD_FRAME_MAP[word]?.mouth || [];
  const visemeKeys = frames.map((f) => FRAME_TO_NAME[f] || "neutral");

  return (
    <div className="cb-table-phoneme-flow">
      {visemeKeys.map((key, idx) => (
        <React.Fragment key={idx}>
          <span className="cb-table-flow-chip">{key}</span>
          {idx < visemeKeys.length - 1 && (
            <span className="cb-table-flow-arrow">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Group 19 visemes into 4-column rows (2 visemes per row)
const buildVisemeTableRows = (): React.ReactNode[][] => {
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < ALL_VISEMES.length; i += 2) {
    const first = ALL_VISEMES[i];
    const second = ALL_VISEMES[i + 1];

    rows.push([
      renderSpriteCell(first),
      renderInfoCell(first),
      second ? (
        renderSpriteCell(second)
      ) : (
        <div className="cb-table-sprite-box cb-table-sprite-box--empty" />
      ),
      second ? (
        renderInfoCell(second)
      ) : (
        <span className="cb-table-viseme-example">—</span>
      ),
    ]);
  }
  return rows;
};

// Group all mapped words into 6-column rows (3 pairs of [Word, Phoneme Mapping])
const buildPhonemeMappingRows = (): React.ReactNode[][] => {
  const words = Object.keys(WORD_FRAME_MAP).sort();
  const rows: React.ReactNode[][] = [];

  for (let i = 0; i < words.length; i += 3) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];

    rows.push([
      renderWordCell(w1),
      renderPhonemeFlowCell(w1),
      w2 ? renderWordCell(w2) : <span className="cb-table-flow-empty">—</span>,
      w2 ? (
        renderPhonemeFlowCell(w2)
      ) : (
        <span className="cb-table-flow-empty">—</span>
      ),
      w3 ? renderWordCell(w3) : <span className="cb-table-flow-empty">—</span>,
      w3 ? (
        renderPhonemeFlowCell(w3)
      ) : (
        <span className="cb-table-flow-empty">—</span>
      ),
    ]);
  }
  return rows;
};

const VISEME_COLUMNS = [
  { header: "Frame", width: "68px", align: "center" as const },
  { header: "Viseme Type & Example", width: "auto" },
  { header: "Frame", width: "68px", align: "center" as const },
  { header: "Viseme Type & Example", width: "auto" },
];

const PHONEME_COLUMNS = [
  { header: "Word", width: "90px" },
  { header: "Phoneme Mapping", width: "auto" },
  { header: "Word", width: "90px" },
  { header: "Phoneme Mapping", width: "auto" },
  { header: "Word", width: "90px" },
  { header: "Phoneme Mapping", width: "auto" },
];

const SpeechFeatureContent: React.FC<{ icon: string }> = ({ icon }) => {
  const visemeTableData = React.useMemo(() => buildVisemeTableRows(), []);
  const phonemeTableData = React.useMemo(() => buildPhonemeMappingRows(), []);
  const totalWords = Object.keys(WORD_FRAME_MAP).length;

  return (
    <div className="feature-detail-blocks">
      {/* Hero header */}
      <ContentHeader
        title="Speech System"
        subtitle="Nuanced and realistic speech animation powered by viseme mapping and phoneme analysis."
        icon={<img src={icon} alt="Speech" className="cb-header__icon-img" />}
        level={1}
      />

      <ContentDivider />

      {/* Lead intro */}
      <ContentParagraph variant="lead">
        CHLEO's speech system transforms text into lifelike mouth animations by
        mapping each spoken phoneme to a corresponding viseme — a visual
        representation of mouth shape. This creates the illusion of natural
        speech without requiring pre-recorded lip-sync animation.
      </ContentParagraph>

      {/* Callout — how it works */}
      <ContentCallout variant="info">
        A <strong>viseme</strong> is a generic facial image that represents a
        particular speech sound. CHLEO uses 19 distinct visemes to cover the
        full range of English phonemes, blending between them for smooth
        transitions.
      </ContentCallout>

      <ContentDivider label="How It Works" />

      {/* Two-column overview */}
      <div>
        <ContentHeader title="Phoneme Analysis" level={3} />
        <ContentParagraph>
          The input text is first broken down into individual phonemes using a
          dictionary-based lookup. Each word is decomposed into its constituent
          sounds, which are then queued for sequential playback.
        </ContentParagraph>
        <ContentImage
          src={PHENOME_ANALYSIS}
          alt="Phoneme Analysis"
          caption="Step by Step breakdown of phoneme analysis"
          variant="framed"
        />
      </div>

      {/* 6-column scrollable word-to-phoneme dictionary table */}
      <ContentTable
        title="Phoneme Mapping Dictionary"
        subtitle="Pre-computed word-to-phoneme viseme sequences extracted from speak-frame-map.ts."
        badge={`${totalWords} Words`}
        columns={PHONEME_COLUMNS}
        data={phonemeTableData}
        scrollable={true}
        maxHeight="380px"
        footer={`* ${totalWords} vocabulary entries mapped to real-time viseme animation sequences.`}
      />

      {/* 4-column scrollable viseme mapping table */}
      <ContentTable
        title="Viseme Frame Reference Table"
        subtitle="All 19 mouth sprite frames extracted from @frames/mouth with phoneme groupings, articulation types, and example words."
        badge="19 Visemes"
        columns={VISEME_COLUMNS}
        data={visemeTableData}
        scrollable={true}
        maxHeight="380px"
        footer="* Based on Meta OVRLipSync viseme standards and customized pixel mouth sprite mapping."
      />

      <ContentDivider label="Technical Details" />

      <ContentToggle title="Speech Engine Configuration">
        <ContentParagraph>
          The speech engine exposes several tunable parameters that control the
          pace, smoothness, and behavior of the animation playback.
        </ContentParagraph>
        <ContentList
          variant="checklist"
          items={[
            "Speed — Controls how fast visemes transition (50ms – 200ms per frame)",
            "Smoothing — Enables interpolation between viseme frames",
            "Pause duration — How long to hold on silence markers",
            "Loop mode — Whether to repeat the last phrase continuously",
          ]}
        />
      </ContentToggle>

      <ContentDivider />

      {/* Block quote */}
      <ContentQuote attribution="Design Philosophy">
        Speech is more than just words — it's the subtle dance of lips, tongue,
        and breath that gives a character presence. Every viseme frame is
        crafted to feel alive, not mechanical.
      </ContentQuote>

      {/* Final note */}
      <ContentCallout variant="tip">
        You can test the speech system live in the <strong>Playground</strong>{" "}
        tab! Type any text, hit Speak, and watch the visemes animate in
        real-time.
      </ContentCallout>
    </div>
  );
};

export default SpeechFeatureContent;
