import React from 'react';
import { useRedstoneBench } from './hooks/useRedstoneBench';
import CommandCenter from './components/Manager/CommandCenter';
import WorkerDashboard from './components/Manager/WorkerDashboard';
import EventLog from './components/Manager/EventLog';
import BlueprintViewer from './components/Manager/BlueprintViewer';
import TaskProgressPanel from './components/Manager/TaskProgressPanel';
import './App.css';

function App() {
  const { 
    bots, 
    events, 
    taskStats, 
    completedBlocks, 
    connectionStatus,
    actions 
  } = useRedstoneBench('ws://localhost:8080');

  const availableBots = bots.map(bot => bot.id);

  return (
    <div style={{ 
      margin: 0, 
      padding: 0, 
      background: '#0d1117', 
      color: '#fff', 
      fontFamily: "'Courier New', monospace", 
      overflow: 'hidden',
      height: '100vh',
      width: '100vw',
      position: 'relative'
    }}>
      {/* RedstoneBench Manager Interface */}
      <CommandCenter
        availableBots={availableBots}
        onCommandSent={actions.sendCommand}
      />
      
      <WorkerDashboard
        bots={bots}
        onQueryBot={actions.queryBot}
      />
      
      <BlueprintViewer
        completedBlocks={completedBlocks}
        onRegionSelect={actions.selectBlueprintRegion}
      />
      
      <TaskProgressPanel
        stats={taskStats}
        onStartTask={actions.startTask}
        onStopTask={actions.stopTask}
        onResetTask={actions.resetTask}
        onRunFunctionalTest={actions.runFunctionalTest}
      />
      
      <EventLog
        events={events}
        onClearLog={actions.clearEventLog}
      />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '0 0 8px 8px',
        textAlign: 'center',
        zIndex: 1000
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '20px',
          color: '#00ffff',
          fontWeight: 'bold'
        }}>
          🏗️ RedstoneBench Human Calibration Interface
        </h1>
        <p style={{ 
          margin: '5px 0 0 0', 
          fontSize: '12px',
          color: '#888'
        }}>
          Multi-Agent Minecraft Construction Manager • Sugar Cane Farm Build Task
        </p>
        <div style={{
          fontSize: '10px',
          marginTop: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? '#00ff44' : 
                       connectionStatus === 'connecting' ? '#ffaa44' : '#ff4444'
          }} />
          <span style={{
            color: connectionStatus === 'connected' ? '#00ff44' : 
                   connectionStatus === 'connecting' ? '#ffaa44' : '#ff4444'
          }}>
            {connectionStatus === 'connected' ? 'Connected to RedstoneBench Server' :
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Disconnected (Using Test Data)'}
          </span>
        </div>
      </div>

      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%),
          linear-gradient(45deg, transparent 30%, rgba(0,255,255,0.05) 50%, transparent 70%)
        `,
        zIndex: -1
      }} />
    </div>
  );
}

export default App;
