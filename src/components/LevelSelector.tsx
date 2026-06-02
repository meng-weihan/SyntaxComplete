import { LEVELS } from '../config/levels'

interface LevelSelectorProps {
    onSelectLevel: (levelId: number) => void
}

export default function LevelSelector({ onSelectLevel }: LevelSelectorProps) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center pt-20 pb-12 px-6 font-sans relative overflow-hidden">

            {/* 科技感背景光晕 */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* 标题区 */}
            <div className="text-center z-10 mb-16">
                <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                    <span className="bg-gradient-to-r from-cyan-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                        Syntax Complete
                    </span>
                </h1>
                <p className="text-slate-400 text-lg tracking-widest uppercase text-sm">
                    探索人类语言的奥秘 · 句法解析模拟器
                </p>
            </div>

            {/* 关卡网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl z-10">
                {LEVELS.map((level) => (
                    <div
                        key={level.id}
                        onClick={() => onSelectLevel(level.id)}
                        className="group relative flex flex-col bg-slate-900/60 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_8px_30px_rgba(34,211,238,0.15)] overflow-hidden"
                    >
                        {/* 卡片顶部的装饰线条 */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent group-hover:via-cyan-400 transition-colors duration-300" />

                        <div className="flex justify-between items-start mb-4">
                            <span className="px-2.5 py-1 text-xs font-bold font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/50 rounded-md">
                                LEVEL {level.id}
                            </span>
                            {level.id === 6 && (
                                <span className="px-2.5 py-1 text-xs font-bold font-mono text-rose-300 bg-rose-950/50 border border-rose-800/50 rounded-md animate-pulse">
                                    BOSS
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-cyan-50 transition-colors">
                            {level.title.split('·')[1]?.trim() || level.title}
                        </h3>

                        <p className="text-sm text-slate-400 mb-6 flex-grow line-clamp-2 leading-relaxed">
                            {level.description}
                        </p>

                        <div className="pt-4 border-t border-slate-800/60 mt-auto">
                            <p className="text-xs font-mono text-emerald-400/80 truncate" title={level.targetSentence}>
                                <span className="text-slate-500 mr-2">TARGET:</span>
                                {level.targetSentence}
                            </p>
                        </div>

                        {/* 悬浮时的右下角发光箭头 */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <span className="text-cyan-400 text-xl">→</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}