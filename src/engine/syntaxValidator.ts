import type { Node, Edge } from '@xyflow/react'
import type {
  SyntaxNode,
  WordNodeData,
  GateNodeData,
  TraceNodeData,
  Category,
  POS,
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

const SUN_NODE_ID = 'sun-terminus'

export interface ValidationResult {
  success: boolean
  errorNodeId?: string
  message: string
  litEdges?: string[]
  rootNodeId?: string
}

export function validateCurrentCircuit(
  nodes: Node[],
  edges: Edge[],
  levelId: number,
): ValidationResult {
  const level = getLevel(levelId)
  const syntaxNodes = nodes as SyntaxNode[]

  const gates = syntaxNodes.filter((n) => n.type === 'gateNode')
  if (gates.length === 0) {
    return {
      success: false,
      message: '画布上还没有任何短语方块。请从调色板拖取方块开始搭建你的句法树。',
    }
  }

  const traces = syntaxNodes.filter((n) => n.type === 'traceNode')
  if (!level.allowTraces && traces.length > 0) {
    return {
      success: false,
      errorNodeId: traces[0].id,
      message: `当前关卡（Level ${level.id}）尚未解锁「成分移位 / Trace」机制。`,
    }
  }

  const assignments = enumerateAssignments(syntaxNodes, level)

  let lastFailure: ValidationResult | null = null
  for (const assignment of assignments) {
    const result = tryParseUnderAssignment(syntaxNodes, edges, level, assignment)
    if (result.success) return result
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
// POS assignment enumeration
// ─────────────────────────────────────────────────────────────────────────────

type Assignment = Record<string, POS>

function enumerateAssignments(nodes: SyntaxNode[], level: Level): Assignment[] {
  const words = nodes.filter(
    (n): n is Node<WordNodeData, 'wordNode'> => n.type === 'wordNode',
  )

  const choices: Array<{ id: string; options: POS[] }> = words.map((w) => {
    const primary = w.data.pos
    const alts = level.allowPOSBacktracking ? w.data.altPos ?? [] : []
    return { id: w.id, options: [primary, ...alts] }
  })

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
  childrenByGate: Map<string, string[]>
  grammar: Record<string, PSR[]> // 完美适配 X-bar 的多重规则体系
  assignment: Assignment
  memo: Map<string, Category | null>
  visiting: Set<string>
  failure: ValidationResult | null
  litEdges: Set<string>
}

function tryParseUnderAssignment(
  nodes: SyntaxNode[],
  edges: Edge[],
  level: Level,
  assignment: Assignment,
): ValidationResult {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))

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

  // 获取规则字典（已在 levels.ts 强约束为 PSR[]）
  const grammar = grammarForLevel(level) as Record<string, PSR[]>

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

  const consumed = new Set(
    edges.filter((e) => e.target !== SUN_NODE_ID).map((e) => e.source),
  )
  const rootGates = nodes.filter(
    (n) => n.type === 'gateNode' && !consumed.has(n.id),
  )

  // X-bar 理论中，根节点通常是 CP 或 TP (以前的 S)
  const expectedTop: string[] = ['CP', 'TP']

  const rootCandidates = rootGates.filter((g) => {
    const data = g.data as GateNodeData
    return expectedTop.includes(data.kind)
  })

  if (rootCandidates.length === 0) {
    return {
      success: false,
      errorNodeId: rootGates[0]?.id,
      message: `句法树未闭合。整条电路必须最终汇聚到一个 ${expectedTop.join(' / ')} 方块作为全句的最大投影。`,
    }
  }
  if (rootCandidates.length > 1) {
    return {
      success: false,
      errorNodeId: rootCandidates[1].id,
      message: `画布上有多个游离的顶层投影。请检查连线，确保它们汇集成唯一的树根。`,
    }
  }

  const root = rootCandidates[0]
  const emitted = resolveNode(root.id, ctx)
  if (emitted === null) {
    return (
      ctx.failure ?? {
        success: false,
        errorNodeId: root.id,
        message: '句法验证失败：存在不符合短语结构规则的连线。',
      }
    )
  }

  const reachable = collectReachable(root.id, ctx)
  const strayWord = nodes.find(
    (n) => n.type === 'wordNode' && !reachable.has(n.id),
  )
  if (strayWord) {
    return {
      success: false,
      errorNodeId: strayWord.id,
      message: `「${(strayWord.data as WordNodeData).word}」没有并入句法树。X-bar理论要求每一个词都必须被合法地投影！`,
    }
  }

  const sunEdge = edges.find(
    (e) => e.source === root.id && e.target === SUN_NODE_ID,
  )
  if (!sunEdge) {
    return {
      success: false,
      errorNodeId: root.id,
      message:
        '句法树已完备！请将最顶层的根节点连接到「终点 · sun」以验证通电。',
    }
  }

  ctx.litEdges.add(`${root.id}->${SUN_NODE_ID}`)

  return {
    success: true,
    rootNodeId: root.id,
    litEdges: [...ctx.litEdges],
    message: `X-bar 结构验证通过："${level.targetSentence}"`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive resolution
// ─────────────────────────────────────────────────────────────────────────────

function recordFailure(ctx: ResolveCtx, fail: ValidationResult) {
  if (!ctx.failure) ctx.failure = fail
}

function resolveNode(nodeId: string, ctx: ResolveCtx): Category | null {
  if (ctx.memo.has(nodeId)) return ctx.memo.get(nodeId)!
  if (ctx.visiting.has(nodeId)) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: nodeId,
      message: '拓扑短路：检测到无限循环连线（树状结构不允许闭环）。',
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
        message: `移位痕迹 (Trace) 尚未绑定先行词 (Antecedent)。`,
      })
      out = null
    } else {
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
  const rules = ctx.grammar[kind] // 这里现在是极其干净的 PSR[]

  if (!rules || rules.length === 0) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message: `当前关卡没有为 ${kind} 提供生成规则。`,
    })
    return null
  }

  const childIds = ctx.childrenByGate.get(gate.id) ?? []

  // 👇 核心升级：检查这组规则里，有没有“允许完全没有输入”的规则（比如幽灵门 []）
  const canBeEmpty = rules.some(r => r.length === 0)

  if (childIds.length === 0 && !canBeEmpty) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message: `${kind} 方块还没有任何输入信号。期望接收：${rules.map(r => `[${describeRule(r)}]`).join(' 或 ')}`,
    })
    return null
  }

  const childCats: Array<{ id: string; cat: Category }> = []
  for (const cid of childIds) {
    const cat = resolveNode(cid, ctx)
    if (cat === null) {
      recordFailure(ctx, {
        success: false,
        errorNodeId: cid,
        message: ctx.failure?.message ?? `上游信号无效，无法生成 ${kind}。`,
      })
      return null
    }
    childCats.push({ id: cid, cat })
  }

  // 并行匹配：只要满足其中一条规则即可
  let isMatched = false

  for (const rule of rules) {
    const match = matchPSR(rule, childCats.map((c) => c.cat))
    if (match.ok) {
      isMatched = true
      break
    }
  }

  if (!isMatched) {
    recordFailure(ctx, {
      success: false,
      errorNodeId: gate.id,
      message: `${kind} 投影结构不合法。` +
        `实际收到: [${childCats.map((c) => c.cat).join(' ')}]。` +
        `允许的 X-bar 规则为: ${rules.map(r => `[${describeRule(r)}]`).join(' 或 ')}。`
    })
    return null
  }

  for (const cid of childIds) {
    ctx.litEdges.add(`${cid}->${gate.id}`)
  }

  return kind
}

// ─────────────────────────────────────────────────────────────────────────────
// PSR matcher
// ─────────────────────────────────────────────────────────────────────────────

interface MatchResult {
  ok: boolean
  reason: string
}

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
      if (seqIdx < seq.length && accepts(seq[seqIdx])) {
        if (recurse(slotIdx + 1, seqIdx + 1)) return true
      }
      return recurse(slotIdx + 1, seqIdx)
    }
    if (q === '*' || q === '+') {
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

  let reason = ''
  let probe = 0
  for (const slot of rule) {
    const q = slot.q ?? '1'
    const accepts = (c: Category) => slot.cat.includes(c)
    if (q === '1' || q === '+') {
      if (probe >= seq.length) {
        reason = `缺少必要的 ${describeSlot(slot)} 在第 ${probe + 1} 个位置。`
        break
      }
      if (!accepts(seq[probe])) {
        reason = `在第 ${probe + 1} 个位置: 期望 ${describeSlot(slot)}, 实际收到 ${seq[probe]}。`
        break
      }
      probe++
    } else {
      while (probe < seq.length && accepts(seq[probe])) probe++
    }
  }
  if (!reason && probe < seq.length) {
    reason = `存在多余的信号 ${seq[probe]} (没有空余的插槽可以消耗它)。`
  }
  if (!reason) reason = '没有任何一条规则分支匹配。'
  return { ok: false, reason }
}

function describeSlot(slot: PSRSlot): string {
  const inner = slot.cat.join('|')
  const q = slot.q ?? '1'
  return slot.cat.length > 1 ? `(${inner})${q === '1' ? '' : q}` : `${inner}${q === '1' ? '' : q}`
}

function describeRule(rule: PSR): string {
  if (rule.length === 0) return '∅ (不需要任何输入)'
  return rule.map(describeSlot).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Reachability
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
      const t = node.data as TraceNodeData
      stack.push(t.bindsTo)
    }
  }
  return out
}