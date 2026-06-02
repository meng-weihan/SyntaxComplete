import type { GateKind, POS, Category } from '../types/game'

// ─────────────────────────────────────────────────────────────────────────────
// Grammar pattern DSL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single slot in a PSR (Phrase Structure Rule).
 *
 *   cat: an array of acceptable categories — e.g. ['NP','CP'] means "NP or CP".
 *        A singleton like ['Det'] is the most common case.
 *   q:   quantifier governing this slot:
 *          '1' = exactly one (default)
 *          '?' = zero or one
 *          '*' = zero or more
 *          '+' = one or more
 */
export interface PSRSlot {
  cat: Category[]
  q?: '1' | '?' | '*' | '+'
}

/** A full Phrase Structure Rule: gate kind ← ordered sequence of slots. */
export type PSR = PSRSlot[]

/** Convenience constructors so the level grammar reads like a CFG. */
export const one = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '1' })
export const opt = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '?' })
export const star = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '*' })
export const plus = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '+' })

// ─────────────────────────────────────────────────────────────────────────────
// Default grammar (used by every level unless overridden)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GRAMMAR: Partial<Record<GateKind, PSR>> = {
  // NP → Det? Adj* N PP*
  NP: [opt('Det'), star('Adj'), one('N', 'Pron'), star('PP')],
  // VP → V (NP | CP)? PP* Adv*
  VP: [one('V'), opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
  // PP → P NP
  PP: [one('P'), one('NP', 'Trace')],
  // CP → C S
  CP: [one('C'), one('S')],
  // S  → NP VP
  S: [one('NP', 'Trace'), one('VP')],
  // AdjP → Adv* Adj
  AdjP: [star('Adv'), one('Adj')],
}

// ─────────────────────────────────────────────────────────────────────────────
// Level configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailableWord {
  /** Stable id used by INITIAL_NODES; auto-generated if omitted. */
  id?: string
  word: string
  pos: POS
  /**
   * Optional alternative POS tags for ambiguous words (garden-path puzzles).
   * The validator may try these during backtracking.
   */
  altPos?: POS[]
}

export interface AvailableGate {
  kind: GateKind
  /** How many copies of this chip the player may place. */
  count: number
}

export interface Level {
  id: number
  title: string
  description: string
  /** Canonical target sentence the player must "wire up". */
  targetSentence: string
  /** Linguistic hint shown in the side panel. */
  hint?: string
  availableWords: AvailableWord[]
  availableGates: AvailableGate[]
  /**
   * Per-level grammar overrides. Merged on top of DEFAULT_GRAMMAR — useful
   * for levels that intentionally extend (Level 6 reduced relatives) or
   * restrict (Level 1 forbids PP recursion) the default rules.
   */
  grammarOverrides?: Partial<Record<GateKind, PSR>>
  /**
   * Whether this level enables Trace nodes / movement.
   * Levels that don't enable it will reject Trace nodes during validation.
   */
  allowTraces?: boolean
  /**
   * Whether the validator should attempt POS-backtracking when a word
   * carries altPos. On by default — turn off to make a level strict.
   */
  allowPOSBacktracking?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// The six levels
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS: Level[] = [
  // ── Level 1: basic SVO ──────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Level 1 — First Light',
    description:
      'Wire up the simplest sentence in the universe: a determiner, two nouns, one verb.',
    targetSentence: 'The robot built a tree.',
    hint: 'S → NP VP. Each NP needs a Det and an N.',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'robot', pos: 'N' },
      { word: 'built', pos: 'V' },
      { word: 'a', pos: 'Det' },
      { word: 'tree', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 2 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    // Strip extras from default grammar — no PP recursion, no CP, no traces.
    grammarOverrides: {
      NP: [opt('Det'), one('N')],
      VP: [one('V'), opt('NP')],
    },
  },

  // ── Level 2: linear modification (Adj inside NP) ───────────────────────────
  {
    id: 2,
    title: 'Level 2 — Adjective Drift',
    description:
      'NP-Gates now accept adjective stacks. Mind the linear order: Det → Adj* → N.',
    targetSentence: 'The smart robot built a tree.',
    hint: 'NP → Det? Adj* N. Order on the canvas (left → right) IS word order.',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'smart', pos: 'Adj' },
      { word: 'robot', pos: 'N' },
      { word: 'built', pos: 'V' },
      { word: 'a', pos: 'Det' },
      { word: 'tree', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 2 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    grammarOverrides: {
      NP: [opt('Det'), star('Adj'), one('N')],
      VP: [one('V'), opt('NP')],
    },
  },

  // ── Level 3: PP recursion ───────────────────────────────────────────────────
  {
    id: 3,
    title: 'Level 3 — Prepositional Recursion',
    description:
      'PPs can attach to both NP and VP. Build "in the box" once, plug it in twice if you dare.',
    targetSentence: 'The robot built a tree in the box.',
    hint: 'PP → P NP. NP can take trailing PP*. So can VP.',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'robot', pos: 'N' },
      { word: 'built', pos: 'V' },
      { word: 'a', pos: 'Det' },
      { word: 'tree', pos: 'N' },
      { word: 'in', pos: 'P' },
      { word: 'the', pos: 'Det' },
      { word: 'box', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'VP', count: 1 },
      { kind: 'PP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    // Use default NP/VP/PP — they already cover PP*.
  },

  // ── Level 4: CP / embedded clause ──────────────────────────────────────────
  {
    id: 4,
    title: 'Level 4 — Embedded Universe',
    description:
      '"that" wraps a full S inside a CP, and VP can swallow that CP whole. Recursion ahoy.',
    targetSentence: 'Lisa said that the robot built a tree.',
    hint: 'CP → C S. VP → V (NP | CP).',
    availableWords: [
      { word: 'Lisa', pos: 'N' },
      { word: 'said', pos: 'V' },
      { word: 'that', pos: 'C' },
      { word: 'the', pos: 'Det' },
      { word: 'robot', pos: 'N' },
      { word: 'built', pos: 'V' },
      { word: 'a', pos: 'Det' },
      { word: 'tree', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'VP', count: 2 },
      { kind: 'CP', count: 1 },
      { kind: 'S', count: 2 },
    ],
  },

  // ── Level 5: wh-movement / Trace ───────────────────────────────────────────
  {
    id: 5,
    title: 'Level 5 — Ghost in the Object Slot',
    description:
      '"What" has been moved to the front of the clause. Drop a Trace where its object used to be — the Trace will teleport the Wh-NP signal back into the VP.',
    targetSentence: 'What did the robot build?',
    hint:
      'Build an NP for "What", bind a Trace to it, then place the Trace as the object of "build". Top gate is a CP whose specifier is the Wh-NP.',
    availableWords: [
      { word: 'What', pos: 'Wh' },
      { word: 'did', pos: 'Aux' },
      { word: 'the', pos: 'Det' },
      { word: 'robot', pos: 'N' },
      { word: 'build', pos: 'V' },
    ],
    availableGates: [
      { kind: 'NP', count: 2 }, // one for "what", one for "the robot"
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
      { kind: 'CP', count: 1 },
    ],
    allowTraces: true,
    grammarOverrides: {
      // NP can also wrap a bare Wh.
      NP: [opt('Det'), star('Adj'), one('N', 'Pron', 'Wh')],
      // VP's object slot may be filled by a Trace (already true in default,
      // restated here for clarity).
      VP: [one('V'), opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
      // For a wh-question we allow:  CP → NP Aux S
      // (NP being the fronted Wh-NP, S being the body the trace lives inside.)
      CP: [one('NP'), opt('Aux'), one('S')],
    },
  },

  // ── Level 6: garden path — backtracking required ───────────────────────────
  {
    id: 6,
    title: 'Level 6 — The Horse Raced Past the Barn',
    description:
      'Classic garden-path. "raced" is BOTH a finite verb and a past participle. ' +
      'The naive parse strands "fell". Backtrack: read "raced past the barn" as a ' +
      'reduced relative clause modifying "horse".',
    targetSentence: 'The horse raced past the barn fell.',
    hint:
      'Enable NP with a trailing reduced-relative slot: NP → Det? Adj* N (PassPart PP)?. ' +
      'Then the main VP is just "fell".',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'horse', pos: 'N' },
      // raced is ambiguous: V (finite past) vs PassPart (reduced relative head)
      { word: 'raced', pos: 'V', altPos: ['PassPart'] },
      { word: 'past', pos: 'P' },
      { word: 'the', pos: 'Det' },
      { word: 'barn', pos: 'N' },
      { word: 'fell', pos: 'V' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'PP', count: 1 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    allowPOSBacktracking: true,
    grammarOverrides: {
      // The crucial rule: NP can carry an optional [PassPart PP] tail
      // (a reduced relative clause: "the horse [raced past the barn]").
      NP: [
        opt('Det'),
        star('Adj'),
        one('N'),
        opt('PassPart'),
        star('PP'),
      ],
      VP: [one('V'), opt('NP'), star('PP'), star('Adv')],
    },
  },
]

/** Convenience: look a level up by id, falling back to Level 1. */
export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}

/** Resolve the effective grammar for a given level (defaults + overrides). */
export function grammarForLevel(level: Level): Record<GateKind, PSR> {
  const merged: Partial<Record<GateKind, PSR>> = {
    ...DEFAULT_GRAMMAR,
    ...(level.grammarOverrides ?? {}),
  }
  return merged as Record<GateKind, PSR>
}
