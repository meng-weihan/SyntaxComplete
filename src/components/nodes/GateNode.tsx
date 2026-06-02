import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { GateNodeData } from '../../types/game'
import { GATE_DISPLAY_NAME, GATE_COLOR } from '../../config/levels'

type GateNodeType = Node<GateNodeData, 'gateNode'>

export default function GateNode({ data, selected }: NodeProps<GateNodeType>) {
  const hasError = data.hasError === true
  const power = data.power
  const isSentence = data.kind === 'S'
  const isTerminus = isSentence && data.isTerminus === true

  const phraseColor = GATE_COLOR[data.kind]
  const displayName = GATE_DISPLAY_NAME[data.kind]

  return (
    <div
      className={[
        'relative rounded-2xl min-w-[170px] overflow-visible flex flex-col',
        'bg-slate-900/90 backdrop-blur transition-shadow duration-300',
        'cursor-grab active:cursor-grabbing', // <-- 将手势移到根组件
        hasError
          ? 'border-2 border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.75)]'
          : power === 'lit-final'
            ? 'border-2 border-emerald-300 power-final'
            : power === 'lit'
              ? 'border-2 border-emerald-400 power-lit'
              : isTerminus
                ? 'border-2 border-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,0.35)]'
                : 'border border-slate-700/80 shadow-md',
        selected ? 'ring-2 ring-cyan-200/60' : '',
      ].join(' ')}
    >
      <div className="pt-4 px-5 pb-2">
        {/* 顶部色彩带 */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${phraseColor} 30%, ${phraseColor} 70%, transparent 100%)`,
            opacity: 0.85,
          }}
        />

        {isTerminus && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full border border-amber-300/80 bg-amber-300/15 text-amber-200 text-[10px] tracking-[0.3em] uppercase font-semibold shadow-[0_0_10px_rgba(252,211,77,0.4)] whitespace-nowrap">
            TERMINUS · 最终终点
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: phraseColor }}>
            {data.kind}
          </span>
        </div>
      </div>

      {/* 彻底移除了 nodrag */}
      <div className="px-5 pb-4">
        <div className="text-center text-lg font-bold text-slate-100">
          {displayName}
        </div>
        <div className="mt-0.5 text-center text-[10px] tracking-widest text-slate-400">
          {data.label}
        </div>

        {/* 底部接收引脚 (Target) - 隐形大触区 (32x32) */}
        <Handle
          type="target"
          position={Position.Bottom}
          className="group !w-8 !h-8 !bg-transparent !border-0 flex items-center justify-center !min-w-0 !min-h-0 cursor-crosshair z-50"
          style={{ bottom: '-16px' }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-all duration-200 ease-out group-hover:scale-[1.75]"
            style={{ backgroundColor: phraseColor, boxShadow: `0 0 10px ${phraseColor}` }}
          />
        </Handle>

        {/* 顶部输出引脚 (Source) - 非终点状态时渲染 */}
        {!isTerminus && (
          <Handle
            type="source"
            position={Position.Top}
            className="group !w-8 !h-8 !bg-transparent !border-0 flex items-center justify-center !min-w-0 !min-h-0 cursor-crosshair z-50"
            style={{ top: '-16px' }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-all duration-200 ease-out group-hover:scale-[1.75]"
              style={{ backgroundColor: phraseColor, boxShadow: `0 0 10px ${phraseColor}` }}
            />
          </Handle>
        )}
      </div>
    </div>
  )
}