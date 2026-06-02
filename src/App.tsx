import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import SyntaxCanvas from './components/SyntaxCanvas'
import LevelSelector from './components/LevelSelector'
import { getLevel } from './config/levels'

function App() {
  // null 表示当前在主菜单；数字表示正在玩对应的关卡
  const [currentLevelId, setCurrentLevelId] = useState<number | null>(null)

  // 渲染主菜单
  if (currentLevelId === null) {
    return <LevelSelector onSelectLevel={setCurrentLevelId} />
  }

  // 获取当前正在玩的关卡数据
  const currentLevel = getLevel(currentLevelId)

  // 渲染游戏界面
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 返回按钮巧妙地融合在最左侧 */}
          <button
            onClick={() => setCurrentLevelId(null)}
            className="group flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-700"
            title="返回大厅"
          >
            <span className="text-slate-400 group-hover:text-cyan-400 transition-colors transform group-hover:-translate-x-0.5">
              ←
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
            <h1 className="text-lg font-bold tracking-[0.25em] text-slate-100">
              SYNTAX COMPLETE
            </h1>
          </div>
        </div>

        {/* 右侧副标题：现在可以动态显示当前的关卡名称了 */}
        <div className="text-xs tracking-widest uppercase flex items-center gap-3">
          <span className="text-cyan-400 font-bold hidden sm:block">
            {currentLevel.title}
          </span>
          <span className="text-slate-600 hidden sm:block">|</span>
          <span className="text-slate-400">
            探索人类语言的奥秘 · 短语结构搭建
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative">
        <ReactFlowProvider>
          <SyntaxCanvas
            level={currentLevel}
            onNextLevel={() => setCurrentLevelId(currentLevel.id + 1)}
          />
        </ReactFlowProvider>
      </main>
    </div>
  )
}

export default App