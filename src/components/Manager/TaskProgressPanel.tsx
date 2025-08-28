import React, { useState, useCallback, useEffect } from 'react';
import Panel from '../UI/Panel';
import { useRedstoneBench } from '../../hooks/useRedstoneBench';

// Contract-compliant bot job progress interface
interface BotJobProgress {
  botId: string | number;
  progress_percent: number;
  current_location: [number, number, number];
  message: string;
  status: 'IDLE' | 'BUSY';
  jobType?: string;
}

// Contract error codes as per specification
type ContractErrorCode = 'BOT_BUSY' | 'INVALID_PARAMETERS' | 'BOT_NOT_FOUND' | 'INTERNAL_ERROR';

interface TaskProgressPanelProps {
  // Remove static props - now using useRedstoneBench hook for all data
}

const TaskProgressPanel: React.FC<TaskProgressPanelProps> = () => {
  // WebSocket integration via useRedstoneBench hook
  const { bots, taskStats, events, connectionStatus, actions } = useRedstoneBench();
  const { sendCommand, queryBot, cancelJob, resetTask, runFunctionalTest } = actions;

  // State for bot job progress tracking (contract-compliant)
  const [botJobProgress, setBotJobProgress] = useState<Map<string | number, BotJobProgress>>(new Map());
  const [selectedBotForCommand, setSelectedBotForCommand] = useState<string | number | null>(null);
  const [commandTarget, setCommandTarget] = useState<{ x: number; y: number; z: number }>({ x: 100, y: 64, z: 200 });
  const [lastError, setLastError] = useState<{ code: ContractErrorCode; message: string } | null>(null);
  // WebSocket event processing for contract-compliant job progress
  useEffect(() => {
    // Process recent events for job progress updates
    const recentEvents = events.slice(-10); // Process last 10 events
    
    recentEvents.forEach(event => {
      if (event.type === 'job_progress' && event.details) {
        const { bot_id, result } = event.details;
        if (result && typeof result.progress_percent === 'number') {
          const botProgress: BotJobProgress = {
            botId: bot_id,
            progress_percent: result.progress_percent,
            current_location: result.current_location || [0, 64, 0],
            message: result.message || 'Working...',
            status: 'BUSY'
          };
          
          setBotJobProgress(prev => new Map(prev.set(bot_id, botProgress)));
        }
      } else if (event.type === 'job_complete' || event.type === 'job_failed') {
        // Clear progress when job completes/fails
        const botId = event.botId;
        setBotJobProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(botId);
          return newMap;
        });
      } else if (event.type === 'command_response' && event.status === 'rejected') {
        // Handle contract error codes
        setLastError({
          code: event.error.code as ContractErrorCode,
          message: event.error.message
        });
        setTimeout(() => setLastError(null), 5000); // Clear error after 5 seconds
      }
    });
  }, [events]);

  const calculateElapsedTime = (): number => {
    if (!taskStats.startTime) return 0;
    const endTime = taskStats.endTime || Date.now();
    return Math.floor((endTime - taskStats.startTime) / 1000);
  };

  const calculateParallelizationEfficiency = (): number | null => {
    if (!taskStats.baselineTime || !taskStats.endTime || !taskStats.startTime || taskStats.workerCount <= 1) {
      return null;
    }
    const currentTime = (taskStats.endTime - taskStats.startTime) / 1000;
    return (taskStats.baselineTime / (taskStats.workerCount * currentTime)) * 100;
  };

  // Calculate aggregated progress across all bots
  const calculateAggregatedProgress = (): number => {
    if (bots.length === 0) return 0;
    
    // Use individual bot progress if available, otherwise use overall task progress
    let totalProgress = 0;
    let activeBots = 0;
    
    bots.forEach(bot => {
      const botId = bot.index ?? bot.id;
      const progress = botJobProgress.get(botId);
      if (progress) {
        totalProgress += progress.progress_percent;
        activeBots++;
      } else if (bot.status === 'IDLE' && taskStats.isRunning) {
        // Count idle bots as 0% during active tasks
        activeBots++;
      }
    });
    
    if (activeBots > 0) {
      return totalProgress / activeBots;
    }
    
    // Fallback to task stats completion percentage
    return taskStats.totalBlocks > 0 ? (taskStats.completedBlocks / taskStats.totalBlocks * 100) : 0;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTaskStatus = (): { status: string; color: string } => {
    if (connectionStatus === 'disconnected') {
      return { status: 'DISCONNECTED', color: '#ff4444' };
    }
    if (connectionStatus === 'connecting') {
      return { status: 'CONNECTING', color: '#ffaa44' };
    }
    
    const activeBots = bots.filter(bot => bot.status === 'BUSY').length;
    
    if (!taskStats.isRunning && taskStats.functionalComplete) {
      return { status: 'COMPLETE', color: '#00ff44' };
    } else if (!taskStats.isRunning && taskStats.structuralComplete) {
      return { status: 'STRUCTURAL COMPLETE', color: '#ffaa44' };
    } else if (taskStats.isRunning || activeBots > 0) {
      return { status: `IN PROGRESS (${activeBots}/${bots.length} active)`, color: '#00aaff' };
    } else {
      return { status: 'READY', color: '#888' };
    }
  };
  
  // Contract-compliant command sending
  const handleSendMoveCommand = useCallback(() => {
    if (!selectedBotForCommand) {
      setLastError({ code: 'BOT_NOT_FOUND', message: 'Please select a bot first' });
      return;
    }
    
    sendCommand({
      command: 'move_to',
      bot_id: selectedBotForCommand,
      x: commandTarget.x,
      y: commandTarget.y,
      z: commandTarget.z
    });
  }, [selectedBotForCommand, commandTarget, sendCommand]);
  
  const handleGetBotStatus = useCallback(() => {
    if (!selectedBotForCommand) {
      setLastError({ code: 'BOT_NOT_FOUND', message: 'Please select a bot first' });
      return;
    }
    queryBot(selectedBotForCommand);
  }, [selectedBotForCommand, queryBot]);
  
  const handleCancelJob = useCallback(() => {
    if (!selectedBotForCommand) {
      setLastError({ code: 'BOT_NOT_FOUND', message: 'Please select a bot first' });
      return;
    }
    cancelJob(selectedBotForCommand);
  }, [selectedBotForCommand, cancelJob]);

  const elapsedTime = calculateElapsedTime();
  const completionPercentage = calculateAggregatedProgress();
  const parallelizationEfficiency = calculateParallelizationEfficiency();
  const taskStatus = getTaskStatus();

  const buttonStyle: React.CSSProperties = {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    margin: '2px'
  };


  const statsRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '12px',
    background: '#333',
    borderRadius: '6px',
    marginBottom: '10px',
    overflow: 'hidden',
    border: '1px solid #555'
  };

  const progressFillStyle: React.CSSProperties = {
    width: `${completionPercentage}%`,
    height: '100%',
    background: completionPercentage === 100 ? '#00ff44' : 
                completionPercentage > 75 ? '#88ff44' :
                completionPercentage > 50 ? '#ffaa44' : 
                completionPercentage > 25 ? '#ff8844' : '#ff4444',
    transition: 'width 0.3s ease',
    position: 'relative'
  };

  const statusBadgeStyle: React.CSSProperties = {
    background: taskStatus.color,
    color: taskStatus.status === 'STRUCTURAL COMPLETE' ? '#000' : '#fff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold'
  };

  const timerStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: taskStats.isRunning ? '#00ffff' : '#888',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: '10px'
  };

  const metricsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '15px',
    padding: '8px',
    background: '#0a0a0a',
    borderRadius: '4px'
  };

  const metricStyle: React.CSSProperties = {
    textAlign: 'center'
  };

  return (
    <Panel 
      title="⏱️ Task Progress" 
      bottom="20px" 
      left="20px" 
      minWidth="280px"
      isMinimizable={true}
    >
      <div style={{ fontSize: '12px' }}>
        <div style={statsRowStyle}>
          <span style={{ fontWeight: 'bold', color: '#00ffff' }}>Status:</span>
          <span style={statusBadgeStyle}>{taskStatus.status}</span>
        </div>

        <div style={timerStyle}>
          {formatTime(elapsedTime)}
        </div>

        <div style={progressBarStyle}>
          <div style={progressFillStyle}>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: '9px',
              lineHeight: '12px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              {completionPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={statsRowStyle}>
          <span style={{ color: '#aaa' }}>Blocks:</span>
          <span style={{ color: '#fff' }}>
            {taskStats.completedBlocks} / {taskStats.totalBlocks}
          </span>
        </div>

        <div style={statsRowStyle}>
          <span style={{ color: '#aaa' }}>Workers:</span>
          <span style={{ color: '#fff' }}>{taskStats.workerCount}</span>
        </div>
        
        <div style={statsRowStyle}>
          <span style={{ color: '#aaa' }}>Connection:</span>
          <span style={{ 
            color: connectionStatus === 'connected' ? '#00ff44' : 
                   connectionStatus === 'connecting' ? '#ffaa44' : '#ff4444' 
          }}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>

        <div style={metricsGridStyle}>
          <div style={metricStyle}>
            <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '2px' }}>
              Structural
            </div>
            <div style={{ 
              color: taskStats.structuralComplete ? '#00ff44' : '#ff4444',
              fontWeight: 'bold'
            }}>
              {taskStats.structuralComplete ? '✓ PASS' : '✗ PENDING'}
            </div>
          </div>

          <div style={metricStyle}>
            <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '2px' }}>
              Functional
            </div>
            <div style={{ 
              color: taskStats.functionalComplete ? '#00ff44' : '#ff4444',
              fontWeight: 'bold'
            }}>
              {taskStats.functionalComplete ? '✓ PASS' : '✗ PENDING'}
            </div>
          </div>
        </div>

        {parallelizationEfficiency !== null && (
          <div style={{ 
            marginBottom: '15px',
            padding: '8px',
            background: '#001122',
            borderRadius: '4px',
            border: '1px solid #0066aa'
          }}>
            <div style={{ color: '#00aaff', fontSize: '10px', marginBottom: '4px' }}>
              Parallelization Efficiency (PE):
            </div>
            <div style={{ 
              fontSize: '16px',
              fontWeight: 'bold',
              color: parallelizationEfficiency > 80 ? '#00ff44' : 
                     parallelizationEfficiency > 60 ? '#ffaa44' : '#ff4444'
            }}>
              {parallelizationEfficiency.toFixed(1)}%
            </div>
            <div style={{ color: '#888', fontSize: '9px', marginTop: '2px' }}>
              PE = T₁/(n × Tₙ) × 100
            </div>
          </div>
        )}

        {/* Error display for contract errors */}
        {lastError && (
          <div style={{
            marginBottom: '10px',
            padding: '8px',
            background: '#330000',
            border: '1px solid #ff4444',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#ff8888'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Error: {lastError.code}</div>
            <div>{lastError.message}</div>
          </div>
        )}
        
        {/* Individual bot progress display */}
        {botJobProgress.size > 0 && (
          <div style={{
            marginBottom: '15px',
            padding: '8px',
            background: '#001122',
            borderRadius: '4px',
            border: '1px solid #0066aa'
          }}>
            <div style={{ color: '#00aaff', fontSize: '10px', marginBottom: '6px' }}>
              Individual Bot Progress:
            </div>
            {Array.from(botJobProgress.entries()).map(([botId, progress]) => {
              const bot = bots.find(b => (b.index ?? b.id) === botId);
              const displayName = bot ? bot.id : `Bot ${botId}`;
              return (
                <div key={botId} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>{displayName}:</span>
                    <span style={{ fontSize: '10px', color: '#fff' }}>{progress.progress_percent.toFixed(1)}%</span>
                  </div>
                  <div style={{ fontSize: '9px', color: '#888', marginTop: '1px' }}>
                    {progress.message} at [{progress.current_location.join(', ')}]
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* WebSocket Command Controls */}
        {bots.length > 0 && (
          <div style={{
            marginBottom: '15px',
            padding: '8px',
            background: '#001100',
            borderRadius: '4px',
            border: '1px solid #006600'
          }}>
            <div style={{ color: '#00aa44', fontSize: '10px', marginBottom: '6px' }}>
              WebSocket Commands:
            </div>
            
            {/* Bot Selection */}
            <select
              value={selectedBotForCommand || ''}
              onChange={(e) => setSelectedBotForCommand(e.target.value || null)}
              style={{
                width: '100%',
                marginBottom: '6px',
                padding: '4px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '2px',
                fontSize: '10px'
              }}
            >
              <option value="">Select Bot...</option>
              {bots.map(bot => (
                <option key={bot.id} value={bot.index ?? bot.id}>
                  {bot.id} ({bot.status})
                </option>
              ))}
            </select>
            
            {/* Move Target Inputs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              {['x', 'y', 'z'].map(axis => (
                <input
                  key={axis}
                  type="number"
                  placeholder={axis.toUpperCase()}
                  value={commandTarget[axis as keyof typeof commandTarget]}
                  onChange={(e) => setCommandTarget(prev => ({
                    ...prev,
                    [axis]: parseInt(e.target.value) || 0
                  }))}
                  style={{
                    flex: 1,
                    padding: '4px',
                    background: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '2px',
                    fontSize: '10px'
                  }}
                />
              ))}
            </div>
            
            {/* Command Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                style={{ ...buttonStyle, background: '#006600', fontSize: '10px', padding: '4px 8px' }}
                onClick={handleSendMoveCommand}
                disabled={!selectedBotForCommand}
              >
                Move To
              </button>
              <button
                style={{ ...buttonStyle, background: '#666600', fontSize: '10px', padding: '4px 8px' }}
                onClick={handleGetBotStatus}
                disabled={!selectedBotForCommand}
              >
                Status
              </button>
              <button
                style={{ ...buttonStyle, background: '#660000', fontSize: '10px', padding: '4px 8px' }}
                onClick={handleCancelJob}
                disabled={!selectedBotForCommand}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {/* Start/Stop Task functionality removed for WebSocket contract compliance */}
          {/* Non-contract features like global task management are not supported */}

          <button 
            style={buttonStyle}
            onClick={resetTask}
            onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
          >
            Reset
          </button>

          <button 
            style={{
              ...buttonStyle,
              background: taskStats.structuralComplete ? '#aa6600' : '#444'
            }}
            onClick={runFunctionalTest}
            disabled={!taskStats.structuralComplete}
            onMouseEnter={(e) => {
              if (!taskStats.structuralComplete) return;
              e.currentTarget.style.background = '#cc8800';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = taskStats.structuralComplete ? '#aa6600' : '#444';
            }}
          >
            Test Function
          </button>
        </div>

        <div style={{ 
          marginTop: '10px', 
          fontSize: '10px', 
          color: '#666',
          textAlign: 'center'
        }}>
          RedstoneBench WebSocket-Integrated Interface
        </div>
      </div>
    </Panel>
  );
};

export default TaskProgressPanel;