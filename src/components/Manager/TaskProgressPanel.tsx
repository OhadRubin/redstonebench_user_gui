import React from 'react';
import Panel from '../UI/Panel';

interface TaskStats {
  startTime: number | null;
  endTime: number | null;
  isRunning: boolean;
  totalBlocks: number;
  completedBlocks: number;
  structuralComplete: boolean;
  functionalComplete: boolean;
  workerCount: number;
  baselineTime: number | null; // Single worker baseline time for PE calculation
}

interface TaskProgressPanelProps {
  stats: TaskStats;
  onStartTask: () => void;
  onStopTask: () => void;
  onResetTask: () => void;
  onRunFunctionalTest: () => void;
}

const TaskProgressPanel: React.FC<TaskProgressPanelProps> = ({ 
  stats, 
  onStartTask, 
  onStopTask, 
  onResetTask,
  onRunFunctionalTest
}) => {
  const calculateElapsedTime = (): number => {
    if (!stats.startTime) return 0;
    const endTime = stats.endTime || Date.now();
    return Math.floor((endTime - stats.startTime) / 1000);
  };

  const calculateParallelizationEfficiency = (): number | null => {
    if (!stats.baselineTime || !stats.endTime || !stats.startTime || stats.workerCount <= 1) {
      return null;
    }
    const currentTime = (stats.endTime - stats.startTime) / 1000;
    return (stats.baselineTime / (stats.workerCount * currentTime)) * 100;
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
    if (!stats.isRunning && stats.functionalComplete) {
      return { status: 'COMPLETE', color: '#00ff44' };
    } else if (!stats.isRunning && stats.structuralComplete) {
      return { status: 'STRUCTURAL COMPLETE', color: '#ffaa44' };
    } else if (stats.isRunning) {
      return { status: 'IN PROGRESS', color: '#00aaff' };
    } else {
      return { status: 'NOT STARTED', color: '#888' };
    }
  };

  const elapsedTime = calculateElapsedTime();
  const completionPercentage = stats.totalBlocks > 0 ? (stats.completedBlocks / stats.totalBlocks * 100) : 0;
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

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: stats.isRunning ? '#ff4444' : '#00aa00'
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
    color: stats.isRunning ? '#00ffff' : '#888',
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
            {stats.completedBlocks} / {stats.totalBlocks}
          </span>
        </div>

        <div style={statsRowStyle}>
          <span style={{ color: '#aaa' }}>Workers:</span>
          <span style={{ color: '#fff' }}>{stats.workerCount}</span>
        </div>

        <div style={metricsGridStyle}>
          <div style={metricStyle}>
            <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '2px' }}>
              Structural
            </div>
            <div style={{ 
              color: stats.structuralComplete ? '#00ff44' : '#ff4444',
              fontWeight: 'bold'
            }}>
              {stats.structuralComplete ? '✓ PASS' : '✗ PENDING'}
            </div>
          </div>

          <div style={metricStyle}>
            <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '2px' }}>
              Functional
            </div>
            <div style={{ 
              color: stats.functionalComplete ? '#00ff44' : '#ff4444',
              fontWeight: 'bold'
            }}>
              {stats.functionalComplete ? '✓ PASS' : '✗ PENDING'}
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <button 
            style={primaryButtonStyle}
            onClick={stats.isRunning ? onStopTask : onStartTask}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = stats.isRunning ? '#ff6666' : '#00cc00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = stats.isRunning ? '#ff4444' : '#00aa00';
            }}
          >
            {stats.isRunning ? 'Stop Task' : 'Start Task'}
          </button>

          <button 
            style={buttonStyle}
            onClick={onResetTask}
            onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
          >
            Reset
          </button>

          <button 
            style={{
              ...buttonStyle,
              background: stats.structuralComplete ? '#aa6600' : '#444'
            }}
            onClick={onRunFunctionalTest}
            disabled={!stats.structuralComplete}
            onMouseEnter={(e) => {
              if (!stats.structuralComplete) return;
              e.currentTarget.style.background = '#cc8800';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = stats.structuralComplete ? '#aa6600' : '#444';
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
          RedstoneBench Human Calibration Interface
        </div>
      </div>
    </Panel>
  );
};

export default TaskProgressPanel;