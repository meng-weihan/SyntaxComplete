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
 *   NP = Noun Phrase, VP = Verb Phrase, PP = Prepositional Phrase,
 *   AdjP = Adjective Phrase, S = Sentence, CP = Complementizer Phrase.
 */
export type GateKind = 'NP' | 'VP' | 'PP' | 'AdjP' | 'S' | 'CP'

/**
 * A "Category" is anything that can appear as an input slot to a gate:
 * a POS tag (emitted by a WordNode), a phrase kind (emitted by a successful
 * sub-gate), or 'Trace' (emitted by a TraceNode at parse time).
 */
export type Category = POS | GateKind | 'Trace'

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
}

/** Data payload carried by a GateNode (syntactic chip / logic gate). */
export interface GateNodeData extends Record<string, unknown> {
  /** Display label, e.g. "NP-Gate". */
  label: string
  /** Underlying gate kind / phrase category. */
  kind: GateKind
  /** Set true by the canvas when validation flags this node. */
  hasError?: boolean
}

/**
 * A Trace node — invisible "wire repeater" used to model movement (Level 5).
 * It has no inputs; it emits the same Category as the node it is bound to,
 * regardless of distance on the canvas.
 */
export interface TraceNodeData extends Record<string, unknown> {
  /** id of the antecedent node (typically the moved Wh-phrase gate). */
  bindsTo: string
  /** Optional human label, e.g. "t_i". */
  label?: string
  /** Set true by the canvas when validation flags this node. */
  hasError?: boolean
}

/** Discriminated union of all node kinds rendered on the canvas. */
export type SyntaxNode =
  | Node<WordNodeData, 'wordNode'>
  | Node<GateNodeData, 'gateNode'>
  | Node<TraceNodeData, 'traceNode'>

/** Edges connecting word signals into gates (and gates into other gates). */
export type SyntaxEdge = Edge
