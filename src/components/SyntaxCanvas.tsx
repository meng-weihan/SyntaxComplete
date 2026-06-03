import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
import SunNode from './nodes/SunNode'
import BlockPalette, { BLOCK_DRAG_MIME } from './BlockPalette'
import type {
  SyntaxNode,
  SyntaxEdge,
  GateKind,
  PowerState,
  GateNodeData,
} from '../types/game'
import {
  LEVELS,
  GATE_DISPLAY_NAME,
  GATE_COLOR,
  type Level,
} from '../config/levels'
import {
  validateCurrentCircuit,
  type ValidationResult,
} from '../engine/syntaxValidator'

// ─────────────────────────────────────────────────────────────────────────────
// Per-level seeding
// ─────────────────────────────────────────────────────────────────────────────

const BOTTOM_Y = 520
const WORD_SPACING = 130

export const SUN_NODE_ID = 'sun-terminus'

function seedNodesForLevel(level: Level): SyntaxNode[] {
  const sun: SyntaxNode = {
    id: SUN_NODE_ID,
    type: 'sunNode',
    position: { x: 420, y: 40 },
    data: { glowing: false },
    selectable: false,
    deletable: false,
  }

  const words: SyntaxNode[] = level.availableWords.map((w, i) => ({
    id: w.id ?? `w-${level.id}-${i}-${w.word}`,
    type: 'wordNode',
    position: { x: 80 + i * WORD_SPACING, y: BOTTOM_Y },
    data: { word: w.word, pos: w.pos, altPos: w.altPos },
  }))

  const prespawned: SyntaxNode[] = (level.prespawnGates ?? []).map((p) => ({
    id: p.id,
    type: 'gateNode',
    position: p.position,
    data: {
      label: p.label ?? GATE_DISPLAY_NAME[p.kind],
      kind: p.kind,
      isTerminus: p.isTerminus ?? p.kind === 'S',
    },
  }))

  const extras: SyntaxNode[] = []
  if (level.allowTraces && prespawned.length > 0) {
    extras.push({
      id: `t-${level.id}-0`,
      type: 'traceNode',
      position: { x: 720, y: 360 },
      data: { bindsTo: prespawned[0].id, label: 't' },
    })
  }

  return [sun, ...words, ...prespawned, ...extras]
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge styles
// ─────────────────────────────────────────────────────────────────────────────

const IDLE_EDGE_STYLE = {
  stroke: '#64748b',
  strokeWidth: 3,
  strokeLinecap: 'round' as const,
}
const LIT_EDGE_STYLE = {
  stroke: '#00ffcc',
  strokeWidth: 4.5,
  filter: 'drop-shadow(0 0 6px #00ffcc) drop-shadow(0 0 16px #10b981)',
}

const STEP_MS = 400

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface LitEdgeRef {
  source: string
  target: string
}

function parseLitEdges(lit: string[] | undefined): LitEdgeRef[] {
  if (!lit) return []
  return lit
    .map((s) => {
      const i = s.indexOf('->')
      if (i < 0) return null
      return { source: s.slice(0, i), target: s.slice(i + 2) }
    })
    .filter((x): x is LitEdgeRef => x !== null)
}

function bfsLayers(litRefs: LitEdgeRef[]): string[][] {
  const parents = new Map<string, Set<string>>()
  const allNodes = new Set<string>()
  for (const { source, target } of litRefs) {
    allNodes.add(source)
    allNodes.add(target)
    if (!parents.has(target)) parents.set(target, new Set())
    parents.get(target)!.add(source)
  }

  const layerOf = new Map<string, number>()
  for (const n of allNodes) {
    if (!parents.has(n) || parents.get(n)!.size === 0) {
      layerOf.set(n, 0)
    }
  }
  let changed = true
  let safety = 0
  while (changed && safety++ < 1000) {
    changed = false
    for (const n of allNodes) {
      if (layerOf.has(n)) continue
      const ps = parents.get(n)
      if (!ps) continue
      let allKnown = true
      let maxParent = -1
      for (const p of ps) {
        const lp = layerOf.get(p)
        if (lp === undefined) {
          allKnown = false
          break
        }
        if (lp > maxParent) maxParent = lp
      }
      if (allKnown) {
        layerOf.set(n, maxParent + 1)
        changed = true
      }
    }
  }

  const out: string[][] = []
  for (const [id, layer] of layerOf) {
    while (out.length <= layer) out.push([])
    out[layer].push(id)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props & Main
// ─────────────────────────────────────────────────────────────────────────────

let blockCounter = 0
function nextBlockId(levelId: number, kind: GateKind) {
  return `g-${levelId}-${kind}-spawn-${++blockCounter}`
}

interface SyntaxCanvasProps {
  level: Level
  onNextLevel: () => void
}

export default function SyntaxCanvas({ level, onNextLevel }: SyntaxCanvasProps) {
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      wordNode: WordNode,
      gateNode: GateNode,
      traceNode: TraceNode,
      sunNode: SunNode,
    }),
    [],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<SyntaxNode>(
    seedNodesForLevel(level),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<SyntaxEdge>([])
  const [result, setResult] = useState<ValidationResult | null>(null)

  const [litEdgeIds, setLitEdgeIds] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [sunGlowing, setSunGlowing] = useState(false)
  const [winModalReady, setWinModalReady] = useState(false)
  const timersRef = useRef<number[]>([])

  const [shakeTick, setShakeTick] = useState(0)

  const { screenToFlowPosition } = useReactFlow()
  const canvasWrapperRef = useRef<HTMLDivElement>(null)

  // ── Level change → reset everything ──────────────────────────────────────
  useEffect(() => {
    cancelAllTimers()
    setNodes(seedNodesForLevel(level))
    setEdges([])
    setResult(null)
    setLitEdgeIds(new Set())
    setIsAnimating(false)
    setSunGlowing(false)
    setWinModalReady(false)
  }, [level, setNodes, setEdges])

  function cancelAllTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }

  const resetAllNodeStates = useCallback(() => {
    cancelAllTimers()
    setResult(null)
    setIsAnimating(false)
    setLitEdgeIds(new Set())
    setSunGlowing(false)
    setWinModalReady(false)
    setNodes((ns) =>
      ns.map((n): SyntaxNode => {
        const needsClear = n.data?.hasError || n.data?.power
        if (!needsClear) return n
        return {
          ...n,
          draggable: true,
          data: { ...n.data, hasError: false, power: undefined },
        } as SyntaxNode
      }),
    )
  }, [setNodes])

  // 👇 已经安全移除了 usedByKind 和 remainingByKind 的统计逻辑

  const spawnBlockAt = useCallback(
    (kind: GateKind, position: { x: number; y: number }) => {
      const id = nextBlockId(level.id, kind)
      const newNode: SyntaxNode = {
        id,
        type: 'gateNode',
        position,
        data: { label: GATE_DISPLAY_NAME[kind], kind },
      }
      setNodes((ns) => [...ns, newNode])
    },
    [level.id, setNodes],
  )

  const spawnAtViewportCenter = useCallback(
    (kind: GateKind) => {
      const rect = canvasWrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const flowPos = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
      spawnBlockAt(kind, flowPos)
      resetAllNodeStates()
    },
    [screenToFlowPosition, spawnBlockAt, resetAllNodeStates],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(BLOCK_DRAG_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const raw = e.dataTransfer.getData(BLOCK_DRAG_MIME)
      if (!raw) return
      e.preventDefault()
      try {
        const { kind } = JSON.parse(raw) as { kind: GateKind }
        if (!kind) return

        // 👇 已经安全移除了放置时的限制：if ((remainingByKind[kind] ?? 0) <= 0) return

        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        spawnBlockAt(kind, flowPos)
        resetAllNodeStates()
      } catch { }
    },
    [screenToFlowPosition, spawnBlockAt, resetAllNodeStates], // 👇 移除了 remainingByKind 依赖
  )

  const onPaletteReset = useCallback(() => {
    cancelAllTimers()
    setNodes(seedNodesForLevel(level))
    setEdges([])
    setResult(null)
    setLitEdgeIds(new Set())
    setIsAnimating(false)
    setSunGlowing(false)
    setWinModalReady(false)
  }, [level, setNodes, setEdges])

  const handleNodesChange = useCallback(
    (changes: NodeChange<SyntaxNode>[]) => {
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
      if (changes.length > 0) resetAllNodeStates()
      onEdgesChange(changes)
    },
    [onEdgesChange, resetAllNodeStates],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      resetAllNodeStates()
      setEdges((eds) =>
        addEdge({ ...params, animated: false, style: IDLE_EDGE_STYLE }, eds),
      )
    },
    [setEdges, resetAllNodeStates],
  )

  const edgeIdLookup = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of edges) m.set(`${e.source}->${e.target}`, e.id)
    return m
  }, [edges])

  const playPowerOnAnimation = useCallback(
    (r: ValidationResult) => {
      const litRefs = parseLitEdges(r.litEdges)
      const layers = bfsLayers(litRefs)
      setIsAnimating(true)

      const litEdgeAcc = new Set<string>()

      for (let t = 0; t < layers.length; t++) {
        const layer = layers[t]
        const timer = window.setTimeout(() => {
          setNodes((ns) =>
            ns.map((n): SyntaxNode => {
              if (!layer.includes(n.id)) return n
              return {
                ...n,
                data: { ...n.data, power: 'lit' as PowerState },
              } as SyntaxNode
            }),
          )
          const newOnes: string[] = []
          for (const { source, target } of litRefs) {
            if (!layer.includes(target)) continue
            const id = edgeIdLookup.get(`${source}->${target}`)
            if (id) newOnes.push(id)
          }
          if (newOnes.length > 0) {
            for (const id of newOnes) litEdgeAcc.add(id)
            setLitEdgeIds(new Set(litEdgeAcc))
          }
        }, t * STEP_MS)
        timersRef.current.push(timer)
      }

      const finalDelay = Math.max(layers.length, 1) * STEP_MS
      if (r.success && r.rootNodeId) {
        const rootId = r.rootNodeId
        const burstTimer = window.setTimeout(() => {
          setNodes((ns) =>
            ns.map((n): SyntaxNode => {
              if (n.id !== rootId) return n
              return {
                ...n,
                data: { ...n.data, power: 'lit-final' as PowerState },
              } as SyntaxNode
            }),
          )
          setSunGlowing(true)
          setIsAnimating(false)
          const modalTimer = window.setTimeout(() => {
            setWinModalReady(true)
          }, 1500)
          timersRef.current.push(modalTimer)
        }, finalDelay)
        timersRef.current.push(burstTimer)
      } else if (r.errorNodeId) {
        const errId = r.errorNodeId
        const failTimer = window.setTimeout(() => {
          setNodes((ns) =>
            ns.map((n): SyntaxNode => {
              if (n.id !== errId) return n
              return {
                ...n,
                data: { ...n.data, hasError: true },
              } as SyntaxNode
            }),
          )
          setShakeTick((t) => t + 1)
          setIsAnimating(false)
        }, finalDelay)
        timersRef.current.push(failTimer)
      } else {
        const tail = window.setTimeout(() => setIsAnimating(false), finalDelay)
        timersRef.current.push(tail)
      }
    },
    [edgeIdLookup, setNodes],
  )

  const runValidation = useCallback(() => {
    if (isAnimating) return
    cancelAllTimers()
    setLitEdgeIds(new Set())
    setSunGlowing(false)
    setWinModalReady(false)
    setNodes((ns) =>
      ns.map((n): SyntaxNode => {
        if (!n.data?.hasError && !n.data?.power) return n
        return {
          ...n,
          data: { ...n.data, hasError: false, power: undefined },
        } as SyntaxNode
      }),
    )

    const r = validateCurrentCircuit(nodes, edges, level.id)
    setResult(r)
    playPowerOnAnimation(r)
  }, [
    isAnimating,
    nodes,
    edges,
    level.id,
    setNodes,
    playPowerOnAnimation,
  ])

  useEffect(() => () => cancelAllTimers(), [])

  const decoratedNodes = useMemo(() => {
    return nodes.map((n) => {
      if (n.type === 'sunNode') {
        if ((n.data as { glowing?: boolean }).glowing === sunGlowing) return n
        return { ...n, data: { ...n.data, glowing: sunGlowing } }
      }
      if (
        result &&
        !result.success &&
        result.errorNodeId &&
        n.id === result.errorNodeId
      ) {
        return { ...n, className: `syntax-error-shake shake-${shakeTick}` }
      }
      return n
    })
  }, [nodes, result, shakeTick, sunGlowing])

  const decoratedEdges = useMemo<Edge[]>(() => {
    return edges.map((e) => {
      const lit = litEdgeIds.has(e.id)
      return {
        ...e,
        animated: lit,
        style: lit ? LIT_EDGE_STYLE : IDLE_EDGE_STYLE,
      }
    })
  }, [edges, litEdgeIds])

  return (
    <div className="absolute inset-0 flex">
      {/* ── Palette rail ──────────────────────────────────────────── */}
      <BlockPalette
        level={level}
        // 👇 已经去掉了 remaining 属性的传递
        onSpawn={spawnAtViewportCenter}
        onReset={onPaletteReset}
      />

      {/* ── Canvas column ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              目标句子
            </div>
            <div className="text-slate-100 text-sm truncate">
              {level.targetSentence}
            </div>
          </div>

          <button
            onClick={runValidation}
            disabled={isAnimating}
            className={[
              'px-4 py-2 rounded-md text-sm tracking-widest uppercase transition',
              isAnimating
                ? 'border border-slate-700 bg-slate-800/60 text-slate-500 cursor-not-allowed'
                : 'border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:shadow-[0_0_14px_rgba(16,185,129,0.4)]',
            ].join(' ')}
          >
            {isAnimating ? '通电中…' : '▶ Run / 验证'}
          </button>
        </div>

        {result && !isAnimating && (
          <div
            className={[
              'px-4 py-2 text-sm border-b',
              result.success
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-200',
            ].join(' ')}
          >
            {result.success ? '✓ ' : '✗ 句法短路：'}
            {result.message}
          </div>
        )}

        {level.hint && (
          <div className="px-4 py-1.5 text-xs text-slate-400 border-b border-slate-800/60 bg-slate-950/40">
            <span className="text-slate-500">提示：</span>
            {level.hint}
          </div>
        )}

        <div
          ref={canvasWrapperRef}
          className="flex-1 min-h-0 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            fitView
            connectionRadius={30}
            defaultEdgeOptions={{ animated: false, style: IDLE_EDGE_STYLE }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={28}
              size={1.2}
              color="#334155"
            />
            <Controls
              className="!bg-slate-900/80 !border-slate-700 !rounded-lg [&_button]:!bg-slate-900/80 [&_button]:!border-slate-700 [&_button]:!text-slate-200"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-slate-900/80 !border !border-slate-700 !rounded-lg"
              nodeColor={(n) => {
                if (n.type === 'gateNode') {
                  const k = (n.data as GateNodeData).kind
                  return GATE_COLOR[k] ?? '#94a3b8'
                }
                if (n.type === 'traceNode') return '#fbbf24'
                if (n.type === 'sunNode') return '#fde047'
                return '#94a3b8'
              }}
              maskColor="rgba(2, 6, 23, 0.6)"
            />
          </ReactFlow>

          {result?.success && !isAnimating && winModalReady && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none">
              <div className="pointer-events-auto bg-slate-900 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.45)] px-8 py-6 text-center max-w-md">
                <div className="text-emerald-300 text-xs tracking-[0.3em] uppercase">
                  句法结构完成
                </div>
                <h2 className="mt-2 text-2xl text-slate-100 font-bold">
                  Level {level.id} 通关
                </h2>
                <p className="mt-3 text-slate-300 text-sm">
                  {level.targetSentence}
                </p>
                <div className="mt-5 flex gap-3 justify-center">
                  <button
                    onClick={() => setResult(null)}
                    className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
                  >
                    留在本关
                  </button>
                  {level.id < LEVELS.length && (
                    <button
                      onClick={onNextLevel}
                      className="px-4 py-2 rounded-md border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 text-sm"
                    >
                      下一关 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}