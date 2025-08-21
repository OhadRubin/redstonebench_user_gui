import React, { useState, useEffect } from 'react';
import { BotStatus } from './WorkerDashboard';

interface NewCommandCenterProps {
  selectedBot: BotStatus | null;
  availableBots: string[];
  onCommandSent: (command: any) => void;
}

const NewCommandCenter: React.FC<NewCommandCenterProps> = ({ selectedBot, availableBots, onCommandSent }) => {
  const [selectedCommand, setSelectedCommand] = useState<string>('gather');

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

  const commands = [
    { id: 'gather', icon: '⛏️', label: 'Gather', color: '#ff9500' },
    { id: 'craft', icon: '🔨', label: 'Craft', color: '#8B4513' },
    { id: 'move_to', icon: '🚶', label: 'Move', color: '#00aaff' },
    { id: 'place_blueprint', icon: '🏗️', label: 'Build', color: '#00ff44' },
    { id: 'use_chest', icon: '📦', label: 'Chest', color: '#ff6b6b' },
    { id: 'query_status', icon: '❓', label: 'Query', color: '#888' },
    { id: 'wait', icon: '⏱️', label: 'Wait', color: '#ffaa44' }
  ];

  const handleSendCommand = () => {
    if (!selectedBot) return;

    let command: any = {
      bot_id: selectedBot.id,
      command: selectedCommand,
      timestamp: Date.now()
    };

    switch (selectedCommand) {
      case 'gather':
        command = { ...command, ...gatherForm };
        break;
      case 'craft':
        command = { ...command, ...craftForm };
        break;
      case 'move_to':
        command = { ...command, ...moveForm };
        break;
      case 'place_blueprint':
        command = { ...command, ...blueprintForm };
        break;
      case 'use_chest':
        command = { ...command, ...chestForm };
        break;
      case 'query_status':
        // No additional parameters needed
        break;
      case 'wait':
        command = { ...command, duration: waitTime };
        break;
    }

    onCommandSent(command);
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
        case 'IN_PROGRESS': return '#00aaff';
        case 'COMPLETE': return '#00ff44';
        case 'FAILED': return '#ff4444';
        case 'BLOCKED': return '#ffaa44';
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
              {selectedBot.position.x}, {selectedBot.position.y}, {selectedBot.position.z}
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
              onClick={() => setSelectedCommand(cmd.id)}
              disabled={!selectedBot}
              style={{
                background: selectedCommand === cmd.id 
                  ? `linear-gradient(135deg, ${cmd.color}, ${cmd.color}dd)`
                  : 'linear-gradient(to bottom, #333 0%, #222 100%)',
                border: selectedCommand === cmd.id 
                  ? `2px solid ${cmd.color}` 
                  : '1px solid #555',
                borderRadius: '6px',
                padding: '6px 4px',
                cursor: selectedBot ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.2s ease',
                opacity: selectedBot ? 1 : 0.5,
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
                onChange={(e) => setMoveForm({...moveForm, x: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Y Coordinate:</label>
              <input
                type="number"
                style={inputStyle}
                value={moveForm.y}
                onChange={(e) => setMoveForm({...moveForm, y: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>Z Coordinate:</label>
              <input
                type="number"
                style={inputStyle}
                value={moveForm.z}
                onChange={(e) => setMoveForm({...moveForm, z: parseInt(e.target.value)})}
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

      case 'query_status':
        optionsContent = (
          <div style={{ color: '#888', fontSize: '10px', textAlign: 'center', padding: '20px 0' }}>
            No additional options required for status query
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
          disabled={!selectedBot}
          style={{
            background: selectedBot ? 'linear-gradient(135deg, #007acc, #0066aa)' : '#444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: selectedBot ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: selectedBot ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (selectedBot) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0099ff, #0077cc)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedBot) {
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
    </div>
  );
};

export default NewCommandCenter;