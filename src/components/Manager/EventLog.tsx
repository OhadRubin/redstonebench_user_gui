import React, { useEffect, useRef } from 'react';

export interface BotEvent {
  id: string;
  timestamp: number;
  bot_id: string; // Contract-compliant naming (e.g., "worker_0")
  type: 'command_response' | 'job_start' | 'job_progress' | 'job_complete' | 'job_failed' | 
        'status_response' | 'cancel_response';
  job_id?: string; // Contract-compliant naming
  message: string;
  details?: any;
  errorCode?: string; // For contract error codes: BOT_BUSY, INVALID_PARAMETERS, BOT_NOT_FOUND, INTERNAL_ERROR
}

interface EventLogProps {
  events: BotEvent[];
  onClearLog: () => void;
}

const EventLog: React.FC<EventLogProps> = ({ events, onClearLog }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new events are added
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getEventColor = (type: BotEvent['type']) => {
    switch (type) {
      case 'job_start': return '#00ff44';
      case 'job_progress': return '#00aaff';
      case 'job_complete': return '#00ff44';
      case 'job_failed': return '#ff4444';
      case 'command_response': return '#ffaa44';
      case 'status_response': return '#888';
      case 'cancel_response': return '#ff8844';
      default: return '#fff';
    }
  };

  const getEventIcon = (type: BotEvent['type']) => {
    switch (type) {
      case 'job_start': return '▶️';
      case 'job_progress': return '⏳';
      case 'job_complete': return '✅';
      case 'job_failed': return '❌';
      case 'command_response': return '📤';
      case 'status_response': return 'ℹ️';
      case 'cancel_response': return '🛑';
      default: return '📄';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const eventStyle: React.CSSProperties = {
    padding: '6px 8px',
    marginBottom: '2px',
    borderRadius: '3px',
    fontSize: '10px',
    borderLeft: '3px solid transparent',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px'
  };

  const getEventStyle = (type: BotEvent['type']): React.CSSProperties => ({
    ...eventStyle,
    background: type === 'job_failed' ? '#331111' : 
                type === 'job_complete' ? '#113311' : '#1a1a1a',
    borderLeftColor: getEventColor(type)
  });

  const clearButtonStyle: React.CSSProperties = {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    cursor: 'pointer',
    marginBottom: '10px'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '0 5px'
  };

  const statsStyle: React.CSSProperties = {
    fontSize: '9px',
    color: '#888',
    display: 'flex',
    gap: '15px'
  };

  // Calculate event type counts
  const eventCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

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
        📋 Event Log
      </div>
      
      <div style={headerStyle}>
        <div style={statsStyle}>
          <span>Total: {events.length}</span>
          <span style={{color: '#00ff44'}}>✓ {eventCounts.COMPLETE || 0}</span>
          <span style={{color: '#ff4444'}}>✗ {eventCounts.FAILED || 0}</span>
          <span style={{color: '#ffaa44'}}>⚠ {eventCounts.BLOCKED || 0}</span>
        </div>
        <button 
          style={clearButtonStyle}
          onClick={onClearLog}
          onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
        >
          Clear Log
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        border: '1px solid #333',
        borderRadius: '3px',
        background: '#0a0a0a'
      }}>
        {events.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#555',
            fontSize: '11px'
          }}>
            No events yet. Send commands to see bot activity.
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} style={getEventStyle(event.type)}>
              <span>{getEventIcon(event.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <span style={{ 
                    color: getEventColor(event.type),
                    fontWeight: 'bold'
                  }}>
                    Bot {event.bot_id} • {event.type}
                  </span>
                  <span style={{ color: '#666', fontSize: '9px' }}>
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div style={{ color: '#ccc', lineHeight: '1.3' }}>
                  {event.message}
                </div>
                {event.job_id && (
                  <div style={{ color: '#666', fontSize: '9px', marginTop: '2px' }}>
                    Job: {event.job_id}
                  </div>
                )}
                {event.errorCode && (
                  <div style={{ 
                    color: '#ff8888', 
                    fontSize: '9px', 
                    marginTop: '2px',
                    fontFamily: 'monospace'
                  }}>
                    Error: {event.errorCode}
                  </div>
                )}
                {event.details && (
                  <div style={{ 
                    color: '#888', 
                    fontSize: '9px', 
                    marginTop: '2px',
                    fontFamily: 'monospace'
                  }}>
                    {JSON.stringify(event.details)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default EventLog;