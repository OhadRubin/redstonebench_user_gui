import React from 'react';

export interface BotStatus {
  id: string; // Bot ID string (e.g., "worker_0") - for display and compatibility
  index: number; // Numeric worker index - for Protocol V2 communication
  position: [number, number, number]; // Contract-compliant [x, y, z] format
  inventory: { [item: string]: number };
  currentJob: string;
  status: 'IDLE' | 'BUSY'; // Contract-compliant status values only
  lastActivity: string;
  utilization: number; // percentage
  lastLog?: string; // Recent general bot activity from server
  // Contract-compliant additional fields
  health?: number; // Health points (0-20)
  food?: number; // Food/hunger level (0-20)
  // Job lifecycle tracking
  currentJobProgress?: {
    progress_percent: number; // 0-100
    current_location?: [number, number, number];
    message?: string;
  };
}

interface WorkerDashboardProps {
  bots: BotStatus[];
  onQueryBot: (botId: string) => void;
  selectedBot: BotStatus | null;
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ bots, onQueryBot, selectedBot }) => {
  const getStatusColor = (status: BotStatus['status']) => {
    switch (status) {
      case 'IDLE': return '#888';
      case 'BUSY': return '#00aaff';
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
    <div style={{
      background: '#1a1a1a',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      padding: '12px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#00ffff',
        marginBottom: '12px',
        textAlign: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '8px'
      }}>
        🤖 Worker Status Dashboard
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
                ({bot.position[0]}, {bot.position[1]}, {bot.position[2]})
              </span>
            </div>

            <div style={infoRowStyle}>
              <span style={{ color: '#aaa' }}>Current Job:</span>
              <span style={{ color: '#fff', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bot.currentJob || 'None'}
              </span>
            </div>

            {/* Job Progress Display */}
            {bot.currentJobProgress && (
              <div style={{ marginBottom: '6px' }}>
                <div style={infoRowStyle}>
                  <span style={{ color: '#aaa' }}>Progress:</span>
                  <span style={{ color: '#00ff44' }}>
                    {bot.currentJobProgress.progress_percent}%
                  </span>
                </div>
                {bot.currentJobProgress.message && (
                  <div style={{ 
                    color: '#fff', 
                    fontSize: '9px', 
                    background: '#2a2a2a', 
                    padding: '3px 6px', 
                    borderRadius: '3px',
                    marginBottom: '4px'
                  }}>
                    {bot.currentJobProgress.message}
                  </div>
                )}
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: `${bot.currentJobProgress.progress_percent}%`,
                    height: '100%',
                    background: '#00ff44',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {bot.currentJobProgress.current_location && (
                  <div style={{ 
                    color: '#aaa', 
                    fontSize: '9px',
                    marginBottom: '4px'
                  }}>
                    Current: ({bot.currentJobProgress.current_location[0]}, {bot.currentJobProgress.current_location[1]}, {bot.currentJobProgress.current_location[2]})
                  </div>
                )}
              </div>
            )}

            <div style={infoRowStyle}>
              <span style={{ color: '#aaa' }}>Last Activity:</span>
              <span style={{ color: '#fff' }}>
                {bot.lastActivity}
              </span>
            </div>

            {/* Health and Food Status */}
            {(bot.health !== undefined || bot.food !== undefined) && (
              <div style={infoRowStyle}>
                <span style={{ color: '#aaa' }}>Health/Food:</span>
                <span style={{ color: '#fff' }}>
                  {bot.health !== undefined ? `❤️ ${bot.health}` : ''}
                  {bot.health !== undefined && bot.food !== undefined ? ' | ' : ''}
                  {bot.food !== undefined ? `🍖 ${bot.food}` : ''}
                </span>
              </div>
            )}

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

      {/* Selected Bot Section */}
      {selectedBot && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: 'rgba(255, 255, 0, 0.1)',
          border: '1px solid #ffff00',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          <div style={{ color: '#ffff00', fontWeight: 'bold' }}>Selected Bot:</div>
          <div style={{ color: '#fff' }}>Bot {selectedBot.id} - {selectedBot.status}</div>
          <div style={{ color: '#aaa' }}>Pos: ({selectedBot.position[0]}, {selectedBot.position[1]}, {selectedBot.position[2]})</div>
          {selectedBot.currentJobProgress && (
            <div style={{ color: '#aaa' }}>Progress: {selectedBot.currentJobProgress.progress_percent}%</div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;