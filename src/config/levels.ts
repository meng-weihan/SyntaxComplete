import type { GateKind, POS, Category } from '../types/game'

// ─────────────────────────────────────────────────────────────────────────────
// Player-facing display names for each phrase kind.
// ─────────────────────────────────────────────────────────────────────────────

export const GATE_DISPLAY_NAME: Record<GateKind, string> = {
  NP: '名词短语',
  VP: '动词短语',
  PP: '介词短语',
  CP: '从句标志短语',
  S: '句子',
  AdjP: '形容词短语',
}

export const GATE_COLOR: Record<GateKind, string> = {
  NP: '#34d399', // emerald
  VP: '#fb7185', // rose
  PP: '#818cf8', // indigo
  CP: '#c084fc', // violet
  S: '#fbbf24', // amber (sentence root)
  AdjP: '#facc15', // yellow
}

// ─────────────────────────────────────────────────────────────────────────────
// Grammar pattern DSL
// ─────────────────────────────────────────────────────────────────────────────

export interface PSRSlot {
  cat: Category[]
  q?: '1' | '?' | '*' | '+'
}

export type PSR = PSRSlot[]

export const one = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '1' })
export const opt = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '?' })
export const star = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '*' })
export const plus = (...cats: Category[]): PSRSlot => ({ cat: cats, q: '+' })

// ─────────────────────────────────────────────────────────────────────────────
// Default grammar
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GRAMMAR: Partial<Record<GateKind, PSR>> = {
  NP: [opt('Det'), star('Adj'), one('N', 'Pron'), star('PP')],
  VP: [one('V'), opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
  PP: [one('P'), one('NP', 'Trace')],
  CP: [one('C'), one('S')],
  S: [one('NP', 'Trace'), one('VP')],
  AdjP: [star('Adv'), one('Adj')],
}

// ─────────────────────────────────────────────────────────────────────────────
// Level configuration Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailableWord {
  id?: string
  word: string
  pos: POS
  altPos?: POS[]
}

export interface AvailableGate {
  kind: GateKind
  count: number
}

export interface PrespawnGate {
  kind: GateKind
  id: string
  position: { x: number; y: number }
  label?: string
  isTerminus?: boolean
}

export interface Level {
  id: number
  title: string
  description: string
  targetSentence: string
  hint?: string
  availableWords: AvailableWord[]
  availableGates: AvailableGate[]
  prespawnGates?: PrespawnGate[]
  grammarOverrides?: Partial<Record<GateKind, PSR>>
  allowTraces?: boolean
  allowPOSBacktracking?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// The six levels (Nature Observation Theme)
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS: Level[] = [
  // ── Level 1: basic SVO ──────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Level 1 · 万物初光',
    description:
      '搭建自然界最朴素的联系：主语发出动作，并作用于宾语。',
    targetSentence: 'The bird finds seeds.',
    hint: 'S → NP VP。注意每个名词都需要装进 NP（名词短语）模块中。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'finds', pos: 'V' },
      { word: 'seeds', pos: 'N' }, // 移除了多余的the，让画面更干净
    ],
    availableGates: [
      { kind: 'NP', count: 2 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    grammarOverrides: {
      NP: [opt('Det'), one('N')],
      VP: [one('V'), opt('NP')],
    },
  },

  // ── Level 2: linear modification (Adj inside NP) ───────────────────────────
  {
    id: 2,
    title: 'Level 2 · 色彩浮现',
    description:
      'NP 模块现在能容纳形容词堆叠。尝试将修饰语嵌入名词之前，为世界填充色彩。',
    targetSentence: 'The bright bird finds seeds.',
    hint: 'NP → Det? Adj* N。连线时，画布上「从左到右」即代表了句子的线性语序。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bright', pos: 'Adj' },
      { word: 'bird', pos: 'N' },
      { word: 'finds', pos: 'V' },
      { word: 'seeds', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 2 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    grammarOverrides: {
      NP: [opt('Det'), star('Adj'), one('N')],
      VP: [one('V'), opt('NP')],
    },
  },

  // ── Level 3: PP recursion ───────────────────────────────────────────────────
  {
    id: 3,
    title: 'Level 3 · 空间延展',
    description:
      '引入 PP（介词短语）。先组装出空间的坐标「in the meadow」，再将其挂载到动作上。',
    targetSentence: 'The bird finds seeds in the meadow.',
    hint: 'PP → P NP。动词短语（VP）的尾部可以无限外挂 PP 模块来补充状语信息。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'finds', pos: 'V' },
      { word: 'seeds', pos: 'N' },
      { word: 'in', pos: 'P' },
      { word: 'the', pos: 'Det' },
      { word: 'meadow', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'VP', count: 1 },
      { kind: 'PP', count: 1 },
      { kind: 'S', count: 1 },
    ],
  },

  // ── Level 4: CP / embedded clause (Replacing 'Lisa said that...') ───────────
  {
    id: 4,
    title: 'Level 4 · 嵌套法则',
    description:
      '探索离散无限性（Discrete Infinity）。一个从句标志（that）可以将一个完整的世界（S）包裹起来，被另一个动作吞下。',
    targetSentence: 'The observer saw that the bird found seeds.',
    hint: '先在左侧拼出外层主干，在右侧拼出内层景象。最后用 CP-Gate 将内层句子包裹，喂给 saw。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'observer', pos: 'N' },
      { word: 'saw', pos: 'V' },
      { word: 'that', pos: 'C' },
      { word: 'the', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'found', pos: 'V' },
      { word: 'seeds', pos: 'N' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'VP', count: 2 },
      { kind: 'CP', count: 1 },
      { kind: 'S', count: 2 },
    ],
  },

  // ── Level 5: wh-movement / Trace ───────────────────────────────────────────
  {
    id: 5,
    title: 'Level 5 · 寻迹无形',
    description:
      '移位（Movement）。疑问词「What」被强行抽离到了句首。你需要在原本的宾语空缺处放置一个 Trace 节点，维持结构的完整。',
    targetSentence: 'What did the bird find?',
    hint:
      'What 接入左侧预先生成的 wh-NP；在 find 后的空位拉入一个 Trace。无形的信号会跨越空间连接彼此。',
    availableWords: [
      { word: 'What', pos: 'Wh' },
      { word: 'did', pos: 'Aux' },
      { word: 'the', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'find', pos: 'V' },
    ],
    availableGates: [
      { kind: 'NP', count: 2 }, // 包含左侧预留的和主语
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
      { kind: 'CP', count: 1 },
    ],
    prespawnGates: [
      {
        kind: 'NP',
        id: 'g-5-NP-0',
        position: { x: 80, y: 240 },
        label: 'wh-NP',
      },
    ],
    allowTraces: true,
    grammarOverrides: {
      NP: [opt('Det'), star('Adj'), one('N', 'Pron', 'Wh')],
      VP: [one('V'), opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
      CP: [one('NP'), opt('Aux'), one('S')],
    },
  },

  // ── Level 6: garden path — backtracking required ───────────────────────────
  {
    id: 6,
    title: 'Level 6 · 歧路迷宫 (Boss)',
    description:
      '经典花园小径句（Garden-Path）。大脑会本能地将 chased 视作谓语动词，直到碰壁。利用回溯机制，将其解析为分词后置定语。',
    targetSentence: 'The bird chased past the meadow fell.',
    hint: 'chased 这里是被动分词（PassPart）。让它和 PP 组合，作为小尾巴挂载到 bird 所在的 NP 模块内，为主谓语 fell 让路。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      // chased is ambiguous: V (finite past) vs PassPart (reduced relative head)
      { word: 'chased', pos: 'V', altPos: ['PassPart'] },
      { word: 'past', pos: 'P' },
      { word: 'the', pos: 'Det' },
      { word: 'meadow', pos: 'N' },
      { word: 'fell', pos: 'V' },
    ],
    availableGates: [
      { kind: 'NP', count: 3 },
      { kind: 'PP', count: 1 },
      { kind: 'VP', count: 1 },
      { kind: 'S', count: 1 },
    ],
    allowPOSBacktracking: true,
    grammarOverrides: {
      // NP 允许挂载简化定语从句 [PassPart PP]
      NP: [
        opt('Det'),
        star('Adj'),
        one('N'),
        opt('PassPart'),
        star('PP'),
      ],
      VP: [one('V'), opt('NP'), star('PP'), star('Adv')],
    },
  },
]

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}

export function grammarForLevel(level: Level): Record<GateKind, PSR> {
  const merged: Partial<Record<GateKind, PSR>> = {
    ...DEFAULT_GRAMMAR,
    ...(level.grammarOverrides ?? {}),
  }
  return merged as Record<GateKind, PSR>
}