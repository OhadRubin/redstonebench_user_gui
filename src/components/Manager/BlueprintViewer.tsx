import React, { useState } from 'react';

interface BlueprintViewerProps {
  completedBlocks: Set<[number, number, number]>; // Set of [x,y,z] coordinate arrays that are completed
  onRegionSelect: (region: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BlueprintViewer: React.FC<BlueprintViewerProps> = ({ completedBlocks, onRegionSelect, isOpen, onClose }) => {
  const [selectedLayer, setSelectedLayer] = useState<number>(1);

  // Sugar Cane Farm Blueprint from the RedstoneBench document
  const blueprint = {
    legend: {
      'O': { name: 'Air', color: '#333' },
      'S': { name: 'Stone', color: '#888' },
      'H': { name: 'Hopper (Facing South)', color: '#666' },
      'D': { name: 'Dirt', color: '#8B4513' },
      'F': { name: 'Farmland', color: '#D2B48C' },
      'W': { name: 'Water', color: '#4169E1' },
      'C': { name: 'Chest (Facing West)', color: '#8B4513' },
      'G': { name: 'Hopper (Facing West)', color: '#666' },
      '#': { name: 'Chest (Facing West)', color: '#8B4513' },
      'N': { name: 'Hopper (Facing North)', color: '#666' },
      'P': { name: 'Piston (Facing West)', color: '#A0A0A0' },
      'R': { name: 'Redstone Wire', color: '#FF0000' },
      'M': { name: 'Melon Stem (Age 7)', color: '#228B22' },
      'B': { name: 'Observer (Facing West)', color: '#708090' }
    },
    layers: {
      0: [
        'OOOOO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOSO',
        'OOOOO'
      ],
      1: [
        'OHDSS',
        'OHFWS',
        'OHDSS',
        'OHDWS',
        'OHDSS',
        'CGFWS',
        '#NDSS',
        'ONFWS',
        'ONDSS',
        'ONFWS',
        'ONDSS'
      ],
      2: [
        'OOOPR',
        'OOMBS',
        'OOOPR',
        'OOOBS',
        'OOOPR',
        'OOMBS',
        'OOOPR',
        'OOMBS',
        'OOOPR',
        'OOMBS',
        'OOOPR'
      ]
    }
  };

  const isBlockCompleted = (x: number, y: number, z: number): boolean => {
    // Check if the coordinate array [x,y,z] exists in completedBlocks
    for (const coord of Array.from(completedBlocks)) {
      if (coord[0] === x && coord[1] === y && coord[2] === z) {
        return true;
      }
    }
    return false;
  };

  const getBlockStyle = (block: string, x: number, z: number, y: number): React.CSSProperties => {
    const isCompleted = isBlockCompleted(x, y, z);
    const legendEntry = blueprint.legend[block as keyof typeof blueprint.legend];
    
    return {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      backgroundColor: legendEntry?.color || '#333',
      color: block === 'O' ? '#555' : '#fff',
      textAlign: 'center',
      fontSize: '10px',
      lineHeight: '16px',
      border: '1px solid #555',
      margin: '0.5px',
      cursor: 'pointer',
      opacity: isCompleted ? 0.4 : 1,
      position: 'relative',
      fontWeight: 'bold'
    };
  };

  const layerStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '12px',
    margin: '10px 0',
    padding: '10px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px'
  };

  const legendStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '4px',
    fontSize: '9px',
    marginBottom: '15px',
    padding: '8px',
    background: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '4px'
  };

  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? '#007acc' : '#333',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: '3px 3px 0 0',
    fontSize: '11px'
  });

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    marginBottom: '10px',
    gap: '2px'
  };

  const regionButtonStyle: React.CSSProperties = {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '9px',
    cursor: 'pointer',
    margin: '2px'
  };

  const statsStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#888',
    marginBottom: '10px',
    padding: '5px',
    background: '#0a0a0a',
    borderRadius: '3px'
  };

  // Calculate completion stats
  const totalBlocks = Object.values(blueprint.layers).flat().join('').replace(/O/g, '').length;
  const completedCount = completedBlocks.size;
  const completionPercentage = totalBlocks > 0 ? (completedCount / totalBlocks * 100) : 0;

  const handleBlockClick = (x: number, y: number, z: number, block: string) => {
    if (block !== 'O') {
      console.log(`Clicked block ${block} at (${x}, ${y}, ${z})`);
      // Could emit event to focus camera or highlight block
    }
  };

  const handleRegionSelect = (region: string) => {
    onRegionSelect(region);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000
        }}
        onClick={onClose}
      />
      
      {/* Blueprint Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(26, 26, 26, 0.98)',
        border: '2px solid #00ffff',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
        zIndex: 1001
      }}>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '2px solid #00ffff',
          paddingBottom: '8px'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#00ffff'
          }}>
            📐 Blueprint Viewer
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#555'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#333'}
          >
            ✕
          </button>
        </div>
      
      <div style={{ fontSize: '11px' }}>
        <div style={statsStyle}>
          Progress: {completedCount}/{totalBlocks} blocks ({completionPercentage.toFixed(1)}%)
          <div style={{
            width: '100%',
            height: '4px',
            background: '#333',
            borderRadius: '2px',
            marginTop: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${completionPercentage}%`,
              height: '100%',
              background: completionPercentage > 80 ? '#00ff44' : completionPercentage > 40 ? '#ffaa44' : '#ff4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#00ffff' }}>
            Quick Region Select:
          </div>
          <div style={{ marginBottom: '15px' }}>
            <button 
              style={regionButtonStyle}
              onClick={() => handleRegionSelect('layer_y0')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
            >
              Foundation (Y=0)
            </button>
            <button 
              style={regionButtonStyle}
              onClick={() => handleRegionSelect('layer_y1')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
            >
              Main Farm (Y=1)
            </button>
            <button 
              style={regionButtonStyle}
              onClick={() => handleRegionSelect('layer_y2')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#888'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#666'}
            >
              Redstone (Y=2)
            </button>
          </div>
        </div>

        <div style={tabsStyle}>
          {[0, 1, 2].map(layer => (
            <button
              key={layer}
              style={tabStyle(selectedLayer === layer)}
              onClick={() => setSelectedLayer(layer)}
            >
              Layer Y={layer}
            </button>
          ))}
        </div>

        <div style={layerStyle}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffff00' }}>
            Layer Y={selectedLayer} Blueprint:
          </div>
          {blueprint.layers[selectedLayer as keyof typeof blueprint.layers].map((row, z) => (
            <div key={z} style={{ marginBottom: '1px' }}>
              {row.split('').map((block, x) => (
                <span
                  key={`${x}-${z}`}
                  style={getBlockStyle(block, x, selectedLayer, z)}
                  onClick={() => handleBlockClick(x, selectedLayer, z, block)}
                  title={`${blueprint.legend[block as keyof typeof blueprint.legend]?.name || 'Unknown'} at (${x}, ${selectedLayer}, ${z})`}
                >
                  {block}
                </span>
              ))}
              <span style={{ color: '#666', fontSize: '9px', marginLeft: '8px' }}>
                Z={z}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffff00' }}>
            Block Legend:
          </div>
          <div style={legendStyle}>
            {Object.entries(blueprint.legend).map(([symbol, info]) => (
              <div key={symbol} style={legendItemStyle}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  backgroundColor: info.color,
                  color: symbol === 'O' ? '#555' : '#fff',
                  textAlign: 'center',
                  fontSize: '8px',
                  lineHeight: '12px',
                  border: '1px solid #555'
                }}>
                  {symbol}
                </span>
                <span style={{ fontSize: '8px' }}>{info.name}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default BlueprintViewer;