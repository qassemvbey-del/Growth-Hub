'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import TaskCardNode from './TaskCardNode'
import ChecklistCardNode from './ChecklistCardNode'
import NoteCardNode from './NoteCardNode'
import ListCardNode from './ListCardNode'

interface TaskBoardCanvasProps {
  tasks: any[]
  goalId: string
  themeColor: string
  isRTL: boolean
  onUpdateTask: (taskId: string, updates: any) => Promise<void> | void
  onToggleTask?: (taskId: string, currentStatus?: boolean) => Promise<void> | void
  onOpenDrawer: (task: any) => void
}

export default function TaskBoardCanvas({
  tasks,
  goalId,
  themeColor,
  isRTL,
  onUpdateTask,
  onToggleTask,
  onOpenDrawer
}: TaskBoardCanvasProps) {
  const nodeTypes = useMemo(() => ({
    taskCard: TaskCardNode,
    checklistCard: ChecklistCardNode,
    noteCard: NoteCardNode,
    listCard: ListCardNode
  }), [])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Helper to read current layout from localStorage
  const getSavedLayout = useCallback(() => {
    if (typeof window === 'undefined' || !goalId) return { nodes: [], edges: [] }
    try {
      const raw = localStorage.getItem(`board_layout_${goalId}`)
      if (raw) return JSON.parse(raw)
    } catch (e) {}
    return { nodes: [], edges: [] }
  }, [goalId])

  // Save current nodes and edges to localStorage
  const saveLayout = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (typeof window === 'undefined' || !goalId) return
    const serializableNodes = currentNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        cardId: n.data?.cardId,
        sourceTaskId: n.data?.sourceTaskId
      }
    }))
    const serializableEdges = currentEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated,
      style: e.style
    }))

    localStorage.setItem(`board_layout_${goalId}`, JSON.stringify({
      nodes: serializableNodes,
      edges: serializableEdges
    }))
  }, [goalId])

  // Save on node drag stop
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    setNodes((currentNodes: Node[]) => {
      setEdges((currentEdges: Edge[]) => {
        saveLayout(currentNodes, currentEdges)
        return currentEdges
      })
      return currentNodes
    })
  }, [saveLayout, setNodes, setEdges])

  // Callback to insert a new connected card next to a source Task Card
  const handleInsertCard = useCallback((sourceTaskId: string, cardType: 'checklist' | 'note' | 'list') => {
    setNodes((prevNodes: Node[]) => {
      const sourceNode = prevNodes.find((n) => n.id === sourceTaskId || n.id === `task_${sourceTaskId}`)
      const sourceX = sourceNode?.position.x ?? 100
      const sourceY = sourceNode?.position.y ?? 100

      const existingConnected = prevNodes.filter((n) => n.data?.sourceTaskId === sourceTaskId)
      const yOffset = existingConnected.length * 170

      const newCardId = `card_${cardType}_${sourceTaskId}_${Date.now()}`
      const targetTask = tasks.find(t => t.id === sourceTaskId)

      const newNode: Node = {
        id: newCardId,
        type: `${cardType}Card`,
        position: { x: sourceX + 340, y: sourceY + yOffset },
        data: {
          task: targetTask,
          cardId: newCardId,
          sourceTaskId,
          themeColor,
          isRTL,
          onUpdateTask,
          onDeleteCard: (idToDelete: string) => {
            setNodes((nds: Node[]) => {
              const updatedNodes = nds.filter((n) => n.id !== idToDelete)
              setEdges((eds: Edge[]) => {
                const updatedEdges = eds.filter((e) => e.source !== idToDelete && e.target !== idToDelete)
                saveLayout(updatedNodes, updatedEdges)
                return updatedEdges
              })
              return updatedNodes
            })
          }
        }
      }

      const newEdge: Edge = {
        id: `edge_${sourceTaskId}_${newCardId}`,
        source: sourceNode ? sourceNode.id : sourceTaskId,
        target: newCardId,
        animated: true,
        style: { stroke: themeColor || '#10B981', strokeWidth: 2 }
      }

      setEdges((prevEdges: Edge[]) => {
        const updatedEdges = addEdge(newEdge, prevEdges)
        saveLayout([...prevNodes, newNode], updatedEdges)
        return updatedEdges
      })

      return [...prevNodes, newNode]
    })
  }, [tasks, themeColor, isRTL, onUpdateTask, setNodes, setEdges, saveLayout])

  // Sync tasks & layout persistence on mount / update
  useEffect(() => {
    if (!tasks || tasks.length === 0) return

    const savedLayout = getSavedLayout()
    const layoutNodesMap = new Map<string, any>((savedLayout?.nodes || []).map((n: any) => [n.id, n]))
    const taskMap = new Map(tasks.map(t => [t.id, t]))

    setNodes((existingNodes: Node[]) => {
      const updatedNodes: Node[] = []

      // 1. Task Card nodes
      tasks.forEach((task, index) => {
        const taskId = task.id
        const nodeNodeId = `task_${taskId}`
        const existingInState = existingNodes.find(n => n.id === nodeNodeId || n.id === taskId)
        const savedNode = layoutNodesMap.get(nodeNodeId) || layoutNodesMap.get(taskId)

        const cols = 3
        const col = index % cols
        const row = Math.floor(index / cols)
        const defaultPos = { x: col * 360 + 50, y: row * 260 + 50 }

        const position = existingInState?.position || (savedNode as any)?.position || defaultPos

        updatedNodes.push({
          id: nodeNodeId,
          type: 'taskCard',
          position,
          data: {
            task,
            themeColor,
            isRTL,
            onInsertCard: handleInsertCard,
            onOpenDrawer,
            onToggleTask
          }
        })
      })

      // 2. Connected cards (Checklist, Note, List cards)
      const savedConnected = (savedLayout?.nodes || []).filter((n: any) => n.type !== 'taskCard')
      const stateConnected = existingNodes.filter(n => n.type !== 'taskCard')
      
      const allConnectedMap = new Map()
      savedConnected.forEach((n: any) => allConnectedMap.set(n.id, n))
      stateConnected.forEach((n: any) => allConnectedMap.set(n.id, { ...allConnectedMap.get(n.id), position: n.position, data: n.data }))

      allConnectedMap.forEach((savedCard: any) => {
        const cardId = savedCard.id
        const existingInState = existingNodes.find(n => n.id === cardId)
        const sourceTaskId = savedCard.data?.sourceTaskId || existingInState?.data?.sourceTaskId
        const targetTask = sourceTaskId ? taskMap.get(sourceTaskId) : (savedCard.data?.task || existingInState?.data?.task)

        if (targetTask) {
          updatedNodes.push({
            id: cardId,
            type: savedCard.type || existingInState?.type,
            position: existingInState?.position || savedCard.position || { x: 400, y: 100 },
            data: {
              task: targetTask,
              cardId,
              sourceTaskId,
              themeColor,
              isRTL,
              onUpdateTask,
              onDeleteCard: (idToDelete: string) => {
                setNodes((nds: Node[]) => {
                  const updatedNodes = nds.filter((n) => n.id !== idToDelete)
                  setEdges((eds: Edge[]) => {
                    const updatedEdges = eds.filter((e) => e.source !== idToDelete && e.target !== idToDelete)
                    saveLayout(updatedNodes, updatedEdges)
                    return updatedEdges
                  })
                  return updatedNodes
                })
              }
            }
          })
        }
      })

      return updatedNodes
    })

    // Restore / preserve edges
    setEdges((existingEdges: Edge[]) => {
      if (savedLayout && savedLayout.edges && savedLayout.edges.length > 0) {
        return savedLayout.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: themeColor || '#10B981', strokeWidth: 2 }
        }))
      }
      return existingEdges
    })
  }, [tasks, goalId, themeColor, isRTL, handleInsertCard, onOpenDrawer, onToggleTask, onUpdateTask, setNodes, setEdges, saveLayout, getSavedLayout])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => {
      const updated = addEdge({ ...params, animated: true, style: { stroke: themeColor || '#10B981', strokeWidth: 2 } }, eds)
      saveLayout(nodes, updated)
      return updated
    }),
    [nodes, themeColor, setEdges, saveLayout]
  )

  return (
    <div 
      className="relative w-full bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      style={{ height: '650px', minHeight: '650px', width: '100%' }}
    >
      {/* Infinite Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ animated: true }}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
        style={{ width: '100%', height: '100%' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.08)" />
        <Controls className="!bg-zinc-900/90 !border-white/10 !rounded-xl !shadow-xl text-white fill-white" />
      </ReactFlow>
    </div>
  )
}
