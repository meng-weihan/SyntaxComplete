import type { Node, Edge } from '@xyflow/react'

/**
 * Part-of-speech tags used by the game.
 *
 * Core tags:
 *   Det = Determiner, N = Noun, V = Verb, Adj = Adjective, Adv = Adverb,
 *   P = Preposition, Pron = Pronoun, Conj = Conjunction
 *
 * Extended tags introduced for higher levels:
 *   C        = Complementizer ("that")          — Level 4
 *   Wh       = Wh-word ("what", "who", ...)     — Level 5
 *   Aux      = Auxiliary ("did", "do", "have")  — Level 5
 *   PassPart = Passive / past participle         — Level 6 (garden path)
 */
export type POS =
  | 'Det'
  | 'N'
  | 'V'
  | 'Adj'
  | 'Adv'
  | 'P'
  | 'Pron'
  | 'Conj'
  | 'C'
  | 'Wh'
  | 'Aux'
  | 'PassPart'

/**
 * Syntactic gate / phrase category that a GateNode represents.
 *   X-bar Theory with strict DP / TP hypothesis and Null Elements.
 */
export type GateKind =
  | 'DP' | 'D-bar'
  | 'NP' | 'N-bar'
  | 'VP' | 'V-bar'
  | 'PP' | 'P-bar'
  | 'CP' | 'C-bar'
  | 'TP' | 'T-bar'
  | 'AdjP' | 'Adj-bar'
  | '∅-D' | '∅-T'       // 👈 幽灵方块（空限定词、空时态）在这里正式注册！

/**
 * A "Category" is anything that can appear as an input slot to a gate:
 * a POS tag (emitted by a WordNode), a phrase kind (emitted by a successful
 * sub-gate), or 'Trace' (emitted by a TraceNode at parse time).
 */
export type Category = POS | GateKind | 'Trace'

/**
 * Visual power state, used by the sequential "power-on" animation.
 *   undefined / 'idle' — resting
 *   'lit'              — successfully resolved, glowing green
 *   'lit-final'        — the root S-Block flash at the end of a successful parse
 */
export type PowerState = 'lit' | 'lit-final'

/** Data payload carried by a WordNode (signal source). */
export interface WordNodeData extends Record<string, unknown> {
  word: string
  /** Primary POS tag — used by default during validation. */
  pos: POS
  /**
   * Optional alternative POS tags. If present, the validator may try these
   * during backtracking (e.g. "raced" = V | PassPart in the garden-path level).
   */
  altPos?: POS[]
  /** Set true by the canvas when validation flags this node. */
  hasError?: boolean
  /** Powered-on state during the sequential RUN animation. */
  power?: PowerState
}

/** Data payload carried by a GateNode (syntactic phrase block). */
export interface GateNodeData extends Record<string, unknown> {
  /** Display label, e.g. "名词短语" (rendered in the UI). */
  label: string
  /** Underlying phrase kind. */
  kind: GateKind
  /**
   * For TP-Block dual-state distinction: when true, this is the
   * pre-placed final sentence terminus (rendered without a top Source handle).
   * When undefined/false (and kind === 'TP'), this is a subordinate clause
   * block dragged in from the palette — full input + output handles.
   */
  isTerminus?: boolean
  /** Set true by the canvas when validation flags this node. */
  hasError?: boolean
  /** Powered-on state during the sequential RUN animation. */
  power?: PowerState
}

/**
 * A Trace node — invisible "wire repeater" used to model movement (Level 5).
 * It has no inputs; it emits the same Category as the node it is bound to,
 * regardless of distance on the canvas.
 */
export interface TraceNodeData extends Record<string, unknown> {
  /** id of the antecedent node (typically the moved Wh-phrase block). */
  bindsTo: string
  /** Optional human label, e.g. "t_i". */
  label?: string
  /** Set true by the canvas when validation flags this node. */
  hasError?: boolean
  /** Powered-on state during the sequential RUN animation. */
  power?: PowerState
}

/**
 * The Sun node — the FINAL output terminus pinned to the top of every level.
 * The player's job is to wire the root TP/CP block UP into the sun. Idle = dim
 * disc; on successful parse, the sun blooms gold (driven by `glowing`).
 *
 * Behaviorally the sun is NOT a gate — the validator ignores it for grammar
 * checks but requires the root TP/CP block to feed exactly one edge into it.
 */
export interface SunNodeData extends Record<string, unknown> {
  /** When true, the sun is in its radiant victory state. */
  glowing?: boolean
}

/** Discriminated union of all node kinds rendered on the canvas. */
export type SyntaxNode =
  | Node<WordNodeData, 'wordNode'>
  | Node<GateNodeData, 'gateNode'>
  | Node<TraceNodeData, 'traceNode'>
  | Node<SunNodeData, 'sunNode'>

/** Edges connecting word signals into gates (and gates into other gates). */
export type SyntaxEdge = Edge