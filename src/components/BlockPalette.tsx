import type { GateKind } from '../types/game'
import {
  GATE_DISPLAY_NAME,
  GATE_COLOR,
  type Level,
} from '../config/levels'

/** MIME used to ferry a block kind through HTML5 drag-and-drop. */
export const BLOCK_DRAG_MIME = 'application/x-syntax-block'

interface BlockPaletteProps {
  level: Level
  /** Spawn a block at the canvas viewport center. */
  onSpawn: (kind: GateKind) => void
  /** Wipe placed blocks + edges, restore palette budgets. */
  onReset: () => void
}

/**
 * The left-rail palette: lists every available phrase block for the current
 * level. Each row supports both click-to-spawn-at-center and HTML5 drag onto
 * the canvas. 
 * * [X-bar Edition]: Blocks are now infinite. No exhaustion limits.
 */
export default function BlockPalette({
  level,
  onSpawn,
  onReset,
}: BlockPaletteProps) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800/80">
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400/70">
          短语方块库
        </div>
        <div className="mt-0.5 text-sm text-slate-200">
          点击或拖拽到画布 (无限)
        </div>
      </header>


      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {/* 👇 修复 1：直接接收 item，并兼容字符串和对象格式 */}
        {level.availableGates.map((item) => {
          const kind = (typeof item === 'string' ? item : (item as any).kind) as GateKind
          const color = GATE_COLOR[kind] || '#94a3b8'

          return (
            <button
              key={kind}
              onClick={() => onSpawn(kind)}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData(BLOCK_DRAG_MIME, JSON.stringify({ kind }))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className={[
                'w-full text-left rounded-xl border bg-slate-900/80',
                'px-3 py-2.5 transition select-none',
                'flex items-center gap-3',
                'border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing',
              ].join(' ')}
            >
              {/* Phrase color swatch */}
              <div
                className="w-3 h-8 rounded-sm shrink-0"
                style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-100 font-semibold leading-tight">
                  {GATE_DISPLAY_NAME[kind] || kind}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-0.5">
                  {kind}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <footer className="border-t border-slate-800/80 px-3 py-3">
        <button
          onClick={onReset}
          className="w-full text-xs uppercase tracking-[0.2em] py-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800/70 hover:border-slate-500 transition"
        >
          ↺ 重置画布
        </button>
      </footer>
    </aside>
  )
}