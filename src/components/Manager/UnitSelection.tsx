import React from 'react';
import { BotStatus } from './WorkerDashboard';

interface UnitSelectionProps {
  bots: BotStatus[];
  selectedBot: BotStatus | null;
  onBotSelect: (bot: BotStatus) => void;
}

const UnitSelection: React.FC<UnitSelectionProps> = ({ bots, selectedBot, onBotSelect }) => {
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

  const getStatusEmoji = (status: BotStatus['status']) => {
    switch (status) {
      case 'IDLE': return '⏸️';
      case 'IN_PROGRESS': return '⚡';
      case 'COMPLETE': return '✅';
      case 'FAILED': return '❌';
      case 'BLOCKED': return '🚧';
      default: return '❓';
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #1a1a1a 0%, #0d0d0d 100%)',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      padding: '12px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      width: '200px'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#00ffff',
        marginBottom: '12px',
        textAlign: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '6px'
      }}>
        🎯 Unit Selection
      </div>

      {/* Bot Selection Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
        gap: '8px',
        flex: 1,
        alignContent: 'start'
      }}>
        {bots.map(bot => (
          <button
            key={bot.id}
            onClick={() => onBotSelect(bot)}
            style={{
              background: selectedBot?.id === bot.id 
                ? 'linear-gradient(45deg, rgba(255,255,0,0.3), rgba(255,215,0,0.3))'
                : 'linear-gradient(to bottom, #333 0%, #222 100%)',
              border: selectedBot?.id === bot.id 
                ? '2px solid #ffd700' 
                : '1px solid #555',
              borderRadius: '6px',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              aspectRatio: '1',
              minHeight: '60px'
            }}
            onMouseEnter={(e) => {
              if (selectedBot?.id !== bot.id) {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #444 0%, #333 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedBot?.id !== bot.id) {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #333 0%, #222 100%)';
              }
            }}
          >
            {/* Bot ID */}
            <div style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#00ffff'
            }}>
              {bot.id}
            </div>

            {/* Status Icon */}
            <div style={{
              fontSize: '14px'
            }}>
              {getStatusEmoji(bot.status)}
            </div>

            {/* Status Indicator Dot */}
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: getStatusColor(bot.status)
            }} />
          </button>
        ))}
      </div>

      {/* Selection Info */}
      {selectedBot && (
        <div style={{
          marginTop: '8px',
          padding: '6px',
          background: 'rgba(255, 215, 0, 0.1)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          <div style={{ color: '#ffd700', fontWeight: 'bold' }}>
            Selected: {selectedBot.id}
          </div>
          <div style={{ color: '#fff' }}>
            Status: {selectedBot.status}
          </div>
        </div>
      )}

      {/* No bots message */}
      {bots.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#888',
          padding: '20px',
          fontSize: '10px'
        }}>
          No units available
        </div>
      )}
    </div>
  );
};

export default UnitSelection;