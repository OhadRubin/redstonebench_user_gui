import React, { useState, useEffect } from 'react';
import { 
  Sword, 
  Shield, 
  Heart, 
  Zap, 
  Home, 
  Users, 
  Hammer,
  Move,
  Target,
  Flag,
  TreePine,
  Wheat,
  Coins,
  Gem
} from 'lucide-react';

// Top Bar Component - Resources and Game Info
const TopBar = ({ resources, age, population }) => {
  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white p-2 flex justify-between items-center border-b-2 border-amber-600">
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Wheat className="w-5 h-5 text-yellow-500" />
          <span className="font-bold">{resources.food}</span>
        </div>
        <div className="flex items-center gap-2">
          <TreePine className="w-5 h-5 text-green-600" />
          <span className="font-bold">{resources.wood}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">{resources.gold}</span>
        </div>
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-gray-400" />
          <span className="font-bold">{resources.stone}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-amber-400">{age}</div>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span className="font-bold">{population.current}/{population.max}</span>
      </div>
    </div>
  );
};

// Battlefield Component - Main Game View
const Battlefield = ({ selectedUnit, onUnitSelect, units }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a unit
    const clickedUnit = units.find(unit => 
      Math.abs(unit.x - x) < 30 && Math.abs(unit.y - y) < 30
    );
    
    if (clickedUnit) {
      onUnitSelect(clickedUnit);
    }
  };
  
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
  
  return (
    <div 
      className="relative bg-gradient-to-br from-green-800 via-green-700 to-green-600 flex-1 cursor-crosshair overflow-hidden"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {/* Terrain decorations */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-12 h-12 bg-green-900 rounded-full opacity-30"
            style={{
              left: `${20 + (i * 12)}%`,
              top: `${10 + (i * 8)}%`,
            }}
          />
        ))}
      </div>
      
      {/* Units */}
      {units.map(unit => (
        <div
          key={unit.id}
          className={`absolute w-8 h-8 rounded-full flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
            selectedUnit?.id === unit.id 
              ? 'ring-4 ring-yellow-400 scale-110' 
              : 'hover:scale-105'
          }`}
          style={{
            left: unit.x,
            top: unit.y,
            backgroundColor: unit.team === 'player' ? '#3B82F6' : '#EF4444'
          }}
        >
          {unit.type === 'cavalry' && <span className="text-white text-xs">🐎</span>}
          {unit.type === 'soldier' && <span className="text-white text-xs">⚔</span>}
          {unit.type === 'archer' && <span className="text-white text-xs">🏹</span>}
        </div>
      ))}
      
      {/* Coordinate display */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
        {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
      </div>
      
      {/* Objectives text */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded">
        <div className="text-sm font-bold">Objectives</div>
        <div className="text-xs">Bring Artifact to the marked zone</div>
      </div>
    </div>
  );
};

// Unit Info Component - Shows selected unit details
const UnitInfo = ({ selectedUnit }) => {
  if (!selectedUnit) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-600 w-64">
        <div className="text-gray-400 text-center">No unit selected</div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg border-2 border-amber-600 w-64">
      <div className="flex gap-4 mb-3">
        <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center text-2xl">
          {selectedUnit.type === 'cavalry' && '🐎'}
          {selectedUnit.type === 'soldier' && '⚔'}
          {selectedUnit.type === 'archer' && '🏹'}
        </div>
        <div className="flex-1">
          <div className="text-white font-bold capitalize">{selectedUnit.type}</div>
          <div className="text-gray-400 text-sm">{selectedUnit.name}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          <div className="flex-1 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${(selectedUnit.hp / selectedUnit.maxHp) * 100}%` }}
            />
          </div>
          <span className="text-white text-xs">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
        </div>
        
        <div className="flex items-center gap-2 text-white text-sm">
          <Sword className="w-4 h-4 text-orange-500" />
          <span>{selectedUnit.attack}</span>
        </div>
        
        <div className="flex items-center gap-2 text-white text-sm">
          <Shield className="w-4 h-4 text-blue-500" />
          <span>{selectedUnit.defense}</span>
        </div>
        
        <div className="flex items-center gap-2 text-white text-sm">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>{selectedUnit.speed}</span>
        </div>
      </div>
      
      {/* Inventory slots */}
      <div className="mt-4 grid grid-cols-4 gap-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-8 h-8 bg-gray-700 border border-gray-600 rounded" />
        ))}
      </div>
    </div>
  );
};

// Command Panel Component - Action buttons
const CommandPanel = ({ selectedUnit, onCommand }) => {
  const commands = [
    { id: 'move', icon: Move, label: 'Move', hotkey: 'M' },
    { id: 'attack', icon: Sword, label: 'Attack', hotkey: 'A' },
    { id: 'defend', icon: Shield, label: 'Defend', hotkey: 'D' },
    { id: 'patrol', icon: Flag, label: 'Patrol', hotkey: 'P' },
    { id: 'garrison', icon: Home, label: 'Garrison', hotkey: 'G' },
    { id: 'special', icon: Zap, label: 'Special', hotkey: 'S' },
  ];
  
  const formations = [
    { id: 'line', label: 'Line' },
    { id: 'box', label: 'Box' },
    { id: 'wedge', label: 'Wedge' },
    { id: 'scatter', label: 'Scatter' },
  ];
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-600 flex-1 max-w-md">
      <div className="text-white text-sm font-bold mb-2">Commands</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {commands.map(cmd => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              onClick={() => onCommand(cmd.id)}
              disabled={!selectedUnit}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-900 disabled:opacity-50 p-3 rounded flex flex-col items-center gap-1 transition-all hover:scale-105"
            >
              <Icon className="w-5 h-5 text-amber-400" />
              <span className="text-white text-xs">{cmd.label}</span>
              <span className="text-gray-400 text-xs">({cmd.hotkey})</span>
            </button>
          );
        })}
      </div>
      
      <div className="text-white text-sm font-bold mb-2">Formation</div>
      <div className="grid grid-cols-4 gap-2">
        {formations.map(form => (
          <button
            key={form.id}
            disabled={!selectedUnit}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-900 disabled:opacity-50 p-2 rounded text-white text-xs transition-all"
          >
            {form.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Minimap Component
const Minimap = ({ units, viewportBounds }) => {
  const mapScale = 0.1;
  
  return (
    <div className="bg-gray-800 p-2 rounded-lg border-2 border-gray-600">
      <div className="w-48 h-48 bg-gradient-to-br from-green-900 to-green-700 relative rounded">
        {/* Fog of war effect */}
        <div className="absolute inset-0 bg-black opacity-30 rounded" />
        
        {/* Explored area */}
        <div className="absolute inset-4 bg-gradient-to-br from-green-700 to-green-600 rounded" />
        
        {/* Units on minimap */}
        {units.map(unit => (
          <div
            key={unit.id}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${unit.x * mapScale}%`,
              top: `${unit.y * mapScale}%`,
              backgroundColor: unit.team === 'player' ? '#3B82F6' : '#EF4444'
            }}
          />
        ))}
        
        {/* Viewport indicator */}
        <div className="absolute border-2 border-yellow-400 pointer-events-none"
          style={{
            left: '30%',
            top: '30%',
            width: '40%',
            height: '40%',
          }}
        />
        
        {/* Map markers */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      </div>
      <div className="text-white text-xs mt-2 text-center">Minimap</div>
    </div>
  );
};

// Bottom Panel Container
const BottomPanel = ({ selectedUnit, units, onCommand }) => {
  return (
    <div className="bg-gradient-to-b from-gray-900 to-black p-4 border-t-2 border-amber-600">
      <div className="flex gap-4 justify-between items-start">
        <UnitInfo selectedUnit={selectedUnit} />
        <CommandPanel selectedUnit={selectedUnit} onCommand={onCommand} />
        <Minimap units={units} />
      </div>
    </div>
  );
};

// Main Game Interface Component
const GameInterface = () => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [resources, setResources] = useState({
    food: 1200,
    wood: 800,
    gold: 650,
    stone: 400
  });
  const [population, setPopulation] = useState({ current: 138, max: 175 });
  const [units, setUnits] = useState([
    { id: 1, name: 'Knight Commander', type: 'cavalry', x: 200, y: 150, hp: 80, maxHp: 100, attack: 15, defense: 12, speed: 8, team: 'player' },
    { id: 2, name: 'Cavalry Scout', type: 'cavalry', x: 250, y: 180, hp: 60, maxHp: 80, attack: 10, defense: 8, speed: 10, team: 'player' },
    { id: 3, name: 'Archer', type: 'archer', x: 300, y: 200, hp: 40, maxHp: 50, attack: 12, defense: 5, speed: 6, team: 'player' },
    { id: 4, name: 'Enemy Soldier', type: 'soldier', x: 400, y: 100, hp: 70, maxHp: 90, attack: 12, defense: 10, speed: 5, team: 'enemy' },
    { id: 5, name: 'Allied Cavalry', type: 'cavalry', x: 150, y: 250, hp: 75, maxHp: 100, attack: 14, defense: 11, speed: 8, team: 'player' },
  ]);
  
  const handleCommand = (commandId) => {
    console.log(`Executing command: ${commandId} for unit:`, selectedUnit);
  };
  
  // Simulate resource gathering
  useEffect(() => {
    const interval = setInterval(() => {
      setResources(prev => ({
        food: Math.min(9999, prev.food + Math.floor(Math.random() * 5)),
        wood: Math.min(9999, prev.wood + Math.floor(Math.random() * 3)),
        gold: Math.min(9999, prev.gold + Math.floor(Math.random() * 2)),
        stone: Math.min(9999, prev.stone + Math.floor(Math.random() * 1)),
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="h-screen flex flex-col bg-black">
      <TopBar 
        resources={resources} 
        age="Iron Age" 
        population={population} 
      />
      <Battlefield 
        selectedUnit={selectedUnit}
        onUnitSelect={setSelectedUnit}
        units={units}
      />
      <BottomPanel 
        selectedUnit={selectedUnit}
        units={units}
        onCommand={handleCommand}
      />
    </div>
  );
};

export default GameInterface;