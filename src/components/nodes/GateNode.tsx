import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { GateNodeData } from '../../types/game' // 👈 删掉了没用到的 GateKind
import { GATE_DISPLAY_NAME, GATE_COLOR } from '../../config/levels'

// 👇 核心修改：扩充为 X-bar + DP/TP + 空集 终极版映射表
const GATE_EN_NAMES: Record<string, string> = {
  DP: 'Determiner Phrase',
  'D-bar': 'D-Bar',
  NP: 'Noun Phrase',
  'N-bar': 'N-Bar',
  VP: 'Verb Phrase',
  'V-bar': 'V-Bar',
  PP: 'Prepositional Phrase',
  'P-bar': 'P-Bar',
  CP: 'Complementizer Phrase',
  'C-bar': 'C-Bar',
  TP: 'Tense Phrase',
  'T-bar': 'T-Bar',
  AdjP: 'Adjective Phrase',
  'Adj-bar': 'Adj-Bar',
  '∅-D': 'Null Determiner', // 幽灵限定词
  '∅-T': 'Null Tense',      // 幽灵时态
}

type GateNodeType = Node<GateNodeData, 'gateNode'>

export default function GateNode({ data, selected }: NodeProps<GateNodeType>) {
  const hasError = data.hasError === true
  const power = data.power

  // 核心变更：把最高级别的句子节点识别从 'S' 换成了 'TP'
  const isSentence = data.kind === 'TP'
  const isTerminus = isSentence && data.isTerminus === true

  // 识别是不是“幽灵门（空集）”
  const isGhost = data.kind.startsWith('∅')

  const phraseColor = GATE_COLOR[data.kind] || '#94a3b8'
  const displayName = GATE_DISPLAY_NAME[data.kind] || data.kind

  const isCustom = data.label && data.label !== displayName

  let subtitle = GATE_EN_NAMES[data.kind] || data.kind
  if (isCustom) {
    if (data.label.toLowerCase() === 'wh-dp' || data.label.toLowerCase() === 'wh-np') {
      subtitle = 'Wh-Phrase'
    } else {
      subtitle = data.label
    }
  }

  return (
    <div
      className={[
        'relative rounded-2xl min-w-[170px] overflow-visible flex flex-col',
        'backdrop-blur transition-shadow duration-300',
        'cursor-grab active:cursor-grabbing',
        // 幽灵门特殊皮肤 vs 普通门皮肤
        isGhost
          ? 'bg-slate-900/40 border-2 border-dashed border-slate-500/50'
          : 'bg-slate-900/90',
        hasError
          ? 'border-2 border-solid border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.75)]'
          : power === 'lit-final'
            ? 'border-2 border-solid border-emerald-300 power-final'
            : power === 'lit'
              ? 'border-2 border-solid border-emerald-400 power-lit'
              : isTerminus
                ? 'border-2 border-solid border-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,0.35)]'
                : !isGhost ? 'border border-solid border-slate-700/80 shadow-md' : '',
        selected ? 'ring-2 ring-cyan-200/60' : '',
      ].join(' ')}
    >
      <div className="pt-4 px-5 pb-2">
        {/* 顶部色彩带 */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${phraseColor} 30%, ${phraseColor} 70%, transparent 100%)`,
            opacity: isGhost ? 0.4 : 0.85, // 幽灵门的顶条也调暗一点
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

      <div className="px-5 pb-4">
        {/* 主标题保留中文 */}
        <div className={`text-center text-lg font-bold ${isGhost ? 'text-slate-300' : 'text-slate-100'}`}>
          {displayName}
        </div>

        {/* 渲染计算好的智能副标题 */}
        <div className="mt-0.5 text-center text-[10px] tracking-widest font-mono text-slate-400/80 uppercase">
          {subtitle}
        </div>

        {/* 底部接收引脚 (Target) - 幽灵门是叶子节点，隐藏接收口！ */}
        {!isGhost && (
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
        )}

        {/* 顶部输出引脚 (Source) */}
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