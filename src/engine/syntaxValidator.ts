import type { Node, Edge } from '@xyflow/react'
import type {
  SyntaxNode,
  WordNodeData,
  GateNodeData,
  TraceNodeData,
  Category,
  POS,
  GateKind,
} from '../types/game'
import {
  getLevel,
  grammarForLevel,
  type Level,
  type PSR,
  type PSRSlot,
} from '../config/levels'

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fixed id of the canvas's Sun terminus (kept in sync with
 * `SUN_NODE_ID` exported from SyntaxCanvas). The sun is not a gate — the
 * validator treats edges targeting the sun as the "publish" wire from the
 * root S/CP block to the final output. They are excluded from "consumed"
 * computations and from grammatical PSR resolution.
 */
const SUN_NODE_ID = 'sun-terminus'

export interface ValidationResult {
  success: boolean
  /** Optional id of the most relevant gate to highlight on failure. */
  errorNodeId?: string
  /** Human-readable explanation, e.g. "VP expects [V (NP|CP)?], got [V Adj]". */
  message: string
  /** ids of every edge that participates in the successful parse tree. */
  litEdges?: string[]
  /** id of the root sentence node, if found. */
  rootNodeId?: string
}

/**
 * Public entry point.
 *
 * Walks the circuit bottom-up:
 *   1. Find every gate node.
 *   2. For each gate, sort its direct upstream inputs by x (word order).
 *   3. Recursively resolve each input to a Category (POS for WordNodes,
 *      kind for sub-gates, bound antecedent for Traces).
 *   4. Match the input sequence against the gate's PSR (per-level grammar).
 *   5. The "root" must be an S-gate (or, for wh-questions, a CP-gate) that
 *      no other gate consumes.
 *
 * When the level allows POS backtracking and some word has alternate POS
 * tags, we try every assignment until one parses successfully.
 */
export function validateCurrentCircuit(
  nodes: Node[],
  edges: Edge[],
  levelId: number,
): ValidationResult {
  const level = getLevel(levelId)
  const syntaxNodes = nodes as SyntaxNode[]

  // Pre-flight: must have at least one gate.
  const gates = syntaxNodes.filter((n) => n.type === 'gateNode')
  if (gates.length === 0) {
    return {
      success: false,
      message: '画布上还没有任何短语方块。先从侧栏拖一个 S 方块到画布上吧。',
    }
  }

  // Pre-flight: traces only allowed if the level enables movement.
  const traces = syntaxNodes.filter((n) => n.type === 'traceNode')
  if (!level.allowTraces && traces.length > 0) {
    return {
      success: false,
      errorNodeId: traces[0].id,
      message: `当前关卡（Level ${level.id}）尚未解锁「成分移位 / Trace」机制。`,
    }
  }

  // Enumerate POS assignments for ambiguous words (Level 6).
  const assignments = enumerateAssignments(syntaxNodes, level)

  let lastFailure: ValidationResult | null = null
  for (const assignment of assignments) {
    const result = tryParseUnderAssignment(syntaxNodes, edges, level, assignment)
    if (result.success) return result
    // Prefer the failure from the "primary" (first) assignment for clarity.
    if (!lastFailure) lastFailure = result
  }

  return (
    lastFailure ?? {
      success: false,
      message: '句法结构尚未完成。',
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POS assignment enumeration (for altPos / backtracking)
// ─────────────────────────────────────────────────────────────────────────────

/** Map from word-node id → which POS we're using for it this attempt. */
type Assignment = Record<string, POS>

function enumerateAssignments(nodes: SyntaxNode[], level: Level): Assignment[] {
  const words = nodes.filter(
    (n): n is Node<WordNodeData, 'wordNode'> => n.type === 'wordNode',
  )

  // Build per-word choice list.
  const choices: Array<{ id: string; options: POS[] }> = words.map((w) => {
    const primary = w.data.pos
    const alts = level.allowPOSBacktracking ? w.data.altPos ?? [] : []
    // Primary first so the first assignment === user-intended reading.
    return { id: w.id, options: [primary, ...alts] }
  })

  // Cartesian product — bounded by the (small) availableWords list per level.
  let out: Assignment[] = [{}]
  for (const { id, options } of choices) {
    const next: Assignment[] = []
    for (const acc of out) {
      for (const pos of options) {
        next.push({ ...acc, [id]: pos })
      }
    }
    out = next
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-assignment parse
// ─────────────────────────────────────────────────────────────────────────────

interface ResolveCtx {
  nodesById: Map<string, SyntaxNode>
  /** gateId → child node ids, already sorted by x ascending. */
  childrenByGate: Map<string, string[]>
  grammar: Record<GateKind, PSR>
  assignment: Assignment
  /** Memo: nodeId → resolved Category (or null on failure). */
  memo: Map<string, Category | null>
  /** Cycle guard. */
  visiting: Set<string>
  /** First failure encountered, surfaced if the whole parse fails. */
  failure: ValidationResult | null
  /** Edges that contributed to a successful sub-parse. */
  litEdges: Set<string>
}

function tryParseUnderAssignment(
  nodes: SyntaxNode[],
  edges: Edge[],
  level: Level,
  assignment: Assignment,
): ValidationResult {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))

  // Build child map. An edge in ReactFlow is `source → target`.
  // Bottom-up tree: target = parent gate, source = child input.
  const childIdsByGate = new Map<string, string[]>()
  const edgesByTarget = new Map<string, Edge[]>()
  for (const e of edges) {
    if (!edgesByTarget.has(e.target)) edgesByTarget.set(e.target, [])
    edgesByTarget.get(e.target)!.push(e)
  }
  for (const [gateId, gateEdges] of edgesByTarget) {
    const sorted = [...gateEdges].sort((a, b) => {
      const ax = nodesById.get(a.source)?.position.x ?? 0
      const bx = nodesById.get(b.source)?.position.x ?? 0
      return ax - bx
    })
    childIdsByGate.set(
      gateId,
      sorted.map((e) => e.source),
    )
  }

  const grammar = grammarForLevel(level)
  const ctx: ResolveCtx = {
    nodesById,
    childrenByGate: childIdsByGate,
    grammar,
    assignment,
    memo: new Map(),
    visiting: new Set(),
    failure: null,
    litEdges: new Set(),
  }

  // Find the root: a gate that no edge targets→ wait, root is target of nothing,
  // i.e. nothing consumes it. So root = gate whose id never appears as `source`
  // in `edges`. EXCEPT: an edge into the Sun terminus does NOT count as
  // "consumption" — the sun is the publish-output, and the root is expected
  // to feed it. The root therefore looks like "a gate whose only outgoing
  // edges (if any) target the sun".
  const consumed = new Set(
    edges.filter((e) => e.target !== SUN_NODE_ID).map((e) => e.source),
  )
  const rootGates = nodes.filter(
    (n) => n.type === 'gateNode' && !consumed.has(n.id),
  )

  // The expected top kind: S by default, but Level 5 wraps S in a CP.
  const expectedTop: GateKind[] =
    level.id === 5 ? ['CP', 'S'] : ['S']

  const rootCandidates = rootGates.filter((g) => {
    const data = g.data as GateNodeData
    return expectedTop.includes(data.kind)
  })

  if (rootCandidates.length === 0) {
    return {
      success: false,
      errorNodeId: rootGates[0]?.id,
      message: `没有找到顶层的 ${expectedTop.join(' / ')} 方块。整条电路必须汇聚到一个 ${expectedTop[0]} 方块。`,
    }
  }
  if (rootCandidates.length > 1) {
    return {
      success: false,
      errorNodeId: rootCandidates[1].id,
      message: `画布上有多个互不相连的顶层方块（${rootCandidates
        .map((r) => (r.data as GateNodeData).kind)
        .join(', ')}）。请把它们汇集成一个根方块。`,
    }
  }

  // Also verify there are no orphan gates that aren't part of the root's tree.
  // (Handled implicitly — they'll just be ignored, but we warn.)
  const root = rootCandidates[0]
  const emitted = resolveNode(root.id, ctx)
  if (emitted === null) {
    return (
      ctx.failure ?? {
        success: false,
        errorNodeId: root.id,
        message: '句法验证失败（未知原因）。',
      }
    )
  }

  // Sanity: ensure every WordNode is reachable from the root. Stray words =
  // unused signal = the player hasn't completed the sentence.
  const reachable = collectReachable(root.id, ctx)
  const strayWord = nodes.find(
    (n) => n.type === 'wordNode' && !reachable.has(n.id),
  )
  if (strayWord) {
    return {
      success: false,
      errorNodeId: strayWord.id,
      message: `「${(strayWord.data as WordNodeData).word}」这个词条还没接进句子里——每一个词都必须并入根方块。`,
    }
  }

  // Final wire: the root must be plugged into the Sun terminus.
  // (Sun-target edges were excluded from "consumed" earlier so the root
  // could still be detected — here we enforce the player actually drew one.)
  const sunEdge = edges.find(
    (e) => e.source === root.id && e.target === SUN_NODE_ID,
  )
  if (!sunEdge) {
    return {
      success: false,
      errorNodeId: root.id,
      message:
        '根方块还没有连到顶端的「终点 · sun」。把根方块的顶部引脚拉到太阳上，点亮全句。',
    }
  }
  // Light up that final root→sun wire too.
  ctx.litEdges.add(`${root.id}->${SUN_NODE_ID}`)

  return {
    success: true,
    rootNodeId: root.id,
    litEdges: [...ctx.litEdges],
    message: `句子搭建成功："${level.targetSentence}"`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a node to the Category it emits, or null on failure.
 * Caches results and records the first failure into ctx.failure.
 */
function resolveNode(nodeId: string, ctx: ResolveCtx): Category | null {
  if (ctx.memo.has(nodeId)) return ctx.memo.get(nodeId)!
  if (ctx.visiting.has(nodeId)) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: nodeId,
      message: '检测到循环连线——某个节点连回了它自己。',
    })
    ctx.memo.set(nodeId, null)
    return null
  }
  ctx.visiting.add(nodeId)

  const node = ctx.nodesById.get(nodeId)
  if (!node) {
    ctx.visiting.delete(nodeId)
    return null
  }

  let out: Category | null = null
  if (node.type === 'wordNode') {
    out = ctx.assignment[nodeId] ?? (node.data as WordNodeData).pos
  } else if (node.type === 'traceNode') {
    const tdata = node.data as TraceNodeData
    const bound = ctx.nodesById.get(tdata.bindsTo)
    if (!bound) {
      recordFailure(ctx, {
        success: false,
        errorNodeId: nodeId,
        message: `Trace 还没有绑定先行词——请设置 bindsTo。`,
      })
      out = null
    } else {
      // The trace emits whatever its antecedent emits — typically an NP.
      out = resolveNode(bound.id, ctx)
    }
  } else if (node.type === 'gateNode') {
    out = resolveGate(node as Node<GateNodeData, 'gateNode'>, ctx)
  }

  ctx.visiting.delete(nodeId)
  ctx.memo.set(nodeId, out)
  return out
}

function resolveGate(
  gate: Node<GateNodeData, 'gateNode'>,
  ctx: ResolveCtx,
): Category | null {
  const kind = gate.data.kind
  const rule = ctx.grammar[kind]
  if (!rule) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message: `当前关卡没有为 ${kind} 方块定义文法规则。`,
    })
    return null
  }

  const childIds = ctx.childrenByGate.get(gate.id) ?? []
  if (childIds.length === 0) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message: `${kind} 方块还没有任何输入连线。期望结构：${describeRule(rule)}。`,
    })
    return null
  }

  // Resolve every child first.
  const childCats: Array<{ id: string; cat: Category }> = []
  for (const cid of childIds) {
    const cat = resolveNode(cid, ctx)
    if (cat === null) {
      // A child failed — the failure was already recorded by the recursive call.
      // Surface a higher-level message anchored at this gate too.
      recordFailure(ctx, {
        success: false,
        errorNodeId: cid,
        message:
          ctx.failure?.message ??
          `${kind} 方块无法点亮：上游一个输入信号无效。`,
      })
      return null
    }
    childCats.push({ id: cid, cat })
  }

  // Match the resulting category sequence against the rule.
  const match = matchPSR(rule, childCats.map((c) => c.cat))
  if (!match.ok) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message:
        `${kind} 方块结构不符：期望 ${describeRule(rule)}，` +
        `实际收到 [${childCats.map((c) => c.cat).join(' ')}]。${match.reason}`,
    })
    return null
  }

  // Light up every edge feeding this gate.
  for (const cid of childIds) {
    ctx.litEdges.add(`${cid}->${gate.id}`)
  }

  return kind
}

function recordFailure(ctx: ResolveCtx, fail: ValidationResult) {
  if (!ctx.failure) ctx.failure = fail
}

// ─────────────────────────────────────────────────────────────────────────────
// PSR matcher (with backtracking — slots can branch on alternatives & quantifiers)
// ─────────────────────────────────────────────────────────────────────────────

interface MatchResult {
  ok: boolean
  reason: string
}

/**
 * Match a category sequence against a PSR pattern.
 * Supports per-slot alternatives (cat: [...]) and quantifiers (1/?/+/*).
 * Implementation: simple recursive backtracking. Patterns are short (≤6 slots
 * in practice) so worst-case is fine.
 */
export function matchPSR(rule: PSR, seq: Category[]): MatchResult {
  function recurse(slotIdx: number, seqIdx: number): boolean {
    if (slotIdx === rule.length) return seqIdx === seq.length
    const slot = rule[slotIdx]
    const q = slot.q ?? '1'
    const accepts = (c: Category) => slot.cat.includes(c)

    if (q === '1') {
      if (seqIdx < seq.length && accepts(seq[seqIdx])) {
        return recurse(slotIdx + 1, seqIdx + 1)
      }
      return false
    }
    if (q === '?') {
      // try consuming first (greedy), then skip
      if (seqIdx < seq.length && accepts(seq[seqIdx])) {
        if (recurse(slotIdx + 1, seqIdx + 1)) return true
      }
      return recurse(slotIdx + 1, seqIdx)
    }
    if (q === '*' || q === '+') {
      // Greedy: consume as many as possible, then back off.
      let take = 0
      while (seqIdx + take < seq.length && accepts(seq[seqIdx + take])) {
        take++
      }
      const minTake = q === '+' ? 1 : 0
      for (let t = take; t >= minTake; t--) {
        if (recurse(slotIdx + 1, seqIdx + t)) return true
      }
      return false
    }
    return false
  }

  const ok = recurse(0, 0)
  if (ok) return { ok: true, reason: '' }

  // Pinpoint the first mismatch for a readable error.
  let reason = ''
  let probe = 0
  for (const slot of rule) {
    const q = slot.q ?? '1'
    const accepts = (c: Category) => slot.cat.includes(c)
    if (q === '1' || q === '+') {
      if (probe >= seq.length) {
        reason = `Missing required ${describeSlot(slot)} at position ${probe + 1}.`
        break
      }
      if (!accepts(seq[probe])) {
        reason = `At position ${probe + 1}: expected ${describeSlot(slot)}, got ${seq[probe]}.`
        break
      }
      probe++
    } else {
      // ?/* — skip past matching prefix to keep the probe useful.
      while (probe < seq.length && accepts(seq[probe])) probe++
    }
  }
  if (!reason && probe < seq.length) {
    reason = `Unexpected trailing ${seq[probe]} (no slot left to consume it).`
  }
  if (!reason) reason = 'No matching rule branch.'
  return { ok: false, reason }
}

function describeSlot(slot: PSRSlot): string {
  const inner = slot.cat.join('|')
  const q = slot.q ?? '1'
  return slot.cat.length > 1 ? `(${inner})${q === '1' ? '' : q}` : `${inner}${q === '1' ? '' : q}`
}

function describeRule(rule: PSR): string {
  return rule.map(describeSlot).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Reachability (to flag stray words)
// ─────────────────────────────────────────────────────────────────────────────

function collectReachable(rootId: string, ctx: ResolveCtx): Set<string> {
  const out = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    const node = ctx.nodesById.get(id)
    if (!node) continue
    if (node.type === 'gateNode') {
      const children = ctx.childrenByGate.get(id) ?? []
      stack.push(...children)
    } else if (node.type === 'traceNode') {
      // A trace pulls in its antecedent.
      const t = node.data as TraceNodeData
      stack.push(t.bindsTo)
    }
  }
  return out
}
