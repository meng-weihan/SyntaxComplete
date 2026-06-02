import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { GateNodeData } from '../../types/game'

type GateNodeType = Node<GateNodeData, 'gateNode'>

/**
 * A "syntactic chip" — a phrase gate (NP / VP / PP / ...).
 * Has one Target handle (left, input) and one Source handle (right, output),
 * so chips can be chained into deeper structures.
 */
export default function GateNode({ data, selected }: NodeProps<GateNodeType>) {
  return (
    <div
      className={[
        'relative rounded-2xl px-5 py-4 min-w-[160px]',
        'bg-gradient-to-br from-purple-900/80 via-slate-900/90 to-slate-900/90',
        'border border-purple-400/50 shadow-chip',
        selected ? 'ring-2 ring-purple-300' : '',
      ].join(' ')}
    >
      <div className="absolute inset-x-3 top-1 h-[2px] bg-gradient-to-r from-transparent via-purple-300/70 to-transparent" />
      <div className="absolute inset-x-3 bottom-1 h-[2px] bg-gradient-to-r from-transparent via-purple-300/40 to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-purple-300/80 font-mono">
          chip
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-purple-300/80 font-mono">
          {data.kind}
        </span>
      </div>
      <div className="mt-1 text-center text-xl font-bold text-slate-100 font-mono tracking-wider">
        {data.label}
      </div>
      <div className="mt-1 text-center text-[10px] uppercase tracking-widest text-purple-300/60 font-mono">
        syntax · gate
      </div>

      <Handle
        type="target"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-100"
      />
      <Handle
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-100"
      />
    </div>
  )
}
