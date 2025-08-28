import React, { useRef, useEffect } from 'react';
import { BotStatus } from './WorkerDashboard';
import { WORLD_BOUNDS } from './BotCanvas';

interface MinimapProps {
  bots: BotStatus[];
  selectedBot?: BotStatus | null;
  viewport?: { x: number; y: number; zoom: number };
  mainCanvasDimensions?: { width: number; height: number };
  onMinimapClick?: (worldX: number, worldY: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({ 
  bots, 
  selectedBot, 
  viewport = { x: 0, y: 0, zoom: 1 },
  mainCanvasDimensions = { width: 800, height: 600 },
  onMinimapClick 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use shared world bounds from BotCanvas
  const minimapSize = 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = minimapSize;
    canvas.height = minimapSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling
    const worldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    const scaleX = canvas.width / worldWidth;
    const scaleY = canvas.height / worldHeight;

    // Draw world background with terrain-like pattern
    const terrainTileSize = 20;
    for (let x = 0; x < canvas.width; x += terrainTileSize) {
      for (let y = 0; y < canvas.height; y += terrainTileSize) {
        // Convert canvas coords back to world coords for consistent terrain
        const worldX = (x / scaleX) + WORLD_BOUNDS.minX;
        const worldY = (y / scaleY) + WORLD_BOUNDS.minZ;
        
        // Same terrain generation logic as BotCanvas
        const hash = Math.abs(Math.sin(worldX * 0.01) * Math.cos(worldY * 0.01) * 1000);
        const terrainType = Math.floor(hash % 3);
        
        if (terrainType === 0) {
          ctx.fillStyle = '#1a3d17'; // Dark grass
        } else if (terrainType === 1) {
          ctx.fillStyle = '#2a2a2a'; // Dark stone
        } else {
          ctx.fillStyle = '#5a2f0a'; // Dark dirt
        }
        
        ctx.fillRect(x, y, terrainTileSize, terrainTileSize);
      }
    }

    // Add fog of war effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw explored area (simplified as central region)
    const exploredRadius = Math.min(canvas.width, canvas.height) * 0.3;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, exploredRadius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bots on minimap
    bots.forEach(bot => {
      const botWorldX = bot.position[0] * 5; // Same scaling as BotCanvas ([x, y, z] array format)
      const botWorldZ = bot.position[2] * 5; // Using z coordinate from [x, y, z] array
      
      // Convert world coordinates to minimap coordinates
      const minimapX = ((botWorldX - WORLD_BOUNDS.minX) / worldWidth) * canvas.width;
      const minimapY = ((botWorldZ - WORLD_BOUNDS.minZ) / worldHeight) * canvas.height;

      // Bot color based on status
      let botColor = '#3B82F6'; // Blue for active
      if (bot.status === 'BUSY') botColor = '#00AAFF'; // Contract-compliant: BUSY status

      // Draw bot
      const isSelected = selectedBot?.id === bot.id;
      const botSize = isSelected ? 4 : 2;
      
      if (isSelected) {
        // Draw selection ring
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(minimapX, minimapY, botSize + 2, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.fillStyle = botColor;
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, botSize, 0, 2 * Math.PI);
      ctx.fill();

      // Add white outline for visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw viewport indicator using main canvas dimensions
    if (viewport) {
      // Calculate what portion of the world is visible in main canvas
      const worldVisibleWidth = mainCanvasDimensions.width / viewport.zoom;
      const worldVisibleHeight = mainCanvasDimensions.height / viewport.zoom;
      
      // Map viewport center to minimap coordinates
      const viewportCenterX = ((viewport.x - WORLD_BOUNDS.minX) / worldWidth) * canvas.width;
      const viewportCenterY = ((viewport.y - WORLD_BOUNDS.minZ) / worldHeight) * canvas.height;
      
      // Calculate viewport rectangle size on minimap
      const minimapRectWidth = (worldVisibleWidth / worldWidth) * canvas.width;
      const minimapRectHeight = (worldVisibleHeight / worldHeight) * canvas.height;
      
      const viewportRectX = viewportCenterX - minimapRectWidth / 2;
      const viewportRectY = viewportCenterY - minimapRectHeight / 2;
      
      // Draw viewport rectangle
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(viewportRectX, viewportRectY, minimapRectWidth, minimapRectHeight);
      ctx.setLineDash([]);
      
      // Add subtle fill
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.fillRect(viewportRectX, viewportRectY, minimapRectWidth, minimapRectHeight);
    }

    // Draw border
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

  }, [bots, selectedBot, viewport, mainCanvasDimensions]);

  const handleMinimapClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMinimapClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert click coordinates to world coordinates
    const worldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    
    const worldX = WORLD_BOUNDS.minX + (clickX / canvas.width) * worldWidth;
    const worldY = WORLD_BOUNDS.minZ + (clickY / canvas.height) * worldHeight;

    onMinimapClick(worldX, worldY);
  };

  return (
    <div style={{ width: '200px' }}>
      <div style={{
        background: 'linear-gradient(to bottom, #111 0%, #000 100%)',
        border: '2px solid #00ffff',
        borderRadius: '8px',
        padding: '8px'
      }}>
        {/* Header */}
        <div style={{
          color: '#00ffff',
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '8px',
          textAlign: 'center',
          fontFamily: "'Courier New', monospace"
        }}>
          🗺️ Tactical Overview
        </div>

        {/* Canvas container */}
        <div 
          ref={containerRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px'
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleMinimapClick}
            style={{
              cursor: 'crosshair',
              border: '1px solid #333'
            }}
          />
        </div>

        {/* Info */}
        <div style={{
          fontSize: '10px',
          color: '#888',
          textAlign: 'center',
          fontFamily: "'Courier New', monospace"
        }}>
          <div style={{ color: '#00ffff', marginBottom: '2px' }}>
            📊 {bots.length} bots deployed
          </div>
          <div>Click to navigate</div>
        </div>

        {/* Legend */}
        <div style={{
          marginTop: '8px',
          fontSize: '9px',
          color: '#aaa',
          fontFamily: "'Courier New', monospace"
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            fontSize: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', background: '#3B82F6', borderRadius: '50%' }} />
              <span>Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%' }} />
              <span>Done</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', background: '#F59E0B', borderRadius: '50%' }} />
              <span>Blocked</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', background: '#EF4444', borderRadius: '50%' }} />
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Minimap;