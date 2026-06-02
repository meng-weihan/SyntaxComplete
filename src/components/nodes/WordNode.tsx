import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import type { WordNodeData, POS } from '../../types/game'

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

export default function WordNode({ id, data, selected }: NodeProps<WordNodeType>) {
  const { setNodes } = useReactFlow() // 引入强大的钩子

  const posClass = POS_COLORS[data.pos] ?? 'bg-slate-500/20 text-slate-300 border-slate-400/40'
  const hasError = data.hasError === true
  const power = data.power

  // 判断是否拥有备选词性（即是否是个“歧义词”）
  const hasAltPos = data.altPos && data.altPos.length > 0

  // 核心切换逻辑
  // 核心切换逻辑
  // 核心切换逻辑
  const handleTogglePos = (e: React.MouseEvent) => {
    e.stopPropagation() // 防止点击事件冒泡
    if (!hasAltPos) return

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // 🚨 强制类型断言：明确告诉 TS 这是一个 WordNode
          const wNode = node as WordNodeType
          const currentPos = wNode.data.pos
          const safeAltPos = wNode.data.altPos || []

          if (safeAltPos.length > 0) {
            const nextPos = safeAltPos[0]
            const newAltPos = [...safeAltPos.slice(1), currentPos]

            // 🚨 再次断言返回类型，确保它能被安全地放回节点数组
            return {
              ...wNode,
              data: {
                ...wNode.data,
                pos: nextPos,
                altPos: newAltPos,
              },
            } as WordNodeType
          }
        }
        // 如果不是当前节点，或者没有备选词性，原样返回
        return node
      })
    )
  }

  return (
    <div
      className={[
        'relative rounded-xl border bg-slate-900/90 backdrop-blur overflow-visible',
        'min-w-[140px] flex flex-col transition-shadow duration-300',
        'cursor-grab active:cursor-grabbing',
        hasError
          ? 'border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.7)]'
          : power === 'lit-final'
            ? 'border-emerald-300 power-final'
            : power === 'lit'
              ? 'border-emerald-400 power-lit'
              : 'border-slate-700/80 shadow-md',
        selected ? 'ring-2 ring-cyan-200/60' : '',
      ].join(' ')}
    >
      <div className="pt-3 px-4 pb-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-slate-100 tracking-wide">
            {data.word}
          </span>

          {/* 这里从 span 变成了交互式按钮 */}
          <button
            onClick={handleTogglePos}
            disabled={!hasAltPos}
            title={hasAltPos ? "点击切换词性解析" : undefined}
            className={[
              'text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border font-mono flex items-center gap-1.5 transition-all duration-200',
              posClass,
              hasAltPos
                // nodrag 是极其关键的，它告诉 React Flow：拖拽这块区域时不要移动方块！
                ? 'cursor-pointer hover:ring-2 hover:ring-white/40 hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(255,255,255,0.1)] nodrag'
                : 'cursor-default'
            ].join(' ')}
          >
            {data.pos}
            {hasAltPos && (
              // 旋转提示小图标
              <span className="text-[10px] animate-[spin_4s_linear_infinite] opacity-80">
                🔄
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mt-1 text-[10px] tracking-widest text-slate-400">
          词条
        </div>

        <Handle
          type="source"
          position={Position.Top}
          className="group !w-8 !h-8 !bg-transparent !border-0 flex items-center justify-center !min-w-0 !min-h-0 cursor-crosshair z-50"
          style={{ top: '-16px' }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-cyan-300 transition-all duration-200 ease-out group-hover:scale-[1.75]"
            style={{ boxShadow: '0 0 10px #67e8f9' }}
          />
        </Handle>
      </div>
    </div>
  )
}