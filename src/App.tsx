import SyntaxCanvas from './components/SyntaxCanvas'

function App() {
  return (
    <div className="w-screen h-screen flex flex-col bg-circuit-bg text-slate-200">
      <header className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-neon" />
          <h1 className="text-lg font-bold tracking-[0.25em] text-cyan-300 font-mono">
            SYNTAX · COMPLETE
          </h1>
        </div>
        <div className="text-xs text-slate-400 font-mono tracking-widest uppercase">
          v0.1 — circuit board
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <SyntaxCanvas />
      </main>
    </div>
  )
}

export default App
