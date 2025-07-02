import { useState } from 'react'
import ImageUploader from './components/ImageUploader'
import CanvasDrawer from './components/CanvasDrawer'
import RouteOptimizer from './components/RouteOptimizer'
import type { Route, Node } from './types/Route'

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [optimizedPath, setOptimizedPath] = useState<number[]>([])
  const [showOptimizationResult, setShowOptimizationResult] = useState(false)

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    // Reset routes and nodes when new image is uploaded
    setRoutes([])
    setNodes([])
    setOptimizedPath([])
    setShowOptimizationResult(false)
  }

  const handleRoutesUpdate = (newRoutes: Route[], newNodes: Node[]) => {
    setRoutes(newRoutes)
    setNodes(newNodes)
    // Clear optimization when routes/nodes change
    if (optimizedPath.length > 0) {
      setOptimizedPath([])
      setShowOptimizationResult(false)
    }
  }

  const handleOptimization = (path: number[]) => {
    setOptimizedPath(path)
    setShowOptimizationResult(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">WalkPlanner</h1>
            <p className="text-gray-600">Optimize your walking routes</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Map</h2>
              <ImageUploader onImageUpload={handleImageUpload} />
              
              {uploadedImage && (
                <>
                  <div className="mt-6 pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4">Route Info</h2>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Nodes: {nodes.length}</p>
                      <p>Routes: {routes.length}</p>
                      {showOptimizationResult && optimizedPath.length > 0 && (
                        <p className="text-green-600 font-medium">
                          Optimized path found!
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <RouteOptimizer 
                      routes={routes} 
                      nodes={nodes} 
                      onOptimize={handleOptimization}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {uploadedImage ? (
                <CanvasDrawer 
                  imageUrl={uploadedImage}
                  onRoutesUpdate={handleRoutesUpdate}
                  optimizedPath={optimizedPath}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  Upload an image to start planning your route
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
