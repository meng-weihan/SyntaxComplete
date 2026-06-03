import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { SunNodeData } from '../../types/game'

type SunNodeType = Node<SunNodeData, 'sunNode'>

export default function SunNode({ data }: NodeProps<SunNodeType>) {
  const glowing = data.glowing === true

  return (
    // 增加 cursor-grab active:cursor-grabbing 让它具有拖拽鼠标手型
    <div className="relative flex flex-col items-center select-none cursor-grab active:cursor-grabbing">
      <div
        className={[
          'relative w-16 h-16 rounded-full transition-all duration-700 ease-out',
          // 关键改动：增加了多层边框的视觉叠加
          glowing
            ? 'bg-gradient-to-br from-amber-200 via-amber-300 to-orange-400 shadow-[0_0_60px_18px_rgba(252,211,77,0.85)] scale-110'
            : 'bg-slate-900 border-4 border-slate-700 shadow-[inset_0_0_15px_rgba(0,0,0,0.5),0_0_10px_rgba(252,211,77,0.1)] scale-100 animate-pulse',
        ].join(' ')}
      >
        {/* Sun rays — fade in only on glow */}
        <div
          className={[
            'absolute inset-[-16px] rounded-full transition-opacity duration-700 pointer-events-none',
            glowing ? 'opacity-100 animate-pulse' : 'opacity-0',
          ].join(' ')}
          style={{
            background:
              'radial-gradient(circle, rgba(252,211,77,0.55) 0%, rgba(252,211,77,0) 70%)',
          }}
        />
        {/* Inner highlight — fakes a gleaming surface */}
        <div
          className={[
            'absolute inset-2 rounded-full transition-opacity duration-500 pointer-events-none',
            glowing
              ? 'opacity-100 bg-gradient-to-br from-white/80 to-transparent'
              : 'opacity-0',
          ].join(' ')}
        />
      </div>


      {/* 隐形大触区 Handle */}
      <Handle
        type="target"
        position={Position.Bottom}
        className="group !w-8 !h-8 !bg-transparent !border-0 flex items-center justify-center !min-w-0 !min-h-0 cursor-crosshair z-50"
        style={{ bottom: '-16px' }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-all duration-200 ease-out group-hover:scale-[1.75]"
          style={{ backgroundColor: '#fcd34d', boxShadow: '0 0 10px #fcd34d' }}
        />
      </Handle>
    </div>
  )
}