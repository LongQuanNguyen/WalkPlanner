# WalkPlanner

A web application for optimizing walking routes on custom maps. Upload any map image, draw your routes, and find the most efficient path to cover all areas using advanced graph algorithms.


## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Drawing**: HTML5 Canvas API
- **Algorithms**: Custom edge-coverage optimization (Chinese Postman Problem)
- **Build Tool**: Vite with hot reload

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Modern web browser with Canvas support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd WalkPlanner
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## How to Use

1. **Upload a Map**: Click the upload area and select an image of your walking area
2. **Draw Routes**: 
   - Click to place nodes (labeled a, b, c...)
   - Click between nodes to create routes
   - Click on routes to split them with new nodes
3. **Optimize Path**: Click "Find Minimum Distance Path" to calculate the optimal route
4. **View Results**: See the optimized path highlighted in green with traversal numbers
5. **Export**: Save your completed map with the "Export Map" button

## Algorithm Details

The app implements a solution to the **Chinese Postman Problem** for edge coverage:

- **Objective**: Find the shortest closed walk that visits every edge at least once
- **Method**: Exhaustive search for smaller graphs (≤8 routes), smart sampling for larger ones
- **Optimization**: Tests multiple starting points and edge traversal orders
- **Performance**: Limited to 12 routes to ensure reasonable computation time
- **Strategies**: Shortest-first, longest-first, and random sampling approaches

## License

This project is open source and available under the [MIT License](LICENSE).
