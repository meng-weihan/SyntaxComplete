import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { WordNodeData, POS } from '../../types/game'

/** Color hint per POS tag — kept tiny on purpose. */
const POS_COLORS: Record<POS, string> = {
  Det: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
  N: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  V: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
  Adj: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  Adv: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
  P: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
  Pron: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
  Conj: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40',
  C: 'bg-violet-500/20 text-violet-300 border-violet-400/40',
  Wh: 'bg-pink-500/20 text-pink-300 border-pink-400/40',
  Aux: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
  PassPart: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
}

type WordNodeType = Node<WordNodeData, 'wordNode'>

/**
 * A "signal source" card: a single lexical item with a POS tag.
 * Exposes a single Source handle on its right edge.
 */
export default function WordNode({ data, selected }: NodeProps<WordNodeType>) {
  const posClass = POS_COLORS[data.pos] ?? 'bg-slate-500/20 text-slate-300 border-slate-400/40'
  const hasError = data.hasError === true

  return (
    <div
      className={[
        'relative rounded-xl border bg-slate-900/90 backdrop-blur',
        'px-4 py-3 min-w-[140px]',
        // Border + glow react to validation state — but the wrapper NEVER sets
        // pointer-events:none, so handles remain interactable in every state.
        hasError
          ? 'border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.7)]'
          : 'border-cyan-400/40 shadow-neon',
        selected ? 'ring-2 ring-cyan-300' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold text-slate-100 tracking-wide">
          {data.word}
        </span>
        <span
          className={[
            'text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border font-mono',
            posClass,
          ].join(' ')}
        >
          {data.pos}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-cyan-400/70 font-mono">
        signal · src
      </div>

      <Handle
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-100 !shadow-neon"
      />
    </div>
  )
}
