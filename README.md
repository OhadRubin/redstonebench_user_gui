# RedstoneBench Human Calibration Interface

A React-based management interface for coordinating multiple Minecraft construction bots in RedstoneBench experiments. This interface allows human managers to issue commands, monitor worker status, and measure parallelization efficiency in multi-agent construction tasks.

## Features

- 🤖 **Multi-Bot Management**: Command and monitor up to 5 worker bots simultaneously
- 🎮 **Command Center**: Issue high-level commands (gather, craft, move, build) to individual bots
- 📊 **Real-time Monitoring**: Track bot positions, inventories, current jobs, and utilization metrics
- 📋 **Event Logging**: Stream of bot communications (START, PROGRESS, COMPLETE, FAILED, BLOCKED)
- 📐 **Blueprint Visualization**: ASCII-based sugar cane farm construction plans with completion tracking
- ⏱️ **Performance Metrics**: Task timing, completion rates, and parallelization efficiency (PE) calculations
- 🔌 **WebSocket Integration**: Real-time communication with RedstoneBench server (fallback to demo mode)
- 🎯 **Research-Ready**: Designed for human calibration experiments in multi-agent coordination

## Architecture

This interface implements a **hierarchical agent architecture** where:
- **Manager (Human)**: Issues strategic commands through the UI
- **Worker Bots (Automated)**: Execute tactical operations in Minecraft
- **WebSocket Server**: Coordinates communication between interface and game

### Key Components

- **`CommandCenter`**: Forms for issuing bot commands with parameter validation
- **`WorkerDashboard`**: Real-time status cards for each bot showing position, inventory, and activity
- **`EventLog`**: Chronological stream of all bot events and system messages
- **`BlueprintViewer`**: Interactive ASCII visualization of construction plans with completion tracking
- **`TaskProgressPanel`**: Timer, progress tracking, and parallelization efficiency metrics
- **`useRedstoneBench`**: WebSocket client hook managing server communication and test data fallback

## Quick Start

### Option 1: Web Interface + Mock Server

1. **Setup tools** (first time):
   ```bash
   npm run setup-tools
   ```

2. **Start the mock RedstoneBench server**:
   ```bash
   npm run server
   ```

3. **Start the web interface**:
   ```bash
   npm start
   ```
   
   The web interface will be available at http://localhost:3000

### Option 2: CLI Interface

1. **Start the mock server** (in one terminal):
   ```bash  
   npm run server
   ```

2. **Start the CLI interface** (in another terminal):
   ```bash
   npm run cli
   ```

### Option 3: Deploy to GitHub Pages

1. First-time setup:
   ```bash
   npm run init-and-deploy
   ```
   You'll be prompted to enter a repository name, or you can provide one directly:
   ```bash
   npm run init-and-deploy -- --repo-name="dynamic-voxel-visualizer"
   ```

2. For subsequent updates, simply run:
   ```bash
   npm run auto-deploy
   ```

Your app will be available at the URL provided in the console output.

## Mock Server & CLI Client Architecture

This project includes two additional tools for development and testing:

### 🤖 Mock RedstoneBench Server (`/server/mock-redstonebench-server.js`)

A complete WebSocket server that simulates the RedstoneBench backend environment:

**Purpose**: Provides a realistic testing environment without requiring the actual Minecraft RedstoneBench setup.

**Key Features**:
- **Bot Simulation**: Creates 3 virtual worker bots with realistic behavior patterns
- **WebSocket Protocol**: Implements the full RedstoneBench communication protocol
- **Command Processing**: Handles all manager commands (gather, craft, move_to, place_blueprint, query_status)
- **Event Streaming**: Simulates bot events with realistic delays and success/failure rates (90% success)
- **Task Management**: Supports start/stop/reset task operations with progress tracking
- **Admin Interface**: Built-in CLI for server administration and testing

**Realistic Simulation**:
- Commands have 2-5 second execution delays
- Bots update inventory, position, and status based on commands
- Random events and utilization metrics
- Block completion simulation during active tasks

### 🖥️ CLI Client (`/cli/redstonebench-cli.js`)

A terminal-based interface that provides the same functionality as the web UI:

**Purpose**: Allows command-line interaction with the RedstoneBench system, ideal for automation, scripting, and headless operation.

**Key Features**:
- **Interactive Shell**: Full-featured command prompt with history and help
- **Real-time Dashboard**: Auto-refreshing bot status display
- **Complete Command Set**: All web UI commands available via CLI
- **WebSocket Integration**: Connects to the same server as the web interface
- **Event Monitoring**: Real-time event stream with timestamps and emoji indicators

**Usage Scenarios**:
- **Development**: Test server functionality without web interface
- **Automation**: Script bot commands for batch operations
- **Monitoring**: Watch bot status in terminal environments
- **Research**: Collect data through CLI for analysis

### 🔄 How They Work Together

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    Simulates     ┌─────────────────┐
│   Web Interface │◄────────────────►│   Mock Server   │◄─────────────────►│ RedstoneBench   │
└─────────────────┘                  └─────────────────┘                   │   Backend       │
                                              ▲                            └─────────────────┘
                                              │ WebSocket
                                              ▼
                                     ┌─────────────────┐
                                     │   CLI Client    │
                                     └─────────────────┘
```

**Development Workflow**:
1. Start mock server: `npm run server`
2. Use web interface: `npm start` → http://localhost:3000
3. Use CLI client: `npm run cli` (in separate terminal)
4. Both interfaces connect to the same server instance
5. Commands from either interface appear in server logs
6. All clients see the same bot events and status updates

This setup allows complete testing of the RedstoneBench human calibration interface without requiring Minecraft or the actual backend infrastructure.

## CLI Interface

The CLI provides the same functionality as the web interface but in a terminal environment:

```bash
npm run cli
```

### Available Commands:

- **Bot Management**: `bots`, `dashboard`, `query <bot_id>`
- **Bot Commands**: `gather`, `craft`, `move`, `build`  
- **Task Control**: `start-task`, `stop-task`, `reset-task`, `test-function`
- **Information**: `status`, `events`, `watch`, `help`

### Example CLI Session:

```bash
🎮 redstone> dashboard              # Show bot status
🎮 redstone> gather 1 minecraft:oak_log 64 forest
🎮 redstone> craft 2 minecraft:crafting_table 1  
🎮 redstone> move 3 10 64 20
🎮 redstone> build 1 layer_y1
🎮 redstone> start-task            # Begin construction
🎮 redstone> watch                 # Auto-refresh dashboard
```

## Mock Server

The mock server simulates the RedstoneBench backend for testing:

```bash
npm run server
```

### Server Features:

- **WebSocket API**: Compatible with the RedstoneBench protocol
- **Bot Simulation**: 3 default bots with realistic behavior  
- **Command Processing**: Handles all manager commands with delays
- **Event Streaming**: Sends bot status updates and events
- **Admin CLI**: Built-in commands for server management

### Server Commands:

- `status`, `bots`, `clients` - Show server state
- `add-bot [id]`, `remove-bot [id]` - Manage bots
- `start`, `stop` - Control task simulation
- `simulate-event [type] [bot_id]` - Generate test events

## Development

- Start the development server:
  ```
  npm start
  ```
- Build for production:
  ```
  npm run build
  ```
- Deploy changes to GitHub Pages:
  ```
  npm run deploy
  ```

## Customization

- Modify the components in the `src` directory
- Customize Tailwind CSS in `tailwind.config.js`
- Update the page title and metadata in `public/index.html`

## Troubleshooting

If the initialization fails:

- Make sure GitHub CLI is installed: `gh --version`
- Make sure you're logged in to GitHub: `gh auth status`
- Check error messages in the console output

## License


`src/App.test.tsx`
   - `test('renders learn react link', () => { ... })` (line 5-9) - A test case that renders the App component and asserts that an element with the text "learn react" is present in the document.

  `src/App.tsx`
   - `App()` (line 10-77) - The main application component that manages the overall state and layout.
     - `useState(false)` (line 12) - Initializes state for enabling or disabling culling.
     - `useState(1000)` (line 13) - Initializes state for the culling distance.
     - `useState({ following: true, userControlled: false })` (line 16) - Initializes state for camera settings, including following and user control status.
     - `useState<CameraControls | null>(null)` (line 17) - Initializes state for the camera controls object.
     - `useVoxelStream('ws://localhost:8080')` (line 19-27) - A custom hook that handles the WebSocket connection and voxel data stream.
     - `return (...)` (line 29-76) - Renders the main application layout, including the VoxelCanvas, StatusPanel, and ControlsPanel.

  `src/components/ActionButtons/index.tsx`
   - `ActionButtons: React.FC<ActionButtonsProps> = ({ ... }) => { ... }` (line 11-51) - A functional component that renders action buttons for clearing voxels, pausing/resuming the stream, and centering the camera.

  `src/components/UI/ControlsPanel/index.tsx`
   - `ControlsPanel: React.FC = () => { ... }` (line 4-40) - A functional component that displays a panel with camera and debug controls information.

  `src/components/UI/Panel.tsx`
   - `Panel: React.FC<PanelProps> = ({ ... }) => { ... }` (line 17-111) - A reusable panel component with options for title, minimizability, and positioning.
     - `useState(defaultMinimized)` (line 32) - Initializes state for whether the panel is minimized.

  `src/components/UI/StatusPanel/ColorLegend.tsx`
   - `ColorLegend: React.FC = () => { ... }` (line 11-53) - A functional component that displays a color legend for different voxel states.

  `src/components/UI/StatusPanel/StatItem.tsx`
   - `StatItem: React.FC<StatItemProps> = ({ label, value, className = '' }) => { ... }` (line 8-21) - A simple component for displaying a labeled statistic.

  `src/components/UI/StatusPanel/index.tsx`
   - `StatusPanel: React.FC<StatusPanelProps> = ({ ... }) => { ... }` (line 25-282) - A component that displays a status panel with statistics, culling controls, camera controls, and action buttons.
     - `getConnectionStatusDisplay()` (line 40-63) - A helper function to generate the display for the WebSocket connection status.
     - `getBoundsDisplay()` (line 65-78) - A helper function to format and display the bounding box of the voxels.

  `src/components/VoxelCanvas/index.tsx`
   - `VoxelCanvas: React.FC<VoxelCanvasProps> = ({ ... }) => { ... }` (line 23-141) - A component that wraps the Three.js canvas and manages the ThreeManager.
     - `useRef<HTMLCanvasElement>(null)` (line 32) - A ref for the canvas element.
     - `useRef<ThreeManager | null>(null)` (line 33) - A ref for the ThreeManager instance.
     - `useEffect(() => { ... }, [])` (line 35-46) - An effect to initialize and dispose of the ThreeManager.
     - `useEffect(() => { ... }, [voxels])` (line 48-53) - An effect to update the voxels in the ThreeManager when the voxels prop changes.
     - `useEffect(() => { ... }, [centerRequest, bounds])` (line 55-60) - An effect to center the camera when a center request is made.
     - `useEffect(() => { ... }, [cullingEnabled])` (line 62-67) - An effect to update the culling enabled state in the ThreeManager.
     - `useEffect(() => { ... }, [cullingDistance])` (line 69-74) - An effect to update the culling distance in the ThreeManager.
     - `useEffect(() => { ... }, [onCameraSettingsChange])` (line 76-86) - An effect to monitor and report camera settings changes.
     - `useEffect(() => { ... }, [onCameraControlsReady])` (line 103-107) - An effect to notify the parent component when camera controls are ready.

  `src/components/VoxelCanvas/three-manager.ts`
   - `class ThreeManager` (line 25-1025) - A class that encapsulates all Three.js logic for rendering the voxel scene.
     - `constructor(canvas: HTMLCanvasElement)` (line 57-101) - Initializes the scene, camera, renderer, controls, and other necessary components.
     - `createPointGeometry(): THREE.BufferGeometry` (line 103-110) - Creates a buffer geometry for rendering points.
     - `getChunkCoords(x: number, y: number, z: number): [number, number, number]` (line 112-118) - Calculates the chunk coordinates for a given world position.
     - `getChunkKey(chunkX: number, chunkY: number, chunkZ: number): string` (line 120-122) - Generates a unique key for a chunk.
     - `getLocalCoords(x: number, y: number, z: number): [number, number, number]` (line 124-130) - Calculates the local coordinates within a chunk.
     - `getOrCreateChunk([chunkX, chunkY, chunkZ]: [number, number, number]): VoxelChunk` (line 132-184) - Retrieves an existing chunk or creates a new one if it doesn't exist.
     - `getAvailableInstanceIndex(chunk: VoxelChunk, state: VoxelState, lodLevel: LODLevel): number` (line 186-199) - Gets an available instance index from a chunk's pool.
     - `releaseInstanceIndex(chunk: VoxelChunk, state: VoxelState, lodLevel: LODLevel, index: number): void` (line 201-228) - Releases an instance index back to the pool for reuse.
     - `setInstanceTransform(chunk: VoxelChunk, state: VoxelState, lodLevel: LODLevel, index: number, x: number, y: number, z: number): void` (line 230-257) - Sets the transform (position) of a voxel instance.
     - `setCullingEnabled(enabled: boolean): void` (line 259-261) - Enables or disables distance-based culling.
     - `setCullingDistance(distance: number): void` (line 263-265) - Sets the culling distance.
     - `getCullingSettings(): { enabled: boolean; distance: number }` (line 267-272) - Gets the current culling settings.
     - `getCameraSettings(): { following: boolean; userControlled: boolean }` (line 274-279) - Gets the current camera settings.
     - `setCameraFollowing(enabled: boolean): void` (line 281-286) - Enables or disables camera following.
     - `resetCameraToDefault(): void` (line 288-303) - Resets the camera to its default position and orientation.
     - `detectUserCameraControl(): void` (line 305-317) - Detects if the user is manually controlling the camera.
     - `requestRender(): void` (line 343-345) - Requests a new render frame.
     - `calculateLODLevel(voxelData: VoxelData): LODLevel` (line 347-363) - Calculates the appropriate level of detail (LOD) for a voxel based on its distance from the camera.
     - `shouldCullVoxel(voxelData: VoxelData): boolean` (line 365-367) - Determines if a voxel should be culled (not rendered).
     - `getTotalVoxelCount(): number` (line 369-375) - Gets the total number of voxels currently in the scene.
     - `performPeriodicCleanup(): void` (line 377-418) - Periodically removes distant voxels to manage memory and performance.
     - `enforceVoxelLimit(): void` (line 420-465) - Enforces a maximum voxel limit by removing the farthest voxels.
     - `logPerformance(): void` (line 467-481) - Logs performance metrics to the console.
     - `addToQueue(key: string, voxelData: VoxelData | null): void` (line 483-503) - Adds a voxel update to the processing queue.
     - `processBatchedVoxelUpdates(): void` (line 505-555) - Processes voxel updates in batches to avoid blocking the main thread.
     - `processVoxelUpdate(key: string, voxelData: VoxelData | null): void` (line 557-627) - Processes a single voxel update, either adding, updating, or removing a voxel.
     - `updateChunkVisibility(): void` (line 629-684) - Updates the visibility of chunks based on culling settings.
     - `cleanupEmptyChunks(): void` (line 686-706) - Removes empty chunks from the scene to free up resources.
     - `initializeScene(): void` (line 708-743) - Initializes the Three.js scene, including lighting, helpers, and other objects.
     - `setupControls(): void` (line 745-775) - Sets up the OrbitControls for camera manipulation.
     - `handleDoubleClick = (event: MouseEvent) => { ... }` (line 777-805) - Handles double-click events to focus the camera on a specific voxel.
     - `startRenderLoop(): void` (line 807-884) - Starts the main render loop.
     - `updateVoxels(voxelsMap: Map<string, VoxelData>): void` (line 886-933) - Updates the scene with new voxel data.
     - `centerCamera(bounds: { ... }): void` (line 935-974) - Centers the camera on the bounding box of all voxels.
     - `onWindowResize(): void` (line 976-981) - Handles window resize events to update the camera and renderer.
     - `dispose(): void` (line 983-1024) - Cleans up all Three.js objects and event listeners when the component is unmounted.

  `src/hooks/useVoxelStream.ts`
   - `useVoxelStream(websocketUrl: string)` (line 25-324) - A custom hook that manages the WebSocket connection, voxel data, and related statistics.
     - `useState<Map<string, VoxelData>>(new Map())` (line 26) - Initializes state for the map of voxels.
     - `useState<Stats>({ ... })` (line 27-37) - Initializes state for the statistics object.
     - `useState(false)` (line 38) - Initializes state for the paused status of the stream.
     - `useState(0)` (line 39) - Initializes state for the camera center request.
     - `useRef<WebSocket | null>(null)` (line 41) - A ref for the WebSocket instance.
     - `useRef<Set<string>>(new Set())` (line 42) - A ref for the set of unique voxel positions.
     - `useRef<number[]>([])` (line 43) - A ref to store timestamps of recent voxels for rate calculation.
     - `useRef(0)` (line 44) - A ref for the total voxel count.
     - `useRef<NodeJS.Timeout | null>(null)` (line 45) - A ref for the reconnect timeout ID.
     - `useRef<{ x: number; y: number; z: number } | null>(null)` (line 46) - A ref for the origin offset.
     - `connectWebSocket = useCallback(() => { ... }, [websocketUrl, isPaused])` (line 48-163) - A memoized function to establish and manage the WebSocket connection.
     - `useEffect(() => { ... }, [connectWebSocket])` (line 166-279) - An effect to initialize the WebSocket connection and set up test data if the connection fails.
     - `useEffect(() => { ... }, [])` (line 282-294) - An effect to set up an interval for calculating the voxel rate.
     - `clearAllVoxels = useCallback(() => { ... }, [])` (line 296-313) - A memoized function to clear all voxel data.
     - `togglePause = useCallback(() => { ... }, [])` (line 315-317) - A memoized function to toggle the paused state of the stream.
     - `centerCamera = useCallback(() => { ... }, [])` (line 319-321) - A memoized function to request a camera centering.

  `src/index.tsx`
   - `ReactDOM.createRoot(...)` (line 6-9) - Creates the root React DOM node.
   - `root.render(...)` (line 10-14) - Renders the main App component into the root DOM node.
   - `reportWebVitals()` (line 18) - A function to report web vitals for performance monitoring.

  `src/react-app-env.d.ts`
   - `/// <reference types="react-scripts" />` (line 1) - A reference to the TypeScript types for react-scripts.

  `src/reportWebVitals.ts`
   - `reportWebVitals = (onPerfEntry?: ReportHandler) => { ... }` (line 3-13) - A function that sets up the web-vitals library to report performance metrics.

  `src/setupTests.ts`
   - `import '@testing-library/jest-dom';` (line 5) - Imports the jest-dom library to add custom Jest matchers for asserting on DOM nodes.