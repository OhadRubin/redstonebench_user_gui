import React, { useState, useEffect } from 'react';
import { BotStatus } from './WorkerDashboard';

/**
 * NewCommandCenter - Contract-Compliant Command Interface
 * 
 * This component has been updated to comply with the RedstoneBench WebSocket Contract:
 * 1. Command messages now include required "type": "command" field
 * 2. Uses "cmd" instead of "command" field name
 * 3. Parameters are wrapped in "parameters" object
 * 4. move_to command uses "target": [x,y,z] format
 * 5. get_status and cancel_job use separate message types (not command messages)
 * 6. Bot ID validation for range 0-64 using selectedBot.index (numeric)
 * 7. Status checks use 'BUSY' instead of 'IN_PROGRESS'
 * 8. Extension commands are clearly marked and visually distinguished
 * 
 * Error Handling (to be implemented in parent component):
 * The parent component should handle WebSocket responses and display errors for:
 * - BOT_BUSY: "Bot is currently busy with another job"
 * - INVALID_PARAMETERS: "Invalid or missing parameters"
 * - BOT_NOT_FOUND: "Bot ID not found or not connected"
 * - INTERNAL_ERROR: "Server error occurred"
 */

// Contract-compliant message structures
interface CommandMessage {
  type: 'command';
  cmd: string;
  bot_id: number;
  parameters: Record<string, any>;
}

interface CancelJobMessage {
  type: 'cancel_job';
  bot_id: number;
}

interface GetStatusMessage {
  type: 'get_status';
  bot_id: number;
}

type WebSocketMessage = CommandMessage | CancelJobMessage | GetStatusMessage;

interface CommandDefinition {
  id: string;
  icon: string;
  label: string;
  color: string;
  extension?: boolean;
}

interface NewCommandCenterProps {
  selectedBot: BotStatus | null;
  availableBots: string[];
  onCommandSent: (command: any) => void;
  onCancelJob: (botId: string | number) => void;
  selectedCommand: string;
  onCommandChange: (command: string) => void;
  moveTarget: { x: number; y: number; z: number } | null;
  onMoveTargetChange: (target: { x: number; y: number; z: number } | null) => void;
}

// Selected Bot Last Log Display Component  
interface SelectedBotLogDisplayProps {
  selectedBot: BotStatus | null;
}

const SelectedBotLogDisplay: React.FC<SelectedBotLogDisplayProps> = ({ selectedBot }) => {
  if (!selectedBot) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          color: '#666',
          fontSize: '10px',
          fontFamily: "'Courier New', monospace",
          textAlign: 'center'
        }}>
          No bot selected - select a bot to see recent activity
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 255, 255, 0.1)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '6px',
      padding: '8px'
    }}>
      <div style={{
        color: '#00ffff',
        fontSize: '10px',
        fontWeight: 'bold',
        marginBottom: '4px',
        fontFamily: "'Courier New', monospace"
      }}>
        🤖 Recent Activity - {selectedBot.id}
      </div>
      <div style={{
        color: '#ccc',
        fontSize: '10px',
        fontFamily: "'Courier New', monospace",
        wordBreak: 'break-word'
      }}>
        {selectedBot.lastLog || 'No recent activity'}
      </div>
    </div>
  );
};

const NewCommandCenter: React.FC<NewCommandCenterProps> = ({ selectedBot, availableBots, onCommandSent, onCancelJob, selectedCommand, onCommandChange, moveTarget, onMoveTargetChange }) => {

  // Form states for different commands
  const [gatherForm, setGatherForm] = useState({
    resource: 'minecraft:oak_log',
    quantity: 10,
    region: ''
  });

  const [craftForm, setCraftForm] = useState({
    item: 'minecraft:crafting_table',
    quantity: 1
  });

  const [moveForm, setMoveForm] = useState({
    x: 0,
    y: 64,
    z: 0
  });

  const [blueprintForm, setBlueprintForm] = useState({
    region: 'layer_y1'
  });

  const [chestForm, setChestForm] = useState({
    action: 'deposit',
    items: 'minecraft:oak_log:10',
    chest_pos: '0,65,0'
  });

  const [waitTime, setWaitTime] = useState<number>(5);

  // Sync moveForm with moveTarget prop
  useEffect(() => {
    if (moveTarget) {
      setMoveForm({
        x: moveTarget.x,
        y: moveTarget.y,
        z: moveTarget.z
      });
    }
  }, [moveTarget]);

  // Handle manual move form changes
  const handleMoveFormChange = (newMoveForm: { x: number; y: number; z: number }) => {
    setMoveForm(newMoveForm);
    onMoveTargetChange(newMoveForm);
  };

  const commands: CommandDefinition[] = [
    // Contract-compliant commands
    { id: 'move_to', icon: '🚶', label: 'Move', color: '#00aaff' },
    { id: 'cancel_job', icon: '🛑', label: 'Cancel', color: '#ff4444' },
    { id: 'get_status', icon: '❓', label: 'Query', color: '#888' },
    // Extension commands (not in contract)
    { id: 'gather', icon: '⛏️', label: 'Gather (Ext)', color: '#ff9500', extension: true },
    { id: 'craft', icon: '🔨', label: 'Craft (Ext)', color: '#8B4513', extension: true },
    { id: 'place_blueprint', icon: '🏗️', label: 'Build (Ext)', color: '#00ff44', extension: true },
    { id: 'use_chest', icon: '📦', label: 'Chest (Ext)', color: '#ff6b6b', extension: true },
    { id: 'wait', icon: '⏱️', label: 'Wait (Ext)', color: '#ffaa44', extension: true }
  ];

  const handleSendCommand = () => {
    if (!selectedBot) return;

    // Validate bot_id is in range 0-64 as per contract
    if (selectedBot.index < 0 || selectedBot.index > 64) {
      console.error('Bot ID must be in range 0-64');
      return;
    }

    let message: WebSocketMessage;

    switch (selectedCommand) {
      case 'move_to':
        // Contract-compliant format: "target": [x, y, z]
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: {
            target: [moveForm.x, moveForm.y, moveForm.z]
          }
        };
        break;
      case 'get_status':
        // Contract-compliant: separate message type for get_status
        message = {
          type: 'get_status',
          bot_id: selectedBot.index
        };
        break;
      case 'cancel_job':
        // Contract-compliant: separate message type for cancel_job
        message = {
          type: 'cancel_job',
          bot_id: selectedBot.index
        };
        break;
      // Extension commands (not in contract)
      case 'gather':
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: { ...gatherForm }
        };
        break;
      case 'craft':
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: { ...craftForm }
        };
        break;
      case 'place_blueprint':
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: { ...blueprintForm }
        };
        break;
      case 'use_chest':
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: { ...chestForm }
        };
        break;
      case 'wait':
        message = {
          type: 'command',
          cmd: selectedCommand,
          bot_id: selectedBot.index,
          parameters: { duration: waitTime }
        };
        break;
      default:
        console.error(`Unsupported command: ${selectedCommand}`);
        return;
    }

    onCommandSent(message);
  };

  // Unit Information Section
  const renderUnitInfo = () => {
    if (!selectedBot) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#888'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
          <div style={{ fontSize: '12px' }}>No unit selected</div>
          <div style={{ fontSize: '10px', color: '#555' }}>Click a unit to view details</div>
        </div>
      );
    }

    const getStatusColor = (status: BotStatus['status']) => {
      switch (status) {
        case 'IDLE': return '#888';
        case 'BUSY': return '#00aaff';
        default: return '#888';
      }
    };

    const formatInventory = (inventory: { [item: string]: number }) => {
      const items = Object.entries(inventory);
      if (items.length === 0) return 'Empty inventory';
      
      return items
        .slice(0, 3) // Show only first 3 items
        .map(([item, count]) => {
          const shortName = item.replace('minecraft:', '');
          return `${shortName}: ${count}`;
        })
        .join(', ') + (items.length > 3 ? '...' : '');
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%'
      }}>
        {/* Unit Portrait */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00aaff, #0088cc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🤖
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              Bot {selectedBot.id}
            </div>
            <div style={{
              fontSize: '10px',
              color: getStatusColor(selectedBot.status),
              fontWeight: 'bold'
            }}>
              {selectedBot.status}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          fontSize: '10px'
        }}>
          <div>
            <div style={{ color: '#888', marginBottom: '2px' }}>Position</div>
            <div style={{ color: '#fff' }}>
              {selectedBot.position[0]}, {selectedBot.position[1]}, {selectedBot.position[2]}
            </div>
          </div>
          <div>
            <div style={{ color: '#888', marginBottom: '2px' }}>Utilization</div>
            <div style={{ color: '#fff' }}>
              {selectedBot.utilization.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Current Job */}
        <div style={{ fontSize: '10px' }}>
          <div style={{ color: '#888', marginBottom: '2px' }}>Current Job</div>
          <div style={{
            color: '#fff',
            background: '#2a2a2a',
            padding: '4px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            maxHeight: '32px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {selectedBot.currentJob || 'Idle'}
          </div>
        </div>

        {/* Inventory */}
        <div style={{ fontSize: '10px', flex: 1 }}>
          <div style={{ color: '#888', marginBottom: '2px' }}>Inventory</div>
          <div style={{
            color: '#fff',
            background: '#2a2a2a',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '9px',
            height: '40px',
            overflow: 'hidden'
          }}>
            {formatInventory(selectedBot.inventory)}
          </div>
        </div>

        {/* Cancel Job Button - Only show when bot is busy */}
        {selectedBot.status === 'BUSY' && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => {
                // Send proper contract-compliant cancel_job message
                const cancelMessage: CancelJobMessage = {
                  type: 'cancel_job',
                  bot_id: selectedBot.index
                };
                onCommandSent(cancelMessage);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff4444, #cc3333)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff6666, #dd4444)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff4444, #cc3333)';
              }}
            >
              🛑 Cancel Job
            </button>
          </div>
        )}
      </div>
    );
  };

  // Command Selection Section
  const renderCommandSelection = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          Command Selection
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          flex: 1
        }}>
          {commands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => onCommandChange(cmd.id)}
              disabled={!selectedBot}
              style={{
                background: selectedCommand === cmd.id 
                  ? `linear-gradient(135deg, ${cmd.color}, ${cmd.color}dd)`
                  : cmd.extension
                    ? 'linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 100%)'
                    : 'linear-gradient(to bottom, #333 0%, #222 100%)',
                border: selectedCommand === cmd.id 
                  ? `2px solid ${cmd.color}` 
                  : cmd.extension
                    ? '1px solid #444'
                    : '1px solid #555',
                borderRadius: '6px',
                padding: '6px 4px',
                cursor: selectedBot ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.2s ease',
                opacity: selectedBot ? (cmd.extension ? 0.7 : 1) : 0.5,
                height: '50px',
                minHeight: '50px'
              }}
              onMouseEnter={(e) => {
                if (selectedBot && selectedCommand !== cmd.id) {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #444 0%, #333 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBot && selectedCommand !== cmd.id) {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #333 0%, #222 100%)';
                }
              }}
            >
              <div style={{ fontSize: '16px' }}>
                {cmd.icon}
              </div>
              <div style={{
                fontSize: '8px',
                fontWeight: 'bold',
                color: selectedCommand === cmd.id ? '#fff' : '#aaa',
                lineHeight: '1'
              }}>
                {cmd.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Contextual Options Section
  const renderContextualOptions = () => {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: '4px 6px',
      margin: '2px 0',
      background: '#222',
      color: '#fff',
      border: '1px solid #555',
      borderRadius: '4px',
      fontSize: '10px'
    };

    const selectedCommandObj = commands.find(cmd => cmd.id === selectedCommand);

    let optionsContent;
    switch (selectedCommand) {
      case 'gather':
        optionsContent = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Resource:</label>
              <select 
                style={inputStyle}
                value={gatherForm.resource}
                onChange={(e) => setGatherForm({...gatherForm, resource: e.target.value})}
              >
                <option value="minecraft:oak_log">Oak Log</option>
                <option value="minecraft:stone">Stone</option>
                <option value="minecraft:cobblestone">Cobblestone</option>
                <option value="minecraft:iron_ore">Iron Ore</option>
                <option value="minecraft:redstone">Redstone</option>
                <option value="minecraft:sugar_cane">Sugar Cane</option>
                <option value="minecraft:dirt">Dirt</option>
                <option value="minecraft:water_bucket">Water Bucket</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Quantity:</label>
              <input
                type="number"
                style={inputStyle}
                value={gatherForm.quantity}
                onChange={(e) => setGatherForm({...gatherForm, quantity: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Region:</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Optional region"
                value={gatherForm.region}
                onChange={(e) => setGatherForm({...gatherForm, region: e.target.value})}
              />
            </div>
          </div>
        );
        break;

      case 'craft':
        optionsContent = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Item:</label>
              <select 
                style={inputStyle}
                value={craftForm.item}
                onChange={(e) => setCraftForm({...craftForm, item: e.target.value})}
              >
                <option value="minecraft:crafting_table">Crafting Table</option>
                <option value="minecraft:wooden_pickaxe">Wooden Pickaxe</option>
                <option value="minecraft:stone_pickaxe">Stone Pickaxe</option>
                <option value="minecraft:iron_pickaxe">Iron Pickaxe</option>
                <option value="minecraft:bucket">Bucket</option>
                <option value="minecraft:hopper">Hopper</option>
                <option value="minecraft:chest">Chest</option>
                <option value="minecraft:piston">Piston</option>
                <option value="minecraft:observer">Observer</option>
                <option value="minecraft:redstone_torch">Redstone Torch</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Quantity:</label>
              <input
                type="number"
                style={inputStyle}
                value={craftForm.quantity}
                onChange={(e) => setCraftForm({...craftForm, quantity: parseInt(e.target.value)})}
              />
            </div>
          </div>
        );
        break;

      case 'move_to':
        optionsContent = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>X Coordinate:</label>
              <input
                type="number"
                style={inputStyle}
                value={moveForm.x}
                onChange={(e) => handleMoveFormChange({...moveForm, x: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Y Coordinate:</label>
              <input
                type="number"
                style={inputStyle}
                value={moveForm.y}
                onChange={(e) => handleMoveFormChange({...moveForm, y: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Z Coordinate:</label>
              <input
                type="number"
                style={inputStyle}
                value={moveForm.z}
                onChange={(e) => handleMoveFormChange({...moveForm, z: parseInt(e.target.value)})}
              />
            </div>
          </div>
        );
        break;

      case 'place_blueprint':
        optionsContent = (
          <div>
            <label style={{ fontSize: '10px', color: '#aaa' }}>Blueprint Region:</label>
            <select 
              style={inputStyle}
              value={blueprintForm.region}
              onChange={(e) => setBlueprintForm({...blueprintForm, region: e.target.value})}
            >
              <option value="layer_y0">Layer Y=0 (Foundation)</option>
              <option value="layer_y1">Layer Y=1 (Main Farm)</option>
              <option value="layer_y2">Layer Y=2 (Redstone/Pistons)</option>
              <option value="all_layers">All Layers</option>
              <option value="custom">Custom Region</option>
            </select>
          </div>
        );
        break;

      case 'use_chest':
        optionsContent = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Action:</label>
              <select 
                style={inputStyle}
                value={chestForm.action}
                onChange={(e) => setChestForm({...chestForm, action: e.target.value})}
              >
                <option value="deposit">Deposit Items</option>
                <option value="withdraw">Withdraw Items</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Items:</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="minecraft:oak_log:10"
                value={chestForm.items}
                onChange={(e) => setChestForm({...chestForm, items: e.target.value})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Position:</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="0,65,0"
                value={chestForm.chest_pos}
                onChange={(e) => setChestForm({...chestForm, chest_pos: e.target.value})}
              />
            </div>
          </div>
        );
        break;

      case 'wait':
        optionsContent = (
          <div>
            <label style={{ fontSize: '10px', color: '#aaa' }}>Duration (seconds):</label>
            <input
              type="number"
              style={inputStyle}
              value={waitTime}
              onChange={(e) => setWaitTime(parseInt(e.target.value))}
            />
          </div>
        );
        break;

      case 'get_status':
        optionsContent = (
          <div style={{ color: '#888', fontSize: '10px', textAlign: 'center', padding: '20px 0' }}>
            No additional options required for status query
          </div>
        );
        break;

      case 'cancel_job':
        optionsContent = (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: '#ff4444', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              🛑 Cancel Current Job
            </div>
            <div style={{ color: '#888', fontSize: '10px', lineHeight: '1.4' }}>
              This will cancel the currently running job for the selected bot.
              {selectedBot?.status === 'BUSY' ? (
                <div style={{ color: '#ffaa44', marginTop: '4px' }}>
                  Bot is currently busy: {selectedBot.currentJob}
                </div>
              ) : (
                <div style={{ color: '#666', marginTop: '4px' }}>
                  Bot is idle - no job to cancel
                </div>
              )}
            </div>
          </div>
        );
        break;

      default:
        optionsContent = null;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          {selectedCommandObj?.label} Options
        </div>

        <div style={{ flex: 1, marginBottom: '12px' }}>
          {optionsContent}
        </div>

        <button 
          onClick={handleSendCommand}
          disabled={!selectedBot || (selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')}
          style={{
            background: (selectedBot && !(selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')) 
              ? 'linear-gradient(135deg, #007acc, #0066aa)' : '#444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: (selectedBot && !(selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')) 
              ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: (selectedBot && !(selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')) ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (selectedBot && !(selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0099ff, #0077cc)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedBot && !(selectedCommand === 'cancel_job' && selectedBot?.status !== 'BUSY')) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #007acc, #0066aa)';
            }
          }}
        >
          Execute {selectedCommandObj?.label}
        </button>
      </div>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #1a1a1a 0%, #0d0d0d 100%)',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      padding: '16px',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 1fr',
      gridTemplateRows: 'auto auto',
      gap: '16px',
      minWidth: '800px'
    }}>
      {/* Unit Information (Left) */}
      <div style={{
        background: 'linear-gradient(to bottom, #222 0%, #111 100%)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Unit Information
        </div>
        {renderUnitInfo()}
      </div>

      {/* Command Selection (Center) */}
      <div style={{
        background: 'linear-gradient(to bottom, #222 0%, #111 100%)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '12px'
      }}>
        {renderCommandSelection()}
      </div>

      {/* Contextual Options (Right) */}
      <div style={{
        background: 'linear-gradient(to bottom, #222 0%, #111 100%)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '12px'
      }}>
        {renderContextualOptions()}
      </div>

      {/* Selected Bot Recent Activity (Full Width Bottom Row) */}
      <div style={{
        gridColumn: '1 / -1', // Span all columns
        background: 'linear-gradient(to bottom, #222 0%, #111 100%)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
        </div>
        <SelectedBotLogDisplay selectedBot={selectedBot} />
      </div>
    </div>
  );
};

export default NewCommandCenter;