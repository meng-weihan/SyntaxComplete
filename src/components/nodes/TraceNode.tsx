import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { TraceNodeData } from '../../types/game'

type TraceNodeType = Node<TraceNodeData, 'traceNode'>

/**
 * A "trace" — invisible repeater. No inputs of its own; emits the same
 * category as its bound antecedent. Used to model wh-movement.
 *
 * Visually we render it as a small dashed circle marked t_i.
 */
export default function TraceNode({ data, selected }: NodeProps<TraceNodeType>) {
  return (
    <div
      className={[
        'relative rounded-full w-16 h-16 flex items-center justify-center',
        'bg-slate-900/70 border-2 border-dashed border-amber-300/70',
        'shadow-[0_0_12px_rgba(252,211,77,0.45)]',
        selected ? 'ring-2 ring-amber-300' : '',
      ].join(' ')}
      title={`Trace bound to ${data.bindsTo}`}
    >
      <span className="text-amber-300 font-mono text-sm">
        {data.label ?? 't'}
        <sub className="text-[10px]">i</sub>
      </span>

      {/* Only a source handle — a trace emits but never consumes. */}
      <Handle
        type="source"
        position={Position.Top}
        className={[
          '!w-5 !h-5 !bg-amber-300 !border-2 !border-amber-100 !rounded-full',
          'transition-transform duration-150 ease-out',
          'hover:!scale-125 hover:!shadow-[0_0_14px_#fcd34d]',
          'cursor-crosshair',
        ].join(' ')}
        style={{ top: '-10px', zIndex: 20 }}
      />
    </div>
  )
}
