# RedstoneBench Human Calibration Interface

A React-based management interface for coordinating multiple Minecraft construction bots in RedstoneBench experiments. This interface allows human managers to issue commands, monitor worker status, and measure parallelization efficiency in multi-agent construction tasks.

## Features

- 🤖 **Multi-Bot Management**: Command and monitor up to 5 worker bots simultaneously
- 🗺️ **Visual Battlefield Map**: Interactive canvas displaying real-time bot positions with click-to-select functionality
- 🎮 **Command Center**: Issue high-level commands (gather, craft, move, build) to individual bots
- 📊 **Real-time Monitoring**: Track bot positions, inventories, current jobs, and utilization metrics
- 📋 **Event Logging**: Stream of bot communications (START, PROGRESS, COMPLETE, FAILED, BLOCKED)
- 📐 **Blueprint Visualization**: Modal-based sugar cane farm construction plans with completion tracking
- ⏱️ **Performance Metrics**: Task timing, completion rates, and parallelization efficiency displayed in top bar
- 🔌 **WebSocket Integration**: Real-time communication with RedstoneBench server (fallback to demo mode)
- 🎯 **Research-Ready**: Designed for human calibration experiments in multi-agent coordination
- 🎨 **Modern UI Layout**: Three-panel layout with top status bar, central battlefield map, and bottom control panels

## Architecture

This interface implements a **hierarchical agent architecture** where:
- **Manager (Human)**: Issues strategic commands through the UI
- **Worker Bots (Automated)**: Execute tactical operations in Minecraft
- **WebSocket Server**: Coordinates communication between interface and game

### Key Components

- **`App`**: Main application with three-tier layout: TopBar (metrics), central BotCanvas (battlefield), and BottomPanel (controls)
- **`BotCanvas`**: Interactive battlefield map displaying real-time bot positions with visual status indicators and click-to-select functionality
- **`TopBar`**: Status bar showing elapsed time, task progress, bot count, and connection status with real-time updates
- **`BottomPanel`**: Horizontal control panel housing WorkerDashboard, CommandCenter, and EventLog
- **`CommandCenter`**: Forms for issuing bot commands with parameter validation (now panel-free design)
- **`WorkerDashboard`**: Real-time status cards for each bot showing position, inventory, and activity (now panel-free design)
- **`EventLog`**: Chronological stream of all bot events and system messages (now panel-free design)
- **`BlueprintViewer`**: Modal-based visualization of construction plans with completion tracking
- **`TaskProgressPanel`**: Overlay widget with timer, progress tracking, and task control buttons
- **`useRedstoneBench`**: WebSocket client hook managing server communication and test data fallback

## Visual Battlefield Map

The new **BotCanvas** component provides a real-time, interactive visual representation of the construction site:

### Features
- **Real-time Positioning**: Bots are displayed as colored circles on a grid-based canvas that updates in real-time
- **Status Indicators**: Bot colors reflect their current status:
  - 🔵 **Blue**: Active/working bots
  - 🟢 **Green**: Completed tasks
  - 🟡 **Yellow**: Blocked/waiting bots
  - 🔴 **Red**: Failed/error state
- **Interactive Selection**: Click any bot to select it and view detailed information in the worker dashboard
- **Visual Feedback**: Selected bots display a golden selection ring
- **Coordinate System**: World coordinates are mapped to canvas space with grid overlay for spatial reference
- **Legend**: Color-coded legend explains bot status meanings
- **Scalable View**: Automatically scales to fit bots within the battlefield boundaries

### UI Layout
The interface now uses a modern three-tier layout:
- **Top Bar**: Real-time metrics (elapsed time, progress, bot count, connection status)
- **Central Canvas**: Large battlefield map showing bot positions and activities
- **Bottom Panel**: Three control sections side-by-side (Worker Dashboard, Command Center, Event Log)

This design provides better spatial awareness and makes it easier to coordinate multiple bots across large construction areas.

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
