import React, { useState } from 'react';
import { useRedstoneBench } from './hooks/useRedstoneBench';
import CommandCenter from './components/Manager/CommandCenter';
import WorkerDashboard, { BotStatus } from './components/Manager/WorkerDashboard';
import EventLog from './components/Manager/EventLog';
import BlueprintViewer from './components/Manager/BlueprintViewer';
import TaskProgressPanel from './components/Manager/TaskProgressPanel';
import BotCanvas from './components/Manager/BotCanvas';
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
      fontFamily: "'Courier New', monospace"
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

// Bottom Panel Container
const BottomPanel = ({ bots, availableBots, events, taskStats, actions, selectedBot }: any) => {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, #111 0%, #000 100%)',
      padding: '16px',
      borderTop: '2px solid #00ffff',
      display: 'flex',
      gap: '16px',
      height: '300px'
    }}>
      {/* Left - Worker Dashboard (Unit Info equivalent) */}
      <div style={{ width: '320px' }}>
        <WorkerDashboard
          bots={bots}
          onQueryBot={actions.queryBot}
          selectedBot={selectedBot}
        />
      </div>

      {/* Center - Command Center */}
      <div style={{ flex: 1, maxWidth: '400px' }}>
        <CommandCenter
          availableBots={availableBots}
          onCommandSent={actions.sendCommand}
        />
      </div>

      {/* Right - Event Log (Minimap equivalent) */}
      <div style={{ width: '320px' }}>
        <EventLog
          events={events}
          onClearLog={actions.clearEventLog}
        />
      </div>
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
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);

  const availableBots = bots.map(bot => bot.id);

  // Debug logs
  console.log('App.tsx - Debug Info:', {
    connectionStatus,
    botsCount: bots.length,
    bots: bots,
    selectedBot,
    taskStats
  });

  return (
    <div style={{
      height: '100vh',
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
        padding: '16px'
      }}>
        <BotCanvas
          bots={bots}
          selectedBot={selectedBot}
          onBotSelect={setSelectedBot}
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

      {/* Bottom Panel - Worker Dashboard, Commands, Event Log */}
      <BottomPanel 
        bots={bots}
        availableBots={availableBots}
        events={events}
        taskStats={taskStats}
        actions={actions}
        selectedBot={selectedBot}
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
