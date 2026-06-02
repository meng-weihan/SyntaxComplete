import type { Node, Edge } from '@xyflow/react'

/**
 * Part-of-speech tags used by the game.
 * Det = Determiner, N = Noun, V = Verb, Adj = Adjective, Adv = Adverb,
 * P = Preposition, Pron = Pronoun, Conj = Conjunction.
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

/**
 * Syntactic gate / phrase category that a GateNode represents.
 * NP = Noun Phrase, VP = Verb Phrase, PP = Prepositional Phrase,
 * AdjP = Adjective Phrase, S = Sentence.
 */
export type GateKind = 'NP' | 'VP' | 'PP' | 'AdjP' | 'S'

/** Data payload carried by a WordNode (signal source). */
export interface WordNodeData extends Record<string, unknown> {
  word: string
  pos: POS
}

/** Data payload carried by a GateNode (syntactic chip / logic gate). */
export interface GateNodeData extends Record<string, unknown> {
  /** Display label, e.g. "NP-Gate". */
  label: string
  /** Underlying gate kind / phrase category. */
  kind: GateKind
}

/** Discriminated union of all node kinds rendered on the canvas. */
export type SyntaxNode =
  | Node<WordNodeData, 'wordNode'>
  | Node<GateNodeData, 'gateNode'>

/** Edges connecting word signals into gates (and gates into other gates). */
export type SyntaxEdge = Edge
