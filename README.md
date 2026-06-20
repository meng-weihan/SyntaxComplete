# 🔌 Syntax Complete · 句法完备 · *X-bar Edition*

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
一款把“连线游戏”与“生成语法”焊在一起的句法解析沙盒 —— 只有严格遵循 X阶标理论，电路才会亮起。

---

## 📖 1. 软件介绍 (Introduction)

**Syntax Complete (句法完备)** 是一款交互式语言学模拟器。本项目最初基于多分支结构，现已**全面重构升级为严格的 X-bar 理论 (X阶标理论) 版本**，并完整支持 DP/TP 假说。

玩家不再是拼接“与或非门”，而是使用“中心语”、“补足语”和“附加语”作为逻辑门。玩家需将底部的单词节点，严格按照 `XP -> X'` 和 `X' -> X YP` 的规则，向上投射并拼接成一棵巨型句法树。当且仅当整张连线图满足生成语法的规则时，顶部的 `TP / CP` 节点才会被点亮，顺利通电过关。

本项目是《探索人类语言的奥秘》通识课的期末创意作业，旨在用“电路工程”的直观可视化，展现人类语言底层“离散无限性 (Discrete Infinity)”的数理之美。

---

## ✨ 2. 核心特性 (X-bar Edition Features)

本次重构抛弃了早期简单的 `S -> NP VP` 模型，引入了现代句法学的核心机制：

- **严格的二分枝与层级投影**：所有短语都必须经过中心语 (X) -> 中间层 (X') -> 最大投影 (XP) 的完整发育路径。
- **完整的 DP / TP 假说**：句子不再是孤立的 `S`，而是由时态 (T) 统领的时态最大投影 `TP`；名词短语由限定词 (D) 统领生成 `DP`。
- **空范畴 (Null Elements)**：当表面文本没有限定词或助动词时，必须手动引入物理可见的隐形节点（`∅-D`、`∅-T`）来维持结构的合法性。
- **移位与语迹 (Movement & Trace)**：硬核还原疑问句中的“主谓倒装 (T-to-C)”与“疑问词前置 (Wh-Movement)”。底层的语迹节点 `$t$` 会通过 ID 绑定，自动向上寻找并继承先行词的合法性。
- **动态词性消歧 (Garden-Path Re-analysis)**：支持节点词性的动态切换。在“花园小径句”关卡中，利用被动分词短语 (`PartP`) 作为附加语，完美还原人类大脑“重新分析”的心理过程。
- **防丢失状态缓存**：基于 `localStorage` 实时保存节点与连线状态，刷新不丢失。

---

## 🎮 3. 游戏方法 (How to Play)

1. **观察目标与词库**：每一关顶部会给出目标句子。底部散落着带有词性标记的基础词汇节点（如 `Det`, `N`, `V`）。
2. **拖拽句法门 (Gates)**：从左侧面板拖拽所需的 X-bar 节点到画布上，包括中间层 (`N'`, `V'`, `T'`) 和最大投影 (`DP`, `VP`, `TP`)。
3. **自下而上连线**：
   - 严格遵循 X-bar 几何结构：如动词 `V` 必须与作为宾语的 `DP` 结合生成 `V'`。
   - 处理空节点：遇到光杆名词或没有助动词的句子时，从左侧拖出灰色的 `∅-D` 或 `∅-T` 补全空缺。
   - 处理移位：在疑问句关卡中，将黄色的 `Trace (t)` 连入原位充当补足语。
4. **终极封顶与通电**：把组装好的最高级投影连入顶端自带发光属性的 `TP` 或 `CP`（太阳节点），点击顶部导航栏的 **“▶ Run / 验证”**。若结构无误，绿色电流将贯穿全屏！

---

## ⚙️ 4. 核心引擎与文法 (The CFG Solver)

游戏的核心是一个手写、零依赖的句法验证引擎 (`src/engine/syntaxValidator.ts`)。它包含递归求值、死循环（拓扑短路）检测以及基于词性回溯的消歧算法。

以下是运行在游戏底层，真实的 **DP/TP 假说文法 DSL片段 (`src/config/levels.ts`)**：

```ts
export const DEFAULT_GRAMMAR: Partial<Record<string, PSR[]>> = {
  // DP 假说
  DP: [[one('D-bar')]],
  'D-bar': [
    [one('Det'), one('NP')],    // 显式限定词 (e.g. the bird)
    [one('∅-D'), one('NP')],    // 幽灵限定词 (e.g. ∅ seeds)
  ],

  // 动词吃掉补足语生成中间层
  'V-bar': [
    [one('V')],
    [one('V'), one('DP')],      // 动词吃掉宾语
    [one('V'), one('Trace')],   // 动词吃掉语迹（移位）
  ],

  // TP 假说 (取代传统的 S)
  TP: [[one('DP'), one('T-bar')]],
  'T-bar': [
    [one('Aux'), one('VP')],    // 显式助动词
    [one('∅-T'), one('VP')],    // 幽灵时态
  ],

  // 标句词与疑问句移位
  CP: [
    [one('C-bar')],
    [one('DP'), one('C-bar')],  // Wh-移位: DP 在 SpecCP 位置
  ],
  'C-bar': [
    [one('C'), one('TP')],
    [one('Aux'), one('TP')],    // T-to-C 移位 (主谓倒装)
  ]
}
```

## 📁 5. 仓库结构 (Repository Structure)

本项目基于 **React + TypeScript + Vite + Tailwind CSS** 构建，核心连线系统基于 `@xyflow/react`。

**Plaintext**

```
syntax-complete/
├── src/
│   ├── components/
│   │   ├── nodes/              # React Flow 自定义节点 UI
│   │   │   ├── WordNode.tsx    # 词汇节点 (承载 POS 词性)
│   │   │   ├── GateNode.tsx    # X-bar 逻辑门 (X', XP)
│   │   │   ├── TraceNode.tsx   # 语迹节点 (处理 Movement)
│   │   │   └── SunNode.tsx     # 顶层通电目标节点
│   │   ├── SyntaxCanvas.tsx    # 核心画布，处理连线、存档与通电动画
│   │   └── BlockPalette.tsx    # 左侧逻辑门拖拽工具栏
│   │
│   ├── config/
│   │   └── levels.ts           # 极核心！定义引擎文法 (PSR) 与六大理论关卡
│   │
│   ├── engine/
│   │   └── syntaxValidator.ts  # CFG 引擎，执行自底向上的图论遍历、闭环检测与规则校验
│   │
│   ├── types/
│   │   └── game.ts             # 核心类型接口定义 (Category, GateKind 等)
│   │
│   ├── App.tsx                 # 主入口与关卡路由
│   └── index.css               # 全局样式与连线发光特效
│
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## 🚀 6. 本地部署与运行 (Quick Start)

确保已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

**Bash**

```
# 1. 克隆仓库
git clone [https://github.com/your-username/syntax-complete.git](https://github.com/your-username/syntax-complete.git)
cd syntax-complete

# 2. 安装依赖
npm install

# 3. 启动本地开发服务器
npm run dev

# 4. 构建生产环境打包
npm run build
```

打开终端提示的地址（默认 `http://localhost:5173`），即可开始体验。

*Built with React, TypeScript, React Flow & Tailwind CSS · MIT Licensed*

**`if (tree.isWellFormed()) lamp.glow();`**
