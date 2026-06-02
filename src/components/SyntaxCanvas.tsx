import { useCallback, useMemo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WordNode from './nodes/WordNode'
import GateNode from './nodes/GateNode'
import type { SyntaxNode, SyntaxEdge } from '../types/game'

/** Initial demo nodes: two words at the bottom, one phrase gate floating above. */
const INITIAL_NODES: SyntaxNode[] = [
  {
    id: 'w-the',
    type: 'wordNode',
    position: { x: 200, y: 400 },
    data: { word: 'The', pos: 'Det' },
  },
  {
    id: 'w-robot',
    type: 'wordNode',
    position: { x: 420, y: 400 },
    data: { word: 'robot', pos: 'N' },
  },
  {
    id: 'g-np',
    type: 'gateNode',
    position: { x: 300, y: 200 },
    data: { label: 'NP-Gate', kind: 'NP' },
  },
]

const INITIAL_EDGES: SyntaxEdge[] = []

export default function SyntaxCanvas() {
  // Custom node renderers — memoised so ReactFlow doesn't warn about identity changes.
  const nodeTypes = useMemo<NodeTypes>(
    () => ({ wordNode: WordNode, gateNode: GateNode }),
    [],
  )

  const [nodes, , onNodesChange] = useNodesState<SyntaxNode>(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState<SyntaxEdge>(INITIAL_EDGES)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#22d3ee', strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  )

  return (
    <div className="w-full h-full bg-circuit-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#22d3ee', strokeWidth: 2 },
        }}
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
          nodeColor={(n) => (n.type === 'gateNode' ? '#a855f7' : '#22d3ee')}
          maskColor="rgba(10, 15, 26, 0.6)"
        />
      </ReactFlow>
    </div>
  )
}
