import type { GateKind, POS, Category } from '../types/game'

// ─────────────────────────────────────────────────────────────────────────────
// Player-facing display names & Colors (DP/TP & Ghost Gate Edition)
// ─────────────────────────────────────────────────────────────────────────────

export const GATE_DISPLAY_NAME: Record<string, string> = {
  DP: '限定词最大投影',
  'D-bar': '限定词中间层 (D\')',
  NP: '名词最大投影',
  'N-bar': '名词中间层 (N\')',
  VP: '动词最大投影',
  'V-bar': '动词中间层 (V\')',
  PP: '介词最大投影',
  'P-bar': '介词中间层 (P\')',
  CP: '标句词最大投影',
  'C-bar': '标句词中间层 (C\')',
  TP: '时态最大投影 (句子)',
  'T-bar': '时态中间层 (T\')',
  AdjP: '形容词最大投影',
  'Adj-bar': '形容词中间层 (Adj\')',
  '∅-D': '∅ (空限定词)',
  '∅-T': '∅ (空时态)',
}

export const GATE_COLOR: Record<string, string> = {
  DP: '#2dd4bf',      // teal
  'D-bar': '#5eead4', // lighter teal
  NP: '#34d399',      // emerald
  'N-bar': '#6ee7b7', // lighter emerald
  VP: '#fb7185',      // rose
  'V-bar': '#fda4af', // lighter rose
  PP: '#818cf8',      // indigo
  'P-bar': '#a5b4fc', // lighter indigo
  CP: '#c084fc',      // violet
  'C-bar': '#d8b4fe', // lighter violet
  TP: '#fbbf24',      // amber (replaced S)
  'T-bar': '#fcd34d', // lighter amber
  AdjP: '#facc15',    // yellow
  'Adj-bar': '#fef08a',
  PartP: '#38bdf8',      // 天蓝色
  'Part-bar': '#7dd3fc', // 稍浅的天蓝色
  '∅-D': '#94a3b8',   // slate (ghost styling)
  '∅-T': '#94a3b8',
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
// X-Bar Theory Grammar (Strict DP / TP & Null Elements Edition)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GRAMMAR: Partial<Record<string, PSR[]>> = {
  // 幽灵方块（空节点）不需要任何下层输入即可生成
  '∅-D': [[]],
  '∅-T': [[]],

  DP: [
    [one('D-bar')],
  ],
  'D-bar': [
    [one('Det'), one('NP')],               // 显式限定词 (e.g. the bird)
    [one('∅-D'), one('NP')],               // 幽灵限定词 (e.g. ∅ seeds)
  ],

  NP: [
    [one('N-bar')],
  ],
  'N-bar': [
    [one('N')],
    [one('Pron')],
    [one('Wh')],
    [one('AdjP'), one('N-bar')],
    [one('N-bar'), one('PP')],
    [one('N-bar'), one('CP')],
  ],

  VP: [
    [one('V-bar')],
  ],
  'V-bar': [
    [one('V')],
    [one('V'), one('DP')],                 // 动词吃掉 DP！
    [one('V'), one('CP')],
    [one('V'), one('Trace')],
    [one('V-bar'), one('PP')],
    [one('V-bar'), one('Adv')],
  ],

  PP: [
    [one('P-bar')],
  ],
  'P-bar': [
    [one('P'), one('DP')],                 // 介词吃掉 DP！
    [one('P'), one('Trace')],
  ],

  CP: [
    [one('C-bar')],
    [one('DP'), one('C-bar')],             // Wh-移位: DP 在 SpecCP 位置
  ],
  'C-bar': [
    [one('C'), one('TP')],
    [one('Aux'), one('TP')],               // T 到 C 移位
    [one('TP')],
  ],

  // 曾经的 S，现在的 TP
  TP: [
    [one('DP'), one('T-bar')],             // 主语 DP 在 SpecTP 位置
    [one('Trace'), one('T-bar')],
  ],
  'T-bar': [
    [one('Aux'), one('VP')],               // 显式助动词/时态 (e.g. did find)
    [one('∅-T'), one('VP')],               // 幽灵时态 (e.g. ∅ finds)
  ],

  AdjP: [
    [one('Adj-bar')],
  ],
  'Adj-bar': [
    [one('Adj')],
    [one('Adv'), one('Adj-bar')],
  ],
  PartP: [
    [one('Part-bar')],            // 1. PartP 必须由 Part-bar 投射而来
  ],
  'Part-bar': [
    [one('PassPart'), one('PP')], // 2. Part-bar 由过去分词和介词短语补足语结合而成
  ],
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
  kind: GateKind | string
}

export interface PrespawnGate {
  kind: GateKind | string
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
  grammarOverrides?: Partial<Record<string, PSR[]>>
  allowTraces?: boolean
  allowPOSBacktracking?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// The six levels (Strict DP/TP Edition)
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS: Level[] = [
  {
    id: 1,
    title: 'Level 1 · 万物初光 (DP & TP)',
    description: '采用最严谨的 DP/TP 假说。如果名词前没有 The，你需要使用「∅ (空限定词)」；如果动词没有伴随助动词，你需要使用「∅ (空时态)」。',
    targetSentence: 'The bird finds seeds.',
    hint: '连线：seeds -> NP -> (与 ∅-D 结合) -> D\' -> DP。finds -> VP -> (与 ∅-T 结合) -> T\' -> TP。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'finds', pos: 'V' },
      { word: 'seeds', pos: 'N' },
    ],
    availableGates: [
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'TP' }, { kind: 'T-bar' }, { kind: '∅-T' },
    ],
  },

  {
    id: 2,
    title: 'Level 2 · 色彩浮现 (Adjunction)',
    description: '形容词作为附加语，必须附着在 N-bar 上。注意：先让形容词修饰 N-bar，最后再交给 Det 去闭合 DP。',
    targetSentence: 'The bright bird finds seeds.',
    hint: 'bright(Adj) -> Adj\' -> AdjP。然后 AdjP + N\'(bird) 组合成一个新的 N\'。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bright', pos: 'Adj' },
      { word: 'bird', pos: 'N' },
      { word: 'finds', pos: 'V' },
      { word: 'seeds', pos: 'N' },
    ],
    availableGates: [
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'AdjP' }, { kind: 'Adj-bar' },
      { kind: 'TP' }, { kind: 'T-bar' }, { kind: '∅-T' },
    ],
  },

  {
    id: 3,
    title: 'Level 3 · 空间延展 (Recursion)',
    description: '介词需要吃掉一个 DP 生成 P-bar。做好的 PP 附加到 V-bar 上构成状语。',
    targetSentence: 'The bird finds seeds in the meadow.',
    hint: '记得给 seeds 挂上 ∅-D，并给 finds 挂上 ∅-T！',
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
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'PP' }, { kind: 'P-bar' },
      { kind: 'TP' }, { kind: 'T-bar' }, { kind: '∅-T' },
    ],
  },

  {
    id: 4,
    title: 'Level 4 · 嵌套法则 (CP)',
    description: '标句词 (that) 会作为 C 的中心词，吃掉一个完整的 TP 生成 C-bar，进而形成 CP 补足语被主句动词 saw 吃掉。',
    targetSentence: 'The observer saw that the bird found seeds.',
    hint: '不要忘记给两个光杆名词/动词提供幽灵方块。that(C) + TP -> C\' -> CP。',
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
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'CP' }, { kind: 'C-bar' },
      { kind: 'TP' }, { kind: 'T-bar' }, { kind: '∅-T' },
    ],
  },

  {
    id: 5,
    title: 'Level 5 · 寻迹无形 (Movement)',
    description: 'Wh-词作为 DP 移位到了 SpecCP。因为 did 已经是显式助动词了，所以本句不需要 ∅-T！',
    targetSentence: 'What did the bird find?',
    hint: 'What 需要先升满成 DP；把 Trace 留给 find(V) 的宾语位置。',
    availableWords: [
      { word: 'What', pos: 'Wh' },
      { word: 'did', pos: 'Aux' },
      { word: 'the', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'find', pos: 'V' },
    ],
    availableGates: [
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'CP' }, { kind: 'C-bar' },
      { kind: 'TP' }, { kind: 'T-bar' },
    ],
    prespawnGates: [],
    allowTraces: true,
  },

  {
    id: 6,
    title: 'Level 6 · 歧路迷宫 (Garden Path)',
    description: '当 chased 切换为被动分词时，将其与 PP 组合作为定语附着在 N-bar 上，把真正的 ∅-T 留给主句动词 fell。',
    targetSentence: 'The bird chased past the meadow fell.',
    hint: '这是一棵庞大且严谨的树。注意合理分配你的 ∅-D 和 ∅-T。',
    availableWords: [
      { word: 'The', pos: 'Det' },
      { word: 'bird', pos: 'N' },
      { word: 'chased', pos: 'V', altPos: ['PassPart'] },
      { word: 'past', pos: 'P' },
      { word: 'the', pos: 'Det' },
      { word: 'meadow', pos: 'N' },
      { word: 'fell', pos: 'V' },
    ],
    availableGates: [
      { kind: 'DP' }, { kind: 'D-bar' }, { kind: '∅-D' },
      { kind: 'NP' }, { kind: 'N-bar' },
      { kind: 'VP' }, { kind: 'V-bar' },
      { kind: 'PP' }, { kind: 'P-bar' },
      { kind: 'TP' }, { kind: 'T-bar' }, { kind: '∅-T' },
      { kind: 'PartP' }, { kind: 'Part-bar' },
    ],
    allowPOSBacktracking: true,
    grammarOverrides: {
      'N-bar': [
        [one('N')],
        [one('N-bar'), one('PP')],
        [one('N-bar'), one('PartP')],
      ],
    },
  },
]

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}

export function grammarForLevel(level: Level): Record<string, PSR[]> {
  const merged: Partial<Record<string, PSR[]>> = {
    ...DEFAULT_GRAMMAR,
    ...(level.grammarOverrides ?? {}),
  }
  return merged as Record<string, PSR[]>
}