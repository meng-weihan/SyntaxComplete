import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WordNode from './nodes/WordNode'
import GateNode from './nodes/GateNode'
import TraceNode from './nodes/TraceNode'
import type { SyntaxNode, SyntaxEdge } from '../types/game'
import { LEVELS, getLevel, type Level } from '../config/levels'
import { validateCurrentCircuit, type ValidationResult } from '../engine/syntaxValidator'

// ─────────────────────────────────────────────────────────────────────────────
// Per-level starter boards
//
// Each level seeds a fresh board: the word inventory laid out left→right along
// the bottom, plus the available gate chips parked above as "spare parts" the
// player can drag into the tree.
// ─────────────────────────────────────────────────────────────────────────────

const BOTTOM_Y = 520
const WORD_SPACING = 130
const SPARE_GATE_Y = 80
const SPARE_GATE_SPACING = 170

function seedNodesForLevel(level: Level): SyntaxNode[] {
  const words: SyntaxNode[] = level.availableWords.map((w, i) => ({
    id: w.id ?? `w-${level.id}-${i}-${w.word}`,
    type: 'wordNode',
    position: { x: 80 + i * WORD_SPACING, y: BOTTOM_Y },
    data: { word: w.word, pos: w.pos, altPos: w.altPos },
  }))

  let gateIdx = 0
  const gates: SyntaxNode[] = []
  for (const g of level.availableGates) {
    for (let k = 0; k < g.count; k++) {
      gates.push({
        id: `g-${level.id}-${g.kind}-${k}`,
        type: 'gateNode',
        position: { x: 80 + gateIdx * SPARE_GATE_SPACING, y: SPARE_GATE_Y },
        data: { label: `${g.kind}-Gate`, kind: g.kind },
      })
      gateIdx++
    }
  }

  // Level 5 also gets a parked Trace node bound to its first NP-Gate (the
  // wh-NP slot). The player still has to wire it up.
  const extras: SyntaxNode[] = []
  if (level.allowTraces) {
    const whGate = gates.find((g) => g.id.includes(`-${level.id}-NP-0`))
    if (whGate) {
      extras.push({
        id: `t-${level.id}-0`,
        type: 'traceNode',
        position: { x: 80 + gateIdx * SPARE_GATE_SPACING, y: SPARE_GATE_Y + 40 },
        data: { bindsTo: whGate.id, label: 't' },
      })
    }
  }

  return [...words, ...gates, ...extras]
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge styles
// ─────────────────────────────────────────────────────────────────────────────

const IDLE_EDGE_STYLE = { stroke: '#22d3ee', strokeWidth: 2 }
const LIT_EDGE_STYLE = {
  stroke: '#00ff7f',
  strokeWidth: 3,
  filter: 'drop-shadow(0 0 6px #00ff7f)',
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SyntaxCanvas() {
  const nodeTypes = useMemo<NodeTypes>(
    () => ({ wordNode: WordNode, gateNode: GateNode, traceNode: TraceNode }),
    [],
  )

  const [currentLevelId, setCurrentLevelId] = useState<number>(1)
  const level = useMemo(() => getLevel(currentLevelId), [currentLevelId])

  const [nodes, setNodes, onNodesChange] = useNodesState<SyntaxNode>(
    seedNodesForLevel(level),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<SyntaxEdge>([])
  const [result, setResult] = useState<ValidationResult | null>(null)
  /**
   * One-shot trigger for the shake animation. We bump a counter to give the
   * failing node a fresh className key on each RUN — that way the animation
   * replays even if the same node fails twice in a row. The shake itself
   * fades to nothing (no fill-mode: both), so it never overrides ReactFlow's
   * positional transform and never locks dragging.
   */
  const [shakeTick, setShakeTick] = useState(0)

  // Re-seed when the level changes.
  useEffect(() => {
    setNodes(seedNodesForLevel(level))
    setEdges([])
    setResult(null)
  }, [level, setNodes, setEdges])

  // ── Reset helpers ─────────────────────────────────────────────────────────
  /**
   * Drop ALL validation feedback. Any topology change (new edge, deleted edge,
   * dragged/deleted node) calls this, so the player is never stuck staring at
   * stale red glow after they've already started fixing the circuit.
   *
   * Concretely: clears `result`, wipes `data.hasError` on every node, and
   * defensively re-asserts `draggable: true` in case anything ever sets it
   * false. The node components key their red border off `data.hasError`, so
   * clearing the flag immediately restores the normal dark style and keeps
   * every <Handle> live for new connections.
   */
  const resetAllNodeStates = useCallback(() => {
    setResult(null)
    setNodes((ns) =>
      ns.map((n): SyntaxNode => {
        if (!n.data?.hasError) return n
        // Preserve the discriminant by spreading per-arm via `as` — TS can't
        // see that {...n, data:{...n.data, hasError:false}} keeps the
        // node-type / data shape correlated across the union.
        return {
          ...n,
          draggable: true,
          data: { ...n.data, hasError: false },
        } as SyntaxNode
      }),
    )
  }, [setNodes])

  // ── ReactFlow handlers (all topology-changing events reset feedback) ─────
  const handleNodesChange = useCallback(
    (changes: NodeChange<SyntaxNode>[]) => {
      // Position drags fire on every pixel — only reset when something more
      // structural happens (add/remove/replace). This keeps the error banner
      // visible while the player is still inspecting the failing chip, but
      // dismisses it the moment they actually edit the circuit.
      const structural = changes.some(
        (c) => c.type === 'remove' || c.type === 'add' || c.type === 'replace',
      )
      if (structural) resetAllNodeStates()
      onNodesChange(changes)
    },
    [onNodesChange, resetAllNodeStates],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<SyntaxEdge>[]) => {
      // ANY edge change — including Backspace-delete — clears the red state.
      // This is the core of the fix: the user reported being unable to
      // re-wire after deleting a bad edge because the failing node stayed red.
      if (changes.length > 0) resetAllNodeStates()
      onEdgesChange(changes)
    },
    [onEdgesChange, resetAllNodeStates],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      // New wire being drawn — definitively a topology change.
      resetAllNodeStates()
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: IDLE_EDGE_STYLE },
          eds,
        ),
      )
    },
    [setEdges, resetAllNodeStates],
  )

  // ── RUN button ────────────────────────────────────────────────────────────
  const runValidation = useCallback(() => {
    const r = validateCurrentCircuit(nodes, edges, currentLevelId)
    setResult(r)
    // Push hasError into the failing node's data so WordNode/GateNode
    // re-render with the red border. Using data (not className) means the
    // flag participates in normal React reconciliation and clears cleanly.
    setNodes((ns) =>
      ns.map((n): SyntaxNode => {
        const shouldFlag = !r.success && n.id === r.errorNodeId
        const already = n.data?.hasError === true
        if (shouldFlag === already) return n
        return {
          ...n,
          draggable: true,
          data: { ...n.data, hasError: shouldFlag },
        } as SyntaxNode
      }),
    )
    if (!r.success) setShakeTick((t) => t + 1)
  }, [nodes, edges, currentLevelId, setNodes])

  // ── Decorate nodes/edges based on result ─────────────────────────────────
  /**
   * The wrapper className is used ONLY for the one-shot shake animation.
   * It uses a per-RUN key (`shakeTick`) so re-failing the same node replays
   * the shake. The animation has no `fill-mode: both`, so once it finishes
   * the wrapper's transform reverts to whatever ReactFlow set — drag works.
   */
  const decoratedNodes = useMemo(() => {
    if (!result || result.success || !result.errorNodeId) return nodes
    const errId = result.errorNodeId
    return nodes.map((n) =>
      n.id === errId
        ? { ...n, className: `syntax-error-shake shake-${shakeTick}` }
        : n,
    )
  }, [nodes, result, shakeTick])

  const decoratedEdges = useMemo<Edge[]>(() => {
    if (!result || !result.success) {
      return edges.map((e) => ({
        ...e,
        animated: true,
        style: IDLE_EDGE_STYLE,
      }))
    }
    return edges.map((e) => ({
      ...e,
      animated: true,
      style: LIT_EDGE_STYLE,
    }))
  }, [edges, result])

  return (
    <div className="w-full h-full bg-circuit-bg flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur flex items-center gap-4">
        <select
          value={currentLevelId}
          onChange={(e) => setCurrentLevelId(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 text-cyan-200 text-sm font-mono rounded-md px-2 py-1"
        >
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              Lv {l.id} — {l.title.replace(/^Level \d+ — /, '')}
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-cyan-400/70 font-mono">
            target sentence
          </div>
          <div className="text-slate-100 text-sm font-mono truncate">
            {level.targetSentence}
          </div>
        </div>

        <button
          onClick={runValidation}
          className="px-4 py-2 rounded-md border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:shadow-neon font-mono text-sm tracking-widest uppercase transition"
        >
          ⚡ Run / 通电测试
        </button>
      </div>

      {/* Status banner */}
      {result && (
        <div
          className={[
            'px-4 py-2 text-sm font-mono border-b',
            result.success
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-400/40 text-rose-200',
          ].join(' ')}
        >
          {result.success ? '✓ ' : '✗ Syntax Error: '}
          {result.message}
        </div>
      )}

      {/* Hint */}
      {level.hint && (
        <div className="px-4 py-1.5 text-xs font-mono text-slate-400 border-b border-slate-800/60 bg-slate-950/40">
          <span className="text-cyan-400/70">hint:</span> {level.hint}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={decoratedNodes}
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          fitView
          defaultEdgeOptions={{ animated: true, style: IDLE_EDGE_STYLE }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Lines}
            gap={32}
            color="#1a2236"
          />
          <Background
            id="dots"
            variant={BackgroundVariant.Dots}
            gap={32}
            size={1.2}
            color="#22d3ee33"
          />
          <Controls
            className="!bg-slate-900/80 !border-slate-700 !rounded-lg [&_button]:!bg-slate-900/80 [&_button]:!border-slate-700 [&_button]:!text-cyan-300"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-slate-900/80 !border !border-slate-700 !rounded-lg"
            nodeColor={(n) => {
              if (n.type === 'gateNode') return '#a855f7'
              if (n.type === 'traceNode') return '#fbbf24'
              return '#22d3ee'
            }}
            maskColor="rgba(10, 15, 26, 0.6)"
          />
        </ReactFlow>
      </div>

      {/* Win modal */}
      {result?.success && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none">
          <div className="pointer-events-auto bg-slate-900 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.45)] px-8 py-6 text-center max-w-md">
            <div className="text-emerald-300 text-xs font-mono tracking-[0.3em] uppercase">
              circuit complete
            </div>
            <h2 className="mt-2 text-2xl text-slate-100 font-bold">
              Level {level.id} cleared.
            </h2>
            <p className="mt-3 text-slate-300 font-mono text-sm">
              {level.targetSentence}
            </p>
            <div className="mt-5 flex gap-3 justify-center">
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm font-mono"
              >
                stay here
              </button>
              {currentLevelId < LEVELS.length && (
                <button
                  onClick={() => setCurrentLevelId(currentLevelId + 1)}
                  className="px-4 py-2 rounded-md border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 text-sm font-mono"
                >
                  next level →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
