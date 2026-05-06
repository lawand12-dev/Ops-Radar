'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'

import type {
  GraphEdge as CatalogEdge,
  GraphNode as CatalogNode,
  GraphNodeKind,
  WorkflowGraph as CatalogGraph,
} from '<npm>/lib/workflows-catalog'

const NODE_W = 220
const NODE_H = 72
const RANK_SEP = 90
const NODE_SEP = 40

const KIND_STYLE: Record<GraphNodeKind, { icon: string; color: string; bg: string }> = {
  trigger:  { icon: '⚡', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  http:     { icon: '🌐', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  set:      { icon: '✎',  color: '#a3e635', bg: 'rgba(163,230,53,0.10)' },
  code:     { icon: '⌘',  color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  if:       { icon: '◆',  color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  switch:   { icon: '⊟',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  slack:    { icon: '💬', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  postgres: { icon: '⊞',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  gmail:    { icon: '✉',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  loop:     { icon: '↻',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  approval: { icon: '⏸',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  merge:    { icon: '⊕',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
}

type WorkflowNodeData = {
  label: string
  kind: GraphNodeKind
  hint?: string
}

function WorkflowNode({ data }: NodeProps<Node<WorkflowNodeData>>) {
  const { label, kind, hint } = data
  const style = KIND_STYLE[kind]
  return (
    <div
      className="rounded-xl border bg-[#0F1729]/95 backdrop-blur-sm px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      style={{
        width: NODE_W,
        borderColor: `${style.color}55`,
        boxShadow: `0 0 18px ${style.color}18, 0 4px 20px rgba(0,0,0,0.35)`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#475569', border: 'none', width: 6, height: 6 }} />
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base border"
          style={{ background: style.bg, borderColor: `${style.color}40`, color: style.color }}
        >
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-white leading-tight truncate" style={{ color: style.color }}>
            {label}
          </p>
          {hint && (
            <p className="text-[10.5px] text-white/40 leading-tight truncate mt-0.5">
              {hint}
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#475569', border: 'none', width: 6, height: 6 }} />
    </div>
  )
}

const NODE_TYPES = { workflow: WorkflowNode }

function layoutGraph(
  catalogNodes: CatalogNode[],
  catalogEdges: CatalogEdge[]
): { nodes: Node<WorkflowNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: RANK_SEP, nodesep: NODE_SEP })
  for (const n of catalogNodes) g.setNode(n.id, { width: NODE_W, height: NODE_H })
  for (const e of catalogEdges) g.setEdge(e.source, e.target)
  dagre.layout(g)
  const nodes: Node<WorkflowNodeData>[] = catalogNodes.map((n) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: 'workflow',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: n.label, kind: n.kind, hint: n.hint },
    }
  })
  const edges: Edge[] = catalogEdges.map((e, i) => ({
    id: `e${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: 'rgba(96,165,250,0.55)', strokeWidth: 1.5 },
    labelStyle: { fill: '#cbd5f5', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: 'rgba(15,23,41,0.9)' },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  }))
  return { nodes, edges }
}

interface WorkflowGraphProps {
  graph: CatalogGraph
  className?: string
  height?: number
}

function WorkflowGraphInner({ graph, className = '', height = 600 }: WorkflowGraphProps) {
  const { nodes, edges } = useMemo(() => layoutGraph(graph.nodes, graph.edges), [graph])
  return (
    <div className={`w-full rounded-xl ${className}`} style={{ height, background: 'rgba(8,12,24,0.4)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag
        zoomOnPinch
        zoomOnDoubleClick
        minZoom={0.25}
        maxZoom={2.0}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(96,165,250,0.18)" />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="![&>button]:bg-[#0F1729] ![&>button]:border-white/15 ![&>button]:text-white/70"
        />
      </ReactFlow>
    </div>
  )
}

export default function WorkflowGraph(props: WorkflowGraphProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphInner {...props} />
    </ReactFlowProvider>
  )
}
