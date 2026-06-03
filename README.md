<div align="center">

# 🔌 Syntax Complete · 句法完备

### *Where Chomsky meets Turing Complete.*
### *当乔姆斯基遇上《图灵完备》。*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Flow](https://img.shields.io/badge/React_Flow-12-FF0072)](https://reactflow.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

> *“Colorless green ideas sleep furiously.”*
> — Noam Chomsky, *Syntactic Structures* (1957)

A puzzle sandbox where you **wire words into sentences** — and the circuit only lights up if the grammar is well-formed.
一款把“连线游戏”与“生成语法”焊在一起的句法解析沙盒 —— 句子合法,电路才会亮起。

[English](#-english) · [中文](#-中文)

</div>

---

## 🇬🇧 English

### 1 · Introduction

**Syntax Complete** is an interactive linguistic simulator in the spirit of the cult puzzle game *Turing Complete* — but instead of NAND gates and adders, the primitives are **lexical items** and **phrase-structure rules**.

Players drag *words* from a palette, snap them into *phrase gates* (NP, VP, PP, S…), and watch a current of grammaticality propagate from leaves to root. When — and only when — the wiring corresponds to a valid derivation under a context-free grammar, the **`S` node ignites** and the level is cleared.

It is part game, part teaching tool, part love letter to the strange machinery in our heads.

### 2 · Background & Philosophy

Traditional syntax pedagogy lives on the whiteboard: arrows, brackets, tree diagrams chalked out by hand. The problem isn't the *content* — it's the *medium*. A static tree hides the very thing that makes syntax beautiful: **process**. You cannot see the bottom-up reduction; you cannot feel a rule firing.

> *Syntax Complete reframes parsing as wiring. Reduction becomes signal propagation. Ambiguity becomes a fork in the circuit.*

The deeper motivation is what Chomsky calls **Discrete Infinity** — the most distinctive property of human language. From a finite lexicon and a finite set of recursive rules, we produce a literally infinite set of well-formed expressions. No animal communication system known to us does this. Every time a child says a sentence she has never heard, she is exercising the same combinatorial engine the game asks you to assemble by hand.

The hope is that by *building the machine*, players come to feel — not merely be told — why language is the way it is.

### 3 · Core Engine · The CFG Solver

Under the hood lives a compact, dependency-free **context-free grammar evaluator** — a single ~530-line TypeScript file (`src/engine/syntaxValidator.ts`) with zero parsing libraries.

#### 3.1 Anatomy of the circuit

| Layer | Game Metaphor | Linguistic Object | Implementation |
|---|---|---|---|
| **Lexicon** | Input signals at the bottom rail | Terminals tagged with POS | `WordNode` emits its `pos` (`Det` / `N` / `V` / `Adj` / `Adv` / `P` / `Pron` / `Conj` / `C` / `Wh` / `Aux` / `PassPart`) |
| **Phrase Gates** | Logic gates | Non-terminals | `GateNode` of kind `NP` / `VP` / `PP` / `CP` / `S` / `AdjP` |
| **Traces** | Invisible repeaters | Movement / unbounded dependency | `TraceNode` re-emits whatever its bound antecedent emits — distance on canvas is irrelevant |
| **Wires** | Conductive edges | Immediate-constituency relations | A React Flow edge `source → target` means *source is a child of target* (bottom-up) |
| **The Sun ☀️** | Output LED | The "publish" of the start symbol | The root `S` / `CP` must be wired into a pinned `sun-terminus` node to fire |

#### 3.2 The grammar — a tiny, level-aware DSL

Production rules are written in a hand-rolled DSL with four quantifiers: `one(…)`, `opt(…)`, `star(…)`, `plus(…)` — corresponding to `1`, `?`, `*`, `+` in standard regex/EBNF. Each slot may accept a set of alternatives. Here is the **actual default grammar shipped in `src/config/levels.ts`**:

```ts
export const DEFAULT_GRAMMAR = {
  NP:   [opt('Det'), star('Adj'), one('N', 'Pron'),  star('PP')],
  VP:   [one('V'),   opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
  PP:   [one('P'),   one('NP', 'Trace')],
  CP:   [one('C'),   one('S')],
  S:    [one('NP', 'Trace'), one('VP')],
  AdjP: [star('Adv'), one('Adj')],
}
```

Each level can **override** entries in this base grammar to unlock or constrain structure. For example, Level 5 (*wh-movement*) widens `NP` to accept `Wh` heads and rewrites `CP` so that the wh-phrase, the auxiliary, and the residue clause line up:

```ts
// Level 5 — wh-questions
NP: [opt('Det'), star('Adj'), one('N', 'Pron', 'Wh')],
CP: [one('NP'),  opt('Aux'),  one('S')],
```

Level 6 (*garden path*) widens `NP` again to license a reduced relative clause tail `[ PassPart PP* ]`, which is what makes *"the bird chased past the meadow"* a legal noun phrase rather than a sentence:

```ts
// Level 6 — reduced relative inside NP
NP: [opt('Det'), star('Adj'), one('N'), opt('PassPart'), star('PP')],
```

#### 3.3 How a circuit is judged · the seven passes

When the player hits **RUN**, `validateCurrentCircuit(nodes, edges, levelId)` executes the following sequence:

1. **Pre-flight checks** — at least one gate on the canvas; traces only allowed on movement-enabled levels.
2. **POS-assignment enumeration** — for words with `altPos` (e.g. *chased* = `V | PassPart` in Level 6), the validator builds the Cartesian product of assignments and tries each in turn. The player-intended primary POS is tried first; backtracking only fires when it fails. This is what implements the garden-path "re-analysis".
3. **Child-ordering by canvas X** — for every gate, its incoming edges are sorted by the `x` coordinate of the source node. This is the trick that lets the canvas's left-to-right layout *be* the sentence's linear order — no manual indexing required.
4. **Root detection** — the root is the unique gate whose category is `S` (or `CP` on Level 5) and whose only outgoing edge, if any, targets the `sun-terminus`. Multiple disconnected roots, missing roots, or wrong-typed roots are surfaced as targeted errors.
5. **Bottom-up resolution** — `resolveNode()` walks the tree depth-first with memoization. `WordNode` → its POS. `TraceNode` → recursively resolves its `bindsTo` antecedent. `GateNode` → resolves all children first, then matches the resulting category sequence against the gate's PSR.
6. **PSR matching with backtracking** — `matchPSR()` is a small recursive matcher that handles quantifiers properly: greedy on `*`/`+` with back-off, optional `?` tried both ways, alternative sets via `slot.cat.includes(c)`. On failure, it walks the sequence once more to **pinpoint the first mismatched position** for a readable error (`At position 3: expected (NP|CP|Trace)?, got Adj`).
7. **Sanity sweep** — (a) cycle detection via a `visiting` set during recursion — circular wiring is rejected outright; (b) reachability check from the root — any stray word that didn't make it into the tree raises a "this word isn't plugged in" error; (c) the root must finally be wired into the Sun, or nothing ignites.

#### 3.4 Syntactic short-circuit

When any step above fails, the validator returns a `ValidationResult` with:

- `success: false`
- `errorNodeId` — the most relevant node to highlight (often the offending gate, sometimes the bad child or the dangling word);
- `message` — a localized Chinese explanation generated from the rule, the expected slot, and the actual category sequence;
- `litEdges` — the edges that did light up before the failure, so partial progress is still visualized.

On success, every edge in the parse tree (plus the final root → Sun wire) is returned in `litEdges`, and the canvas runs a sequential power-on animation from the leaves up to the Sun.

### 4 · Game as Experiment · Linguistic Levels

The game ships **six hand-curated levels** under a unified *nature-observation* theme — each one introduces exactly one new piece of syntactic machinery, and the difficulty curve maps onto a real subsection of generative syntax.

| # | Title | Target sentence | What it teaches |
|---|---|---|---|
| 1 | 万物初光 · *First Light* | `The bird finds seeds.` | Plain SVO — `S → NP VP`, `VP → V NP` |
| 2 | 色彩浮现 · *Colors Emerge* | `The bright bird finds seeds.` | Adjective stacking inside NP — `NP → Det? Adj* N` |
| 3 | 空间延展 · *Space Unfolds* | `The bird finds seeds in the meadow.` | Recursive PP attachment to VP — `VP → V NP PP*` |
| 4 | 嵌套法则 · *The Nesting Law* | `The observer saw that the bird found seeds.` | **Discrete Infinity** — a CP wraps a full S inside another VP |
| 5 | 寻迹无形 · *Tracing the Invisible* | `What did the bird find?` | **Wh-movement** via a `TraceNode` re-emitting its antecedent |
| 6 | 歧路迷宫 · *Garden of Forking Paths* (Boss) | `The bird chased past the meadow fell.` | **Garden-path re-analysis** via POS backtracking |

Two of these deserve a closer look.

#### 🌿 Level 5 · Wh-movement, made visible

Generative syntax claims that *"What did the bird find?"* is derived from an underlying *"the bird find **what**"* by **moving** *what* to the front and leaving behind a silent, coindexed trace `t`. The trace is invisible in the surface string — but it is doing real work: the verb *find* still needs an object, and the trace is what satisfies that slot.

The game makes the invisible visible. The level pre-spawns a `wh-NP` block on the left where *what* lands; the player drags a `TraceNode` into the empty object slot after *find* and binds it (`bindsTo`) to the wh-NP. The validator's `resolveNode()` then literally re-emits the antecedent's category across the canvas — wh-movement, implemented as **a wire that doesn't need to be drawn**.

#### 🧭 Level 6 · The Garden Path, and what your parser does in the dark

> *The bird chased past the meadow fell.*

A perfectly grammatical sentence that almost no one can read correctly on the first pass. Your parser greedily commits to *chased* as the main verb the moment it sees it; by the time *fell* arrives, the structure it has been building no longer admits a verb, and the whole thing seems to collapse.

It doesn't collapse. *Chased past the meadow* is a **reduced relative clause** modifying *bird* — i.e. *the bird [that was] chased past the meadow* — and *fell* is the actual main verb.

This is exactly what the engine models. *Chased* is declared with `pos: 'V', altPos: ['PassPart']`. The validator first tries `V` (the player's intuitive reading) — the parse fails, because there is no room for a second main verb. It then **backtracks** to `PassPart`, at which point the widened Level-6 `NP` rule `[Det? Adj* N PassPart? PP*]` accepts the reduced relative, the sentence parses, and the lamp lights up. The frustration the player feels in the seconds *before* that — that is the entire point of the level. It is what psycholinguists call **re-analysis**, and almost everyone does it, in real time, every day.

### 5 · Repository Structure

```
syntax-complete/
├── public/
├── src/
│   ├── components/
│   │   ├── nodes/                    # React Flow custom node renderers
│   │   │   ├── WordNode.tsx                # terminal · lexical item, carries POS
│   │   │   ├── GateNode.tsx                # NP / VP / PP / CP / S / AdjP phrase gate
│   │   │   ├── TraceNode.tsx               # invisible "wire repeater" for movement
│   │   │   └── SunNode.tsx                 # the final ☀️ terminus that lights up on success
│   │   ├── BlockPalette.tsx          # drag-source side panel (words + gates)
│   │   ├── LevelSelector.tsx         # level picker / progress UI
│   │   └── SyntaxCanvas.tsx          # React Flow canvas + RUN / power-on animation
│   │
│   ├── engine/
│   │   └── syntaxValidator.ts        # the CFG core — single-file, ~530 LOC, zero deps
│   │                                 #   ├─ validateCurrentCircuit()  ← public entry
│   │                                 #   ├─ enumerateAssignments()    ← POS backtracking
│   │                                 #   ├─ resolveNode / resolveGate ← bottom-up reducer
│   │                                 #   ├─ matchPSR()                ← quantified pattern matcher
│   │                                 #   └─ collectReachable()        ← stray-word check
│   │
│   ├── config/
│   │   └── levels.ts                 # PSR DSL (one/opt/star/plus) +
│   │                                 # DEFAULT_GRAMMAR + the six hand-curated levels
│   │
│   ├── types/
│   │   └── game.ts                   # POS · GateKind · Category · Node data payloads
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                     # Tailwind v4 entry
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig*.json
├── package.json
└── README.md
```

> **Note**: the engine deliberately lives in **one** file rather than being fanned out across `evaluator / rules / diagnostics / ambiguity`. At ~530 lines it stays readable end-to-end, and keeping the recursive resolver, the PSR matcher, and the diagnostic strings co-located turns out to be the cleanest way to keep error messages in sync with the rule that produced them.

### 6 · Tech Stack

| | |
|---|---|
| **Framework** | React 19 + TypeScript |
| **Graph canvas** | React Flow 12 — custom node & edge renderers |
| **Styling** | Tailwind CSS 4 (utility-first, zero runtime CSS-in-JS) |
| **Engine** | Hand-written CFG reducer, ~0 KB of grammar dependencies |

### 7 · Quick Start

```bash
git clone https://github.com/<you>/syntax-complete.git
cd syntax-complete
npm install
npm run dev
```

Open `http://localhost:5173`, pick a level, and start wiring.

### 8 · Conclusion

Every time you speak, your brain runs a parse, a unification, a working-memory shuffle, and a phonological encode — in well under a second, in noisy rooms, while thinking about lunch. We do this so effortlessly that it feels like nothing.

It is not nothing. It is, by some measures, the most computationally intricate routine biology has ever produced.

> *Syntax Complete* is a small bow to that quiet miracle —
> built so that for ten minutes you have to do, *deliberately and with your hands*,
> what your mind has been doing *automatically and in the dark* your entire life.

---

## 🇨🇳 中文

### 1 · 软件介绍

**Syntax Complete(句法完备)** 是一款受邪典解谜游戏 *Turing Complete(图灵完备)* 启发的交互式语言学模拟器 —— 只不过这一次,电路里跑的不再是与非门和加法器,而是**词项(lexical item)** 与 **短语结构规则(phrase-structure rule)**。

玩家从词库面板中拖出一个个单词,把它们焊进 NP / VP / PP / S 等"短语门",然后看着一股"合法性的电流"从叶子节点自底向上传播。**当且仅当**整张连线图对应一棵在上下文无关文法下合法的推导树时,顶部的 `S` 节点才会被点亮,本关通过。

它一半是游戏,一半是教具,还有一半是写给我们脑袋里那台奇怪机器的一封情书。

### 2 · 设计背景与理念

传统的句法学课堂活在黑板上:箭头、方括号、手画的树状图。问题不在内容,而在**媒介** —— 一张静止的树图恰好掩盖了句法最迷人的东西:**过程**。你看不见自底向上的规约,也无法"感受"一条规则在被触发的瞬间。

> *Syntax Complete 把"解析"重新诠释为"连线"。规约成了信号传播,歧义成了电路的分叉。*

更深一层的动机,是 Chomsky 所说的 **离散无限性(Discrete Infinity)** —— 它被认为是人类语言区别于所有已知动物交流系统的最核心属性。我们用**有限**的词汇和**有限**的递归规则,生成**字面意义上无限**的合法表达。每当一个孩子说出一句她从未听过的句子,她调用的,正是这套组合引擎 —— 也正是这款游戏请你亲手搭出来的那一套。

我希望通过让玩家**亲手把机器拼起来**,他们不仅"被告知"、而是"感觉到"语言为什么是这样的。

### 3 · 核心引擎 · CFG 判定逻辑

游戏底层是一个紧凑的、零依赖的 **上下文无关文法求值器(CFG evaluator)** —— 全部逻辑集中在一份约 530 行的 TypeScript 文件里:`src/engine/syntaxValidator.ts`,不依赖任何外部解析库。

#### 3.1 电路的解剖

| 层级 | 游戏隐喻 | 语言学对应物 | 代码实现 |
|---|---|---|---|
| **词库 (Lexicon)** | 底部输入信号 | 带词性标签的终结符 | `WordNode` 发射它的 `pos`(`Det` / `N` / `V` / `Adj` / `Adv` / `P` / `Pron` / `Conj` / `C` / `Wh` / `Aux` / `PassPart`) |
| **短语门 (Gate)** | 逻辑门 | 非终结符 | `GateNode`,种类为 `NP` / `VP` / `PP` / `CP` / `S` / `AdjP` |
| **痕迹 (Trace)** | 隐形信号中继 | 成分移位 / 跨距依存 | `TraceNode` 重新发射其先行词的范畴 —— 画布距离无关 |
| **连线 (Wire)** | 导电边 | 直接成分支配关系 | React Flow 边 `source → target` 表示 *source 是 target 的子节点*(自底向上) |
| **太阳 ☀️** | 输出 LED | 起始符号的"发布" | 根 `S` / `CP` 必须接入预置的 `sun-terminus` 节点才能点亮 |

#### 3.2 文法 —— 一套微型的、可分关卡定制的 DSL

产生式规则用一套手写的 DSL 表达,提供四个量词:`one(…)`、`opt(…)`、`star(…)`、`plus(…)`,分别对应标准 EBNF/regex 中的 `1`、`?`、`*`、`+`。每个槽位都可以接受一个候选集合。下面是 `src/config/levels.ts` 中**实际跑在引擎里的默认文法**:

```ts
export const DEFAULT_GRAMMAR = {
  NP:   [opt('Det'), star('Adj'), one('N', 'Pron'),  star('PP')],
  VP:   [one('V'),   opt('NP', 'CP', 'Trace'), star('PP'), star('Adv')],
  PP:   [one('P'),   one('NP', 'Trace')],
  CP:   [one('C'),   one('S')],
  S:    [one('NP', 'Trace'), one('VP')],
  AdjP: [star('Adv'), one('Adj')],
}
```

每个关卡都可以 **覆盖(override)** 默认文法中的条目,以解锁或收紧结构。例如 Level 5(*wh-移位*) 扩宽了 `NP` 让它接受 Wh 中心语,并重写 `CP` 把疑问词、助动词、残余从句这三段对齐:

```ts
// Level 5 —— wh-疑问句
NP: [opt('Det'), star('Adj'), one('N', 'Pron', 'Wh')],
CP: [one('NP'),  opt('Aux'),  one('S')],
```

Level 6(*花园小径*) 又一次扩宽 `NP`,允许它带一条简化关系从句的尾巴 `[ PassPart PP* ]` —— 正是这条规则,让 *"the bird chased past the meadow"* 成为一个合法的名词短语,而不是一个完整的句子:

```ts
// Level 6 —— NP 内部允许简化关系从句
NP: [opt('Det'), star('Adj'), one('N'), opt('PassPart'), star('PP')],
```

#### 3.3 电路如何被审判 · 七道工序

玩家按下 **RUN** 之后,`validateCurrentCircuit(nodes, edges, levelId)` 会依次执行以下七步:

1. **预检 (Pre-flight)** —— 画布上至少要有一个 gate;只有解锁了"移位"的关卡才允许出现 Trace。
2. **POS 候选枚举** —— 对带 `altPos` 的词条(例如 Level 6 中 *chased* = `V | PassPart`),引擎构造所有可能词性赋值的笛卡尔积并逐个尝试。玩家最初拖出的"主词性"会被**优先尝试**,只有它失败时才会触发回溯。这正是"花园小径重新分析(re-analysis)"在代码里的样子。
3. **按画布 X 排序子节点** —— 每个 gate 的输入边按其源节点的 `x` 坐标排序。这就是为什么画布上"从左到右"的视觉布局会**直接等于**句子的线性语序 —— 无需任何手动索引。
4. **根节点检测** —— 根 = 一个范畴为 `S`(Level 5 上则可为 `CP`) 的 gate,它要么没有任何向上的输出边,要么唯一的输出边接到 `sun-terminus`。多个不相连的根、根缺失、根范畴错误,都会被分别报告为有针对性的错误。
5. **自底向上规约** —— `resolveNode()` 深度优先递归,带记忆化缓存。`WordNode` → 其 POS;`TraceNode` → 递归求解其 `bindsTo` 先行词;`GateNode` → 先求解所有子节点,然后把得到的范畴序列拿去匹配自己的 PSR。
6. **带回溯的 PSR 匹配** —— `matchPSR()` 是一个小型的递归匹配器,正确处理量词:`*` / `+` 贪婪消费并支持回退,`?` 两种走法都尝试,候选集合通过 `slot.cat.includes(c)` 实现。匹配失败时,它会**再走一遍序列以定位第一个不匹配位置**,生成可读的错误信息(例如 `At position 3: expected (NP|CP|Trace)?, got Adj`)。
7. **理智性扫尾** —— (a) 在递归中维护 `visiting` 集合,**检测连线成环**并直接拒绝;(b) 从根节点出发做一次可达性遍历,任何**没有接入根节点之树的散落词条**都会被报"这个词还没接进句子里";(c) 根节点最终必须有一根线接到 ☀️ Sun 上,否则整条电路不会被点亮。

#### 3.4 句法短路 (Syntactic Short-Circuit)

只要上述任意一步失败,validator 都会返回一个 `ValidationResult`:

- `success: false`
- `errorNodeId` —— 最应当被高亮的节点(通常是出问题的 gate,有时是错误的子节点,有时是没被接入的散词);
- `message` —— 一段中文人话错误信息,由规则、期望的槽位、以及实际收到的范畴序列共同生成;
- `litEdges` —— 在失败前已经成功点亮的那部分边,让玩家的"半成品"仍能被可视化。

匹配成功时,完整解析树上的每一条边(加上最终的 根 → Sun 那一根) 都会出现在 `litEdges` 里,画布会播放一段**自叶子向上、逐级点亮**的电流动画 —— 一直烧到太阳上为止。

### 4 · 游戏即实验 · 关卡中的语言学

游戏内置 **六个手工设计的关卡**,统一在 *自然观察* 的主题之下 —— 每一关恰好引入**一个新的句法机制**,整体难度曲线对应着生成语法教材的一段真实路径。

| # | 关卡 | 目标句 | 教学要点 |
|---|---|---|---|
| 1 | 万物初光 | `The bird finds seeds.` | 基础 SVO —— `S → NP VP`、`VP → V NP` |
| 2 | 色彩浮现 | `The bright bird finds seeds.` | NP 内形容词堆叠 —— `NP → Det? Adj* N` |
| 3 | 空间延展 | `The bird finds seeds in the meadow.` | PP 递归挂载到 VP —— `VP → V NP PP*` |
| 4 | 嵌套法则 | `The observer saw that the bird found seeds.` | **离散无限性** —— CP 把一整个 S 装进另一个 VP |
| 5 | 寻迹无形 | `What did the bird find?` | **Wh-移位**,用 `TraceNode` 把先行词的范畴再发射一次 |
| 6 | 歧路迷宫 (Boss) | `The bird chased past the meadow fell.` | **花园小径 / 重新分析**,通过 POS 回溯实现 |

其中有两关特别值得展开说一下。

#### 🌿 Level 5 · 让"移位"变得肉眼可见

生成语法的经典主张是:*"What did the bird find?"* 这种 wh-疑问句,其底层结构是 *"the bird find **what**"*;表层之所以变成 *"What did ..."*,是因为 *what* 被**移**到了句首,并在原宾语位置留下了一个与它**同指**的、无声的 trace `t`。这个 trace 在表层字符串里完全消失了 —— 但它仍在做事:动词 *find* 仍然需要一个宾语,这个槽位是由 trace 来填的。

这款游戏把这件**无形**的事变得**有形**。本关在画布左侧预先生成一个 `wh-NP` 方块给 *what* 落地;玩家把一个 `TraceNode` 拖到 *find* 后面的空宾语位上,通过 `bindsTo` 字段把它绑定到 wh-NP 方块。验证器中的 `resolveNode()` 随后会真的把先行词的范畴**跨画布再发射一次** —— wh-移位,在这里被实现成了一根**不需要画出来的电线**。

#### 🧭 Level 6 · 花园小径,以及你的解析器在黑暗中做的事

> *The bird chased past the meadow fell.*

一句语法上**完全合法**、但几乎没人能第一遍就读对的句子。你的大脑会**贪心地**把 *chased* 当成主谓动词锁定,等到 *fell* 出现时,正在构建的结构里早已没有再放一个动词的位置 —— 整个解析仿佛轰然倒塌。

但它并没有倒。*Chased past the meadow* 实际是一个修饰 *bird* 的**简化关系从句**(等于 *the bird [that was] chased past the meadow*),*fell* 才是真正的主谓动词。

这正是引擎刻意建模的事情。*Chased* 这个词条被声明为 `pos: 'V', altPos: ['PassPart']`。验证器先尝试 `V`(玩家最直觉的那一种解读) —— 解析失败,因为没有第二个主动词的位置可放。它随后**回溯**到 `PassPart`,而 Level 6 中被加宽过的 NP 规则 `[Det? Adj* N PassPart? PP*]` 恰好接受这个简化关系从句,整个句子顺利解析,电路点亮。玩家在按下 RUN 之后、在灯亮起之前那几秒的挫败感 —— **就是这一关的全部意义所在**。心理语言学家管这件事叫 **re-analysis(重新分析)**;它发生在你我每天的对话里,实时地、不被觉察地。

### 5 · 仓库结构

```
syntax-complete/
├── public/
├── src/
│   ├── components/
│   │   ├── nodes/                    # React Flow 自定义节点渲染器
│   │   │   ├── WordNode.tsx                # 终结符 · 词项,携带 POS
│   │   │   ├── GateNode.tsx                # NP / VP / PP / CP / S / AdjP 短语门
│   │   │   ├── TraceNode.tsx               # 移位用的隐形"信号中继"
│   │   │   └── SunNode.tsx                 # 顶端 ☀️ 终点节点,过关时点亮
│   │   ├── BlockPalette.tsx          # 左侧拖拽面板(词条 + 短语门)
│   │   ├── LevelSelector.tsx         # 关卡选择 / 进度 UI
│   │   └── SyntaxCanvas.tsx          # React Flow 画布 + RUN 通电动画
│   │
│   ├── engine/
│   │   └── syntaxValidator.ts        # CFG 内核 —— 单文件,约 530 行,零依赖
│   │                                 #   ├─ validateCurrentCircuit()  ← 对外入口
│   │                                 #   ├─ enumerateAssignments()    ← POS 回溯
│   │                                 #   ├─ resolveNode / resolveGate ← 自底向上规约
│   │                                 #   ├─ matchPSR()                ← 带量词的模式匹配
│   │                                 #   └─ collectReachable()        ← 散落词条检测
│   │
│   ├── config/
│   │   └── levels.ts                 # PSR DSL (one/opt/star/plus) +
│   │                                 # DEFAULT_GRAMMAR + 六个手工设计的关卡
│   │
│   ├── types/
│   │   └── game.ts                   # POS · GateKind · Category · 节点数据载荷
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                     # Tailwind v4 入口
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig*.json
├── package.json
└── README.md
```

> **说明**:CFG 引擎刻意保持在**一个文件**里,而不是被拆分为 `evaluator / rules / diagnostics / ambiguity` 这种典型布局。整份代码 530 行左右,完全可以一口气读完;而把递归规约器、PSR 匹配器、错误信息生成放在同一处,反而是让"报错文案永远与规则同步"的最干净写法。

### 6 · 技术栈

| | |
|---|---|
| **框架** | React 19 + TypeScript |
| **画布** | React Flow 12 —— 自定义节点与边渲染 |
| **样式** | Tailwind CSS 4(utility-first,无运行时 CSS-in-JS 开销) |
| **引擎** | 手写 CFG 规约器,几乎零文法依赖 |

### 7 · 快速开始

```bash
git clone https://github.com/<you>/syntax-complete.git
cd syntax-complete
npm install
npm run dev
```

打开 `http://localhost:5173`,选一关,开始接线。

### 8 · 结语

每一次你开口说话,你的大脑都在不到一秒之内,**并行完成**:一次句法解析、一次语义合一、一次工作记忆调度,以及一次音系编码 —— 在嘈杂的房间里,在你一边走神想着午饭吃什么的时候。我们做这件事如此毫不费力,以至于它感觉**像什么都没发生**。

但它绝不是"什么都没发生"。从某种度量上看,这是生物演化所产生过的**最精密的常规运算**之一。

> *Syntax Complete* 是写给这个无声奇迹的一次小小致敬 ——
> 它把你拽过来,**有意识地、用你的双手**,去做一遍
> 你这一生**无意识地、在黑暗中**已经做了亿万次的事情。

---

<div align="center">

*Built with React, TypeScript, React Flow & Tailwind CSS · MIT Licensed*

**`if (sentence.isGrammatical()) lamp.glow();`**

</div>
