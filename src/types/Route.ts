export interface Node {
  id: number
  x: number
  y: number
  label: string // Now required for alphabetical labels
}

export interface Route {
  id: number
  startNodeId: number
  endNodeId: number
  distance: number
  points: Array<{ x: number; y: number }> // For curved paths
}

export interface OptimizedPath {
  nodeOrder: number[]
  totalDistance: number
  routeSegments: Route[]
}
