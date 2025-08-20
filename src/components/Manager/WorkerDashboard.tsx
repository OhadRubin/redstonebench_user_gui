import React from 'react';
import Panel from '../UI/Panel';

export interface BotStatus {
  id: number;
  position: { x: number; y: number; z: number };
  inventory: { [item: string]: number };
  currentJob: string;
  status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'BLOCKED';
  lastActivity: string;
  utilization: number; // percentage
}

interface WorkerDashboardProps {
  bots: BotStatus[];
  onQueryBot: (botId: number) => void;
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ bots, onQueryBot }) => {
  const getStatusColor = (status: BotStatus['status']) => {
    switch (status) {
      case 'IDLE': return '#888';
      case 'IN_PROGRESS': return '#00aaff';
      case 'COMPLETE': return '#00ff44';
      case 'FAILED': return '#ff4444';
      case 'BLOCKED': return '#ffaa44';
      default: return '#888';
    }
  };

  const formatInventory = (inventory: { [item: string]: number }) => {
    const items = Object.entries(inventory);
    if (items.length === 0) return 'Empty';
    
    return items
      .map(([item, count]) => {
        const shortName = item.replace('minecraft:', '');
        return `${shortName}: ${count}`;
      })
      .join(', ');
  };

  const botCardStyle: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '11px'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  };

  const statusBadgeStyle = (status: BotStatus['status']): React.CSSProperties => ({
    background: getStatusColor(status),
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '9px',
    fontWeight: 'bold'
  });

  const queryButtonStyle: React.CSSProperties = {
    background: '#555',
    color: '#fff',
    border: 'none',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '9px',
    cursor: 'pointer'
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontSize: '10px'
  };

  const utilizationBarStyle = (utilization: number): React.CSSProperties => ({
    width: '100%',
    height: '6px',
    background: '#333',
    borderRadius: '3px',
    marginTop: '4px',
    overflow: 'hidden'
  });

  const utilizationFillStyle = (utilization: number): React.CSSProperties => ({
    width: `${utilization}%`,
    height: '100%',
    background: utilization > 80 ? '#00ff44' : utilization > 50 ? '#ffaa44' : '#ff4444',
    transition: 'width 0.3s ease'
  });

  return (
    <Panel 
      title="🤖 Worker Status Dashboard" 
      top="20px" 
      left="340px" 
      minWidth="350px"
      isMinimizable={true}
    >
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {bots.map(bot => (
          <div key={bot.id} style={botCardStyle}>
            <div style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#00ffff' }}>
                  Bot {bot.id}
                </span>
                <span style={statusBadgeStyle(bot.status)}>
                  {bot.status}
                </span>
              </div>
              <button 
                style={queryButtonStyle}
                onClick={() => onQueryBot(bot.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#777'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#555'}
              >
                Query
              </button>
            </div>

            <div style={infoRowStyle}>
              <span style={{ color: '#aaa' }}>Position:</span>
              <span style={{ color: '#fff' }}>
                ({bot.position.x}, {bot.position.y}, {bot.position.z})
              </span>
            </div>

            <div style={infoRowStyle}>
              <span style={{ color: '#aaa' }}>Current Job:</span>
              <span style={{ color: '#fff', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bot.currentJob || 'None'}
              </span>
            </div>

            <div style={infoRowStyle}>
              <span style={{ color: '#aaa' }}>Last Activity:</span>
              <span style={{ color: '#fff' }}>
                {bot.lastActivity}
              </span>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '2px' }}>
                Inventory:
              </div>
              <div style={{ 
                color: '#fff', 
                fontSize: '9px', 
                background: '#2a2a2a', 
                padding: '4px', 
                borderRadius: '3px',
                maxHeight: '40px',
                overflowY: 'auto'
              }}>
                {formatInventory(bot.inventory)}
              </div>
            </div>

            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '2px'
              }}>
                <span style={{ color: '#aaa', fontSize: '9px' }}>Utilization:</span>
                <span style={{ color: '#fff', fontSize: '9px' }}>
                  {bot.utilization.toFixed(1)}%
                </span>
              </div>
              <div style={utilizationBarStyle(bot.utilization)}>
                <div style={utilizationFillStyle(bot.utilization)} />
              </div>
            </div>
          </div>
        ))}

        {bots.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#888', 
            padding: '20px',
            fontSize: '12px'
          }}>
            No bots available. Connect to start managing workers.
          </div>
        )}
      </div>
    </Panel>
  );
};

export default WorkerDashboard;