import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { Route, Node } from '../types/Route'
import { getNodeLabel } from '../utils/labelUtils'

interface CanvasDrawerProps {
  imageUrl: string
  onRoutesUpdate: (routes: Route[], nodes: Node[]) => void
  optimizedPath: number[]
}

const CanvasDrawer: React.FC<CanvasDrawerProps> = ({ 
  imageUrl, 
  onRoutesUpdate, 
  optimizedPath 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [history, setHistory] = useState<Array<{ nodes: Node[]; routes: Route[] }>>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(true)

  // Initialize history with empty state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ nodes: [], routes: [] }])
      setCurrentStep(0)
    }
  }, [history.length])

  // Calculate distance between two points
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  // Find nearest node to a point
  const findNearestNode = (x: number, y: number): Node | null => {
    let nearest: Node | null = null
    let minDistance = 10 // 10px threshold for clicking (close to the 8px visual radius)

    for (const node of nodes) {
      const distance = calculateDistance(x, y, node.x, node.y)
      if (distance < minDistance) {
        minDistance = distance
        nearest = node
      }
    }

    return nearest
  }

  // Check if a position is too close to existing nodes (16px minimum distance to prevent overlap)
  const isTooCloseToExistingNodes = (x: number, y: number): boolean => {
    const minDistance = 16 // 16px minimum distance (matches node diameter)
    
    for (const node of nodes) {
      const distance = calculateDistance(x, y, node.x, node.y)
      if (distance < minDistance) {
        return true
      }
    }
    
    return false
  }

  // Find if a point is near a route line
  const findNearestRoute = (x: number, y: number): { route: Route; insertPoint: { x: number; y: number } } | null => {
    const threshold = 15 // 15px threshold for clicking on a line

    for (const route of routes) {
      const startNode = nodes.find(n => n.id === route.startNodeId)
      const endNode = nodes.find(n => n.id === route.endNodeId)
      
      if (startNode && endNode) {
        // Calculate distance from point to line segment
        const A = x - startNode.x
        const B = y - startNode.y
        const C = endNode.x - startNode.x
        const D = endNode.y - startNode.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1
        if (lenSq !== 0) {
          param = dot / lenSq
        }

        let xx, yy

        if (param < 0) {
          xx = startNode.x
          yy = startNode.y
        } else if (param > 1) {
          xx = endNode.x
          yy = endNode.y
        } else {
          xx = startNode.x + param * C
          yy = startNode.y + param * D
        }

        const dx = x - xx
        const dy = y - yy
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= threshold && param >= 0 && param <= 1) {
          return {
            route,
            insertPoint: { x: xx, y: yy }
          }
        }
      }
    }
    return null
  }

  // Split a route by inserting a new node
  const splitRoute = (routeToSplit: Route, newNode: Node) => {
    const startNode = nodes.find(n => n.id === routeToSplit.startNodeId)!
    const endNode = nodes.find(n => n.id === routeToSplit.endNodeId)!

    // Remove the original route
    const updatedRoutes = routes.filter(r => r.id !== routeToSplit.id)

    // Create two new routes
    const route1: Route = {
      id: Math.max(...routes.map(r => r.id), 0) + 1,
      startNodeId: routeToSplit.startNodeId,
      endNodeId: newNode.id,
      distance: calculateDistance(startNode.x, startNode.y, newNode.x, newNode.y),
      points: [{ x: startNode.x, y: startNode.y }, { x: newNode.x, y: newNode.y }]
    }

    const route2: Route = {
      id: Math.max(...routes.map(r => r.id), 0) + 2,
      startNodeId: newNode.id,
      endNodeId: routeToSplit.endNodeId,
      distance: calculateDistance(newNode.x, newNode.y, endNode.x, endNode.y),
      points: [{ x: newNode.x, y: newNode.y }, { x: endNode.x, y: endNode.y }]
    }

    return [...updatedRoutes, route1, route2]
  }

  // Save current state to history
  const saveToHistory = (newNodes: Node[], newRoutes: Route[]) => {
    const newHistory = history.slice(0, currentStep + 1)
    newHistory.push({ nodes: newNodes, routes: newRoutes })
    setHistory(newHistory)
    setCurrentStep(newHistory.length - 1)
  }

  // Check if a route already exists between two nodes
  const routeExists = (nodeId1: number, nodeId2: number): boolean => {
    return routes.some(route => 
      (route.startNodeId === nodeId1 && route.endNodeId === nodeId2) ||
      (route.startNodeId === nodeId2 && route.endNodeId === nodeId1)
    )
  }

  // Undo last action
  const undo = () => {
    if (currentStep > 0) {
      const previousState = history[currentStep - 1]
      setNodes(previousState.nodes)
      setRoutes(previousState.routes)
      onRoutesUpdate(previousState.routes, previousState.nodes)
      setCurrentStep(currentStep - 1)
      setSelectedNode(null)
    }
  }

  // Export current map as image
  const exportMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a link element to trigger download
    const link = document.createElement('a')
    link.download = `walkplanner-map-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // Draw routes
    routes.forEach((route) => {
      const startNode = nodes.find(n => n.id === route.startNodeId)
      const endNode = nodes.find(n => n.id === route.endNodeId)
      
      if (startNode && endNode) {
        ctx.beginPath()
        ctx.moveTo(startNode.x, startNode.y)
        
        // Draw straight line for now (can be enhanced for curves)
        ctx.lineTo(endNode.x, endNode.y)
        
        // Highlight if part of optimized path
        const isOptimizedRoute = optimizedPath.length > 0 && 
          optimizedPath.some((nodeId, i) => 
            i < optimizedPath.length - 1 && 
            ((nodeId === route.startNodeId && optimizedPath[i + 1] === route.endNodeId) ||
             (nodeId === route.endNodeId && optimizedPath[i + 1] === route.startNodeId))
          )
        
        ctx.strokeStyle = isOptimizedRoute ? '#10b981' : '#6b7280'
        ctx.lineWidth = isOptimizedRoute ? 4 : 2
        ctx.stroke()
      }
    })

    // Draw route labels on top of routes
    routes.forEach((route) => {
      const startNode = nodes.find(n => n.id === route.startNodeId)
      const endNode = nodes.find(n => n.id === route.endNodeId)
      
      if (startNode && endNode) {
        // Check if this route is part of optimized path
        const isOptimizedRoute = optimizedPath.length > 0 && 
          optimizedPath.some((nodeId, i) => 
            i < optimizedPath.length - 1 && 
            ((nodeId === route.startNodeId && optimizedPath[i + 1] === route.endNodeId) ||
             (nodeId === route.endNodeId && optimizedPath[i + 1] === route.startNodeId))
          )

        // Draw route label showing traversal order in optimized path
        if (optimizedPath.length > 0 && isOptimizedRoute) {
          const midX = (startNode.x + endNode.x) / 2
          const midY = (startNode.y + endNode.y) / 2
          
          // Find all times this route is traversed in the optimized path
          const traversalOrders: number[] = []
          for (let i = 0; i < optimizedPath.length - 1; i++) {
            const currentNodeId = optimizedPath[i]
            const nextNodeId = optimizedPath[i + 1]
            
            if ((currentNodeId === route.startNodeId && nextNodeId === route.endNodeId) ||
                (currentNodeId === route.endNodeId && nextNodeId === route.startNodeId)) {
              traversalOrders.push(i + 1)
            }
          }
          
          if (traversalOrders.length > 0) {
            // Format the label based on number of traversals
            let label: string
            if (traversalOrders.length === 1) {
              label = traversalOrders[0].toString()
            } else {
              label = traversalOrders.join('/')
            }
            
            // Calculate text width for background sizing
            ctx.font = 'bold 10px sans-serif'
            const textMetrics = ctx.measureText(label)
            const textWidth = textMetrics.width
            const padding = 4
            const backgroundWidth = Math.max(textWidth + padding * 2, 16)
            const backgroundHeight = 14
            
            // Draw white background rectangle for better visibility
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(
              midX - backgroundWidth / 2, 
              midY - backgroundHeight / 2, 
              backgroundWidth, 
              backgroundHeight
            )
            
            // Draw green border
            ctx.strokeStyle = '#059669'
            ctx.lineWidth = 1
            ctx.strokeRect(
              midX - backgroundWidth / 2, 
              midY - backgroundHeight / 2, 
              backgroundWidth, 
              backgroundHeight
            )
            
            // Draw the text
            ctx.fillStyle = '#059669'
            ctx.font = 'bold 10px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(label, midX, midY + 3)
          }
        }
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath()
      ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI)
      
      // Highlight if part of optimized path
      const isOptimizedNode = optimizedPath.includes(node.id)
      // Highlight if currently selected
      const isSelected = selectedNode === node.id
      
      if (isSelected) {
        ctx.fillStyle = '#f59e0b' // Orange for selected
      } else {
        ctx.fillStyle = isOptimizedNode ? '#10b981' : '#3b82f6'
      }
      ctx.fill()
      
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.stroke()

      // Draw node label
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, node.x, node.y + 4)

      // Draw start indicator for optimized path
      if (optimizedPath.length > 0 && isOptimizedNode && optimizedPath[0] === node.id) {
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Start', node.x + 15, node.y - 10)
      }
    })
  }, [nodes, routes, optimizedPath, selectedNode])

  // Handle canvas click with unified behavior
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't allow drawing if drawing is disabled
    if (!isDrawingEnabled) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Check if clicking on an existing node first
    const clickedNode = findNearestNode(x, y)
    
    if (clickedNode) {
      // Clicked on an existing node
      if (selectedNode === null) {
        // First click: select the node
        setSelectedNode(clickedNode.id)
      } else if (selectedNode === clickedNode.id) {
        // Clicked on the same node: deselect
        setSelectedNode(null)
      } else {
        // Second click on different node: create route if it doesn't exist
        if (!routeExists(selectedNode, clickedNode.id)) {
          const startNode = nodes.find(n => n.id === selectedNode)!
          const newRoute: Route = {
            id: Math.max(...routes.map(r => r.id), 0) + 1,
            startNodeId: selectedNode,
            endNodeId: clickedNode.id,
            distance: calculateDistance(startNode.x, startNode.y, clickedNode.x, clickedNode.y),
            points: [{ x: startNode.x, y: startNode.y }, { x: clickedNode.x, y: clickedNode.y }]
          }
          
          const updatedRoutes = [...routes, newRoute]
          saveToHistory(nodes, updatedRoutes)
          setRoutes(updatedRoutes)
          onRoutesUpdate(updatedRoutes, nodes)
        }
        setSelectedNode(null)
      }
    } else {
      // Check if clicking on a route to split it
      const nearestRoute = findNearestRoute(x, y)
      
      if (nearestRoute) {
        // Split the route by inserting a new node (only if not too close to existing nodes)
        const { route, insertPoint } = nearestRoute
        
        if (!isTooCloseToExistingNodes(insertPoint.x, insertPoint.y)) {
          const newNode: Node = {
            id: Math.max(...nodes.map(n => n.id), 0) + 1,
            x: insertPoint.x,
            y: insertPoint.y,
            label: getNodeLabel(nodes.length)
          }

          const updatedNodes = [...nodes, newNode]
          const updatedRoutes = splitRoute(route, newNode)
          
          saveToHistory(updatedNodes, updatedRoutes)
          setNodes(updatedNodes)
          setRoutes(updatedRoutes)
          onRoutesUpdate(updatedRoutes, updatedNodes)
          
          if (selectedNode === null) {
            // If no node was selected, select the new node
            setSelectedNode(newNode.id)
          } else {
            // If a node was selected, create route to new node if it doesn't exist
            if (!routeExists(selectedNode, newNode.id)) {
              const startNode = nodes.find(n => n.id === selectedNode)!
              const newRoute: Route = {
                id: Math.max(...updatedRoutes.map(r => r.id), 0) + 1,
                startNodeId: selectedNode,
                endNodeId: newNode.id,
                distance: calculateDistance(startNode.x, startNode.y, newNode.x, newNode.y),
                points: [{ x: startNode.x, y: startNode.y }, { x: newNode.x, y: newNode.y }]
              }
              
              const finalRoutes = [...updatedRoutes, newRoute]
              setRoutes(finalRoutes)
              onRoutesUpdate(finalRoutes, updatedNodes)
            }
            setSelectedNode(null)
          }
        }
      } else {
        // Clicked on empty space
        if (selectedNode === null) {
          // First click: create new node (only if not too close to existing nodes)
          if (!isTooCloseToExistingNodes(x, y)) {
            const newNode: Node = {
              id: Math.max(...nodes.map(n => n.id), 0) + 1,
              x,
              y,
              label: getNodeLabel(nodes.length)
            }
            
            const updatedNodes = [...nodes, newNode]
            saveToHistory(updatedNodes, routes)
            setNodes(updatedNodes)
            onRoutesUpdate(routes, updatedNodes)
            setSelectedNode(newNode.id)
          }
        } else {
          // Second click: create new node and route to it (only if not too close to existing nodes)
          if (!isTooCloseToExistingNodes(x, y)) {
            const newNode: Node = {
              id: Math.max(...nodes.map(n => n.id), 0) + 1,
              x,
              y,
              label: getNodeLabel(nodes.length)
            }
            
            const startNode = nodes.find(n => n.id === selectedNode)!
            const newRoute: Route = {
              id: Math.max(...routes.map(r => r.id), 0) + 1,
              startNodeId: selectedNode,
              endNodeId: newNode.id,
              distance: calculateDistance(startNode.x, startNode.y, newNode.x, newNode.y),
              points: [{ x: startNode.x, y: startNode.y }, { x: newNode.x, y: newNode.y }]
            }
            
            const updatedNodes = [...nodes, newNode]
            const updatedRoutes = [...routes, newRoute]
            saveToHistory(updatedNodes, updatedRoutes)
            setNodes(updatedNodes)
            setRoutes(updatedRoutes)
            onRoutesUpdate(updatedRoutes, updatedNodes)
            setSelectedNode(null)
          } else {
            // If too close, just deselect the current node
            setSelectedNode(null)
          }
        }
      }
    }
  }

  // Load image and set canvas size
  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      if (canvasRef.current) {
        canvasRef.current.width = Math.min(600, image.width)
        canvasRef.current.height = (image.height * canvasRef.current.width) / image.width
        draw()
      }
    }
    image.src = imageUrl
  }, [imageUrl, draw])

  // Redraw when nodes/routes change
  useEffect(() => {
    draw()
  }, [draw])

  const clearAll = () => {
    setNodes([])
    setRoutes([])
    setSelectedNode(null)
    setHistory([])
    setCurrentStep(-1)
    setIsDrawingEnabled(true) // Reset to drawing enabled
    onRoutesUpdate([], []) // This will trigger clearing optimization in parent
  }

  const toggleDrawing = () => {
    setIsDrawingEnabled(!isDrawingEnabled)
    // Clear selection when disabling drawing
    if (isDrawingEnabled) {
      setSelectedNode(null)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button
            onClick={toggleDrawing}
            className={`px-4 py-2 rounded font-medium ${
              isDrawingEnabled 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {isDrawingEnabled ? '🖊️ Drawing ON' : '🔒 Drawing OFF'}
          </button>
          <button
            onClick={undo}
            disabled={currentStep <= 0 || !isDrawingEnabled}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={exportMap}
            disabled={nodes.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Export Map
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
        
        <div className="text-sm text-gray-600 max-w-md">
          {!isDrawingEnabled ? (
            <span className="text-gray-500">🔒 Drawing disabled - click "Drawing ON" to edit routes</span>
          ) : selectedNode === null ? (
            <span>Click to place nodes (a, b, c...) or click on routes to split them</span>
          ) : (
            <span>Node <strong>{nodes.find(n => n.id === selectedNode)?.label}</strong> selected. Click another node or empty space to draw a route.</span>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`max-w-full ${isDrawingEnabled ? 'cursor-crosshair' : 'cursor-default'}`}
        />
      </div>
    </div>
  )
}

export default CanvasDrawer
