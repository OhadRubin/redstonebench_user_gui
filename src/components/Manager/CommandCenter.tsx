import React, { useState, useEffect } from 'react';

interface CommandCenterProps {
  onCommandSent: (command: any) => void;
  availableBots: string[]; // Changed to string to match server format
}

const CommandCenter: React.FC<CommandCenterProps> = ({ onCommandSent, availableBots }) => {
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [selectedCommand, setSelectedCommand] = useState<string>('gather');

  // Update selected bot when available bots change
  useEffect(() => {
    if (availableBots.length > 0 && (!selectedBot || !availableBots.includes(selectedBot))) {
      setSelectedBot(availableBots[0]);
    }
  }, [availableBots, selectedBot]);

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

  const handleSendCommand = () => {
    let command: any = {
      bot_id: selectedBot,
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

  const renderCommandForm = () => {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: '4px',
      margin: '2px 0',
      background: '#222',
      color: '#fff',
      border: '1px solid #555',
      borderRadius: '3px'
    };

    switch (selectedCommand) {
      case 'gather':
        return (
          <div>
            <label>Resource:</label>
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
            
            <label>Quantity:</label>
            <input
              type="number"
              style={inputStyle}
              value={gatherForm.quantity}
              onChange={(e) => setGatherForm({...gatherForm, quantity: parseInt(e.target.value)})}
            />
            
            <label>Region (optional):</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g., 'forest_area' or leave blank"
              value={gatherForm.region}
              onChange={(e) => setGatherForm({...gatherForm, region: e.target.value})}
            />
          </div>
        );

      case 'craft':
        return (
          <div>
            <label>Item to Craft:</label>
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
            
            <label>Quantity:</label>
            <input
              type="number"
              style={inputStyle}
              value={craftForm.quantity}
              onChange={(e) => setCraftForm({...craftForm, quantity: parseInt(e.target.value)})}
            />
          </div>
        );

      case 'move_to':
        return (
          <div>
            <label>X Coordinate:</label>
            <input
              type="number"
              style={inputStyle}
              value={moveForm.x}
              onChange={(e) => setMoveForm({...moveForm, x: parseInt(e.target.value)})}
            />
            
            <label>Y Coordinate:</label>
            <input
              type="number"
              style={inputStyle}
              value={moveForm.y}
              onChange={(e) => setMoveForm({...moveForm, y: parseInt(e.target.value)})}
            />
            
            <label>Z Coordinate:</label>
            <input
              type="number"
              style={inputStyle}
              value={moveForm.z}
              onChange={(e) => setMoveForm({...moveForm, z: parseInt(e.target.value)})}
            />
          </div>
        );

      case 'place_blueprint':
        return (
          <div>
            <label>Blueprint Region:</label>
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

      case 'use_chest':
        return (
          <div>
            <label>Action:</label>
            <select 
              style={inputStyle}
              value={chestForm.action}
              onChange={(e) => setChestForm({...chestForm, action: e.target.value})}
            >
              <option value="deposit">Deposit Items</option>
              <option value="withdraw">Withdraw Items</option>
            </select>
            
            <label>Items (format: item:quantity):</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="minecraft:oak_log:10"
              value={chestForm.items}
              onChange={(e) => setChestForm({...chestForm, items: e.target.value})}
            />
            
            <label>Chest Position (x,y,z):</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="0,65,0"
              value={chestForm.chest_pos}
              onChange={(e) => setChestForm({...chestForm, chest_pos: e.target.value})}
            />
          </div>
        );

      case 'wait':
        return (
          <div>
            <label>Wait Duration (seconds):</label>
            <input
              type="number"
              style={inputStyle}
              value={waitTime}
              onChange={(e) => setWaitTime(parseInt(e.target.value))}
            />
          </div>
        );

      case 'query_status':
        return (
          <div>
            <p style={{color: '#888', fontSize: '12px'}}>
              This command will request a status update from the selected bot.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    margin: '5px 0',
    background: '#333',
    color: '#fff',
    border: '1px solid #666',
    borderRadius: '4px'
  };

  const buttonStyle: React.CSSProperties = {
    background: '#007acc',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '10px',
    fontSize: '14px',
    fontWeight: 'bold'
  };

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
        🎮 Command Center
      </div>
      
      <div style={{ fontSize: '12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', color: '#00ffff' }}>Select Bot:</label>
          <select 
            style={selectStyle}
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
          >
            {availableBots.map(botId => (
              <option key={botId} value={botId}>Bot {botId}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', color: '#00ffff' }}>Command:</label>
          <select 
            style={selectStyle}
            value={selectedCommand}
            onChange={(e) => setSelectedCommand(e.target.value)}
          >
            <option value="gather">Gather Resources</option>
            <option value="craft">Craft Items</option>
            <option value="move_to">Move To Position</option>
            <option value="place_blueprint">Place Blueprint</option>
            <option value="use_chest">Use Chest</option>
            <option value="query_status">Query Status</option>
            <option value="wait">Wait</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', color: '#00ffff' }}>Parameters:</label>
          <div style={{ marginTop: '5px' }}>
            {renderCommandForm()}
          </div>
        </div>

        <button 
          style={buttonStyle}
          onClick={handleSendCommand}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0099ff'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#007acc'}
        >
          Send Command to Bot {selectedBot}
        </button>
      </div>
    </div>
  );
};

export default CommandCenter;