/**
 * Offline Word Bank for Typing Puzzle.
 * 350+ clean, curated lowercase words ranging across common English,
 * tech, productivity, programming, and everyday terms.
 */
export const TYPING_WORD_BANK: readonly string[] = [
  'pixel', 'focus', 'clean', 'code', 'stream', 'matrix', 'engine', 'screen',
  'vector', 'sprite', 'memory', 'target', 'action', 'energy', 'puzzle', 'system',
  'binary', 'branch', 'buffer', 'button', 'canvas', 'cursor', 'dialog', 'domain',
  'export', 'import', 'layout', 'module', 'motion', 'native', 'option', 'packet',
  'prompt', 'record', 'render', 'reward', 'router', 'server', 'signal', 'socket',
  'source', 'status', 'string', 'syntax', 'toggle', 'vector', 'viseme', 'widget',
  'window', 'arcade', 'avatar', 'beacon', 'bounce', 'bridge', 'castle', 'circle',
  'clouds', 'coffee', 'cosmic', 'crater', 'crystal', 'cyber', 'desert', 'dragon',
  'dynamo', 'empire', 'falcon', 'flame', 'forest', 'galaxy', 'garden', 'glitch',
  'goblin', 'guitar', 'harbor', 'hazard', 'island', 'jungle', 'knight', 'lagoon',
  'legend', 'liquid', 'lizard', 'meteor', 'monkey', 'nebula', 'ninja', 'oasis',
  'palace', 'parrot', 'planet', 'portal', 'potion', 'prism', 'quasar', 'quest',
  'rabbit', 'radar', 'radiant', 'ranger', 'reboot', 'relic', 'retro', 'rhino',
  'rhythm', 'robot', 'rocket', 'runner', 'safari', 'samurai', 'scanner', 'sensor',
  'shadow', 'shield', 'signal', 'silver', 'sketch', 'sorcery', 'spark', 'sphere',
  'spirit', 'splash', 'spring', 'static', 'stream', 'strider', 'stride', 'strike',
  'sunset', 'swamp', 'sword', 'symbol', 'temple', 'thunder', 'timber', 'titan',
  'torque', 'totem', 'tracker', 'trail', 'tunnel', 'turret', 'twilight', 'tycoon',
  'typhoon', 'unicorn', 'upgrade', 'valley', 'vapor', 'velvet', 'vessel', 'victor',
  'viking', 'village', 'vintage', 'violet', 'viper', 'vortex', 'voyage', 'vulcan',
  'walrus', 'warrior', 'wave', 'weapon', 'wizard', 'wonder', 'worker', 'wraith',
  'zenith', 'zephyr', 'zigzag', 'zodiac', 'anchor', 'beacon', 'blaster', 'blitz',
  'breeze', 'bullet', 'canyon', 'charge', 'chaser', 'chrome', 'cipher', 'clover',
  'comet', 'copper', 'coral', 'cosmos', 'crush', 'cyclone', 'dagger', 'dancer',
  'dart', 'dash', 'dawn', 'depth', 'disco', 'diver', 'drift', 'dune',
  'echo', 'edge', 'ember', 'enigma', 'epoch', 'escape', 'ether', 'flash',
  'fleet', 'flight', 'flint', 'flux', 'forge', 'frost', 'fury', 'fuse',
  'gadget', 'gear', 'gem', 'glide', 'glow', 'gold', 'grail', 'granite',
  'grid', 'grove', 'guard', 'guide', 'hammer', 'haven', 'hawk', 'heart',
  'helix', 'helmet', 'hero', 'honey', 'horizon', 'hound', 'hover', 'hunter',
  'hybrid', 'hyper', 'ignite', 'impact', 'impulse', 'inferno', 'infinity', 'iron',
  'jade', 'jaguar', 'jet', 'jolt', 'journey', 'karma', 'keeper', 'kinetic',
  'lance', 'laser', 'lava', 'leader', 'leap', 'light', 'lightning', 'linear',
  'lunar', 'lynx', 'magic', 'magnet', 'mantle', 'marble', 'marine', 'marsh',
  'master', 'maximum', 'mecha', 'mirage', 'mirror', 'momentum', 'monarch', 'moon',
  'mystic', 'neon', 'nexus', 'night', 'nitro', 'nomad', 'nova', 'oasis',
  'ocean', 'omega', 'optics', 'oracle', 'orbit', 'origin', 'outlaw', 'ozone',
  'panda', 'panther', 'paragon', 'path', 'patrol', 'peak', 'pearl', 'phantom',
  'phoenix', 'pilot', 'pioneer', 'plasma', 'polar', 'pulse', 'pyramid', 'quantum',
  'quartz', 'quiver', 'radar', 'radiance', 'radius', 'raider', 'ranger', 'raptor',
  'ray', 'realm', 'recon', 'rebel', 'rider', 'rift', 'ripple', 'river',
  'rover', 'ruby', 'rune', 'rush', 'saber', 'sailor', 'sapphire', 'satellite'
] as const;

/**
 * Returns a random word from the dictionary, optionally excluding the previous word
 * to avoid immediate duplicates.
 */
export function getRandomWord(exclude?: string): string {
  const bank = TYPING_WORD_BANK;
  if (bank.length <= 1) return bank[0] || 'chleo';

  let candidate: string;
  let attempts = 0;
  do {
    const idx = Math.floor(Math.random() * bank.length);
    candidate = bank[idx];
    attempts++;
  } while (candidate === exclude && attempts < 10);

  return candidate;
}
