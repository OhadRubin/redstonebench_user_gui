import React, { useState } from 'react';
import { useRedstoneBench } from './hooks/useRedstoneBench';
import NewCommandCenter from './components/Manager/NewCommandCenter';
import UnitSelection from './components/Manager/UnitSelection';
import { BotStatus } from './components/Manager/WorkerDashboard';
import BlueprintViewer from './components/Manager/BlueprintViewer';
import TaskProgressPanel from './components/Manager/TaskProgressPanel';
import BotCanvas from './components/Manager/BotCanvas';
import Minimap from './components/Manager/Minimap';
import './App.css';

// Top Bar Component - Task Progress and Connection Status
const TopBar = ({ taskStats, connectionStatus }: { taskStats: any, connectionStatus: string }) => {
  const calculateElapsedTime = (): number => {
    if (!taskStats.startTime) return 0;
    const endTime = taskStats.endTime || Date.now();
    return Math.floor((endTime - taskStats.startTime) / 1000);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #1a1a1a 0%, #111 100%)',
      color: '#fff',
      padding: '8px 16px',
      borderBottom: '2px solid #00ffff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: "'Courier New', monospace",
      flexShrink: 0 // Prevent top bar from shrinking
    }}>
      {/* Left side - Task metrics */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#00ffff', fontSize: '12px' }}>⏱️</span>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{formatTime(calculateElapsedTime())}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#00ff44', fontSize: '12px' }}>🔧</span>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{taskStats.completedBlocks}/{taskStats.totalBlocks}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffaa44', fontSize: '12px' }}>👥</span>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{taskStats.workerCount} Bots</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: taskStats.isRunning ? '#00ff44' : '#888', fontSize: '12px' }}>
            {taskStats.isRunning ? '▶️' : '⏸️'}
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '12px', color: taskStats.isRunning ? '#00ff44' : '#888' }}>
            {taskStats.isRunning ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Center - Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ffff' }}>
          🏗️ RedstoneBench Human Calibration Interface
        </div>
        <div style={{ fontSize: '10px', color: '#888' }}>
          Multi-Agent Minecraft Construction Manager
        </div>
      </div>

      {/* Right side - Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: connectionStatus === 'connected' ? '#00ff44' : 
                     connectionStatus === 'connecting' ? '#ffaa44' : '#ff4444'
        }} />
        <span style={{
          fontSize: '11px',
          color: connectionStatus === 'connected' ? '#00ff44' : 
                 connectionStatus === 'connecting' ? '#ffaa44' : '#ff4444'
        }}>
          {connectionStatus === 'connected' ? 'Connected' :
           connectionStatus === 'connecting' ? 'Connecting...' : 
           'Offline'}
        </span>
      </div>
    </div>
  );
};

// Bottom Panel Container interfaces (same for both wrapper and main panel)
interface BottomPanelProps {
  bots: BotStatus[];
  availableBots: string[];
  events: any[];
  taskStats: any;
  actions: any;
  selectedBot: BotStatus | null;
  onBotSelect: (bot: BotStatus | null) => void;
  viewport: { x: number; y: number; zoom: number };
  mainCanvasDimensions: { width: number; height: number };
  onMinimapClick: (worldX: number, worldY: number) => void;
  selectedCommand: string;
  onCommandChange: (command: string) => void;
  moveTarget: { x: number; y: number; z: number } | null;
  onMoveTargetChange: (target: { x: number; y: number; z: number } | null) => void;
}

interface MainBottomPanelProps extends BottomPanelProps {}

// Selected Bot Last Log Display is now integrated into NewCommandCenter component

const MainBottomPanel: React.FC<MainBottomPanelProps> = ({ bots, availableBots, events, taskStats, actions, selectedBot, onBotSelect, viewport, mainCanvasDimensions, onMinimapClick, selectedCommand, onCommandChange, moveTarget, onMoveTargetChange }) => {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, #111 0%, #000 100%)',
      padding: '16px',
      borderTop: '2px solid #00ffff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      height: '450px',
      flexShrink: 0, // Critical: prevents bottom panel from shrinking
      minHeight: '450px' // Ensures minimum height is maintained
    }}>
      {/* Left - Unit Selection (Compact) */}
      <div style={{ 
        flexShrink: 0
      }}>
        <UnitSelection
          bots={bots}
          selectedBot={selectedBot}
          onBotSelect={onBotSelect}
        />
      </div>

      {/* Center - New Command Center (Wide, includes unit info + commands + options) */}
      <div style={{ 
        flex: 1,
        minWidth: '800px',
        maxWidth: '1200px',
        margin: '0 16px'
      }}>
        <NewCommandCenter
          selectedBot={selectedBot}
          availableBots={availableBots}
          onCommandSent={actions.sendCommand}
          selectedCommand={selectedCommand}
          onCommandChange={onCommandChange}
          moveTarget={moveTarget}
          onMoveTargetChange={onMoveTargetChange}
        />
      </div>

      {/* Right - Minimap (Right Aligned) */}
      <div style={{ 
        width: '320px', 
        flexShrink: 0,
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        <Minimap
          bots={bots}
          selectedBot={selectedBot}
          viewport={viewport}
          mainCanvasDimensions={mainCanvasDimensions}
          onMinimapClick={onMinimapClick}
        />
        {/* Keep a compact version of event log below minimap */}
        {/* <div style={{
          flex: 1,
          background: 'linear-gradient(to bottom, #111 0%, #000 100%)',
          border: '2px solid #00ffff',
          borderRadius: '8px',
          padding: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            color: '#00ffff',
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: "'Courier New', monospace"
          }}>
            📋 Recent Events
          </div>
          <div style={{
            maxHeight: '60px',
            overflow: 'auto',
            fontSize: '9px',
            color: '#aaa',
            fontFamily: "'Courier New', monospace"
          }}>
            {events.slice(-3).map((event: any, index: number) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}: {event.message}
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
};

// New BottomPanel Wrapper - contains MainBottomPanel + LastLogDisplay
const BottomPanel: React.FC<BottomPanelProps> = (props) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      minHeight: '350px'
    }}>
      {/* Top: Existing main panel */}
      <MainBottomPanel {...props} />
      
      {/* Bottom: Selected bot log display moved to NewCommandCenter */}
    </div>
  );
};

function App() {
  const { 
    bots, 
    events, 
    taskStats, 
    completedBlocks, 
    connectionStatus,
    actions 
  } = useRedstoneBench('ws://localhost:8080');

  const [selectedBot, setSelectedBot] = useState<BotStatus | null>(null);

  // Handle bot selection with auto-centering (RTS standard behavior)
  const handleBotSelection = (bot: BotStatus | null) => {
    setSelectedBot(bot);
    
    // Auto-center viewport on selected bot (standard RTS behavior)
    if (bot) {
      // Use the same coordinate scaling as BotCanvas (factor of 5)
      const worldX = bot.position.x * 5;
      const worldZ = bot.position.y * 5; // bot.position.y contains the original z coordinate
      
      setViewport(prev => ({
        ...prev,
        x: worldX,
        y: worldZ
      }));
    }
  };
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [mainCanvasDimensions, setMainCanvasDimensions] = useState({ width: 800, height: 600 });

  // Click-to-move state
  const [selectedCommand, setSelectedCommand] = useState<string>('gather');
  const [moveTarget, setMoveTarget] = useState<{ x: number; y: number; z: number } | null>(null);

  const availableBots = bots.map(bot => bot.id);

  const handleViewportChange = (newViewport: { x: number; y: number; zoom: number; width: number; height: number }) => {
    setViewport(prev => (
      prev.x !== newViewport.x || prev.y !== newViewport.y || prev.zoom !== newViewport.zoom
        ? { x: newViewport.x, y: newViewport.y, zoom: newViewport.zoom }
        : prev
    ));
    setMainCanvasDimensions(prev => (
      prev.width !== newViewport.width || prev.height !== newViewport.height
        ? { width: newViewport.width, height: newViewport.height }
        : prev
    ));
  };

  const handleMinimapClick = (worldX: number, worldY: number) => {
    setViewport(prev => ({
      ...prev,
      x: worldX,
      y: worldY
    }));
  };

  const handleCanvasClick = (worldX: number, worldY: number) => {
    if (selectedCommand === 'move_to') {
      // Convert world coordinates to game coordinates (divide by 5)
      const gameX = Math.round(worldX / 5);
      const gameZ = Math.round(worldY / 5);
      setMoveTarget({ x: gameX, y: 64, z: gameZ });
    }
  };

  // Debug logs (commented out to reduce console spam)
  // console.log('App.tsx - Debug Info:', {
  //   connectionStatus,
  //   botsCount: bots.length,
  //   bots: bots,
  //   selectedBot,
  //   taskStats
  // });

  return (
    <div style={{
      height: 'var(--app-100vh, 100vh)',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      color: '#fff',
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden'
    }}>
      {/* Top Bar - Task Progress/Stats */}
      <TopBar taskStats={taskStats} connectionStatus={connectionStatus} />
      
      {/* Main Central Area - Bot Canvas (Battlefield) */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        background: `
          radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%),
          linear-gradient(45deg, transparent 30%, rgba(0,255,255,0.05) 50%, transparent 70%)
        `,
        padding: '16px',
        minHeight: 0, // Critical: allows flex item to shrink below content size
        overflow: 'hidden' // Prevents content from expanding beyond container
      }}>
        <BotCanvas
          bots={bots}
          selectedBot={selectedBot}
          onBotSelect={handleBotSelection}
          viewport={viewport}
          onViewportChange={handleViewportChange}
          selectedCommand={selectedCommand}
          moveTarget={moveTarget}
          onCanvasClick={handleCanvasClick}
        />
        
        {/* Control buttons overlay */}
        <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsBlueprintOpen(true)}
            style={{
              background: 'rgba(0, 255, 255, 0.2)',
              color: '#00ffff',
              border: '1px solid #00ffff',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)'}
          >
            📐 View Blueprint
          </button>
        </div>
        
        {/* Task Progress Panel overlay */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <TaskProgressPanel
            stats={taskStats}
            onStartTask={actions.startTask}
            onStopTask={actions.stopTask}
            onResetTask={actions.resetTask}
            onRunFunctionalTest={actions.runFunctionalTest}
          />
        </div>
      </div>

      {/* Bottom Panel - Unit Selection, Command Center, Minimap */}
      <BottomPanel 
        bots={bots}
        availableBots={availableBots}
        events={events}
        taskStats={taskStats}
        actions={actions}
        selectedBot={selectedBot}
        onBotSelect={handleBotSelection}
        viewport={viewport}
        mainCanvasDimensions={mainCanvasDimensions}
        onMinimapClick={handleMinimapClick}
        selectedCommand={selectedCommand}
        onCommandChange={setSelectedCommand}
        moveTarget={moveTarget}
        onMoveTargetChange={setMoveTarget}
      />

      {/* Contextual Blueprint Viewer */}
      <BlueprintViewer
        completedBlocks={completedBlocks}
        onRegionSelect={actions.selectBlueprintRegion}
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
      />
    </div>
  );
}

export default App;
