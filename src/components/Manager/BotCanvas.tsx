import React, { useRef, useEffect } from 'react';
import { BotStatus } from './WorkerDashboard';

interface BotCanvasProps {
  bots: BotStatus[];
  selectedBot?: BotStatus | null;
  onBotSelect?: (bot: BotStatus) => void;
}

const BotCanvas: React.FC<BotCanvasProps> = ({ bots, selectedBot, onBotSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('BotCanvas - useEffect triggered', {
      botsCount: bots.length,
      bots: bots,
      selectedBotId: selectedBot?.id
    });

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      console.log('BotCanvas - Missing canvas or container');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('BotCanvas - Could not get canvas context');
      return;
    }

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Calculate bot positions (scale world coords to canvas)
    const worldBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const scaleX = canvas.width / (worldBounds.maxX - worldBounds.minX);
    const scaleZ = canvas.height / (worldBounds.maxZ - worldBounds.minZ);

    // Draw bots
    console.log('BotCanvas - About to draw bots:', {
      botsCount: bots.length,
      worldBounds,
      scaleX,
      scaleZ,
      canvasSize: { width: canvas.width, height: canvas.height }
    });

    bots.forEach((bot, index) => {
      console.log(`BotCanvas - Drawing bot ${index}:`, bot);
      
      const canvasX = (bot.position.x - worldBounds.minX) * scaleX;
      const canvasZ = (bot.position.z - worldBounds.minZ) * scaleZ;

      console.log(`BotCanvas - Bot ${bot.id} canvas position:`, { canvasX, canvasZ });

      // Bot body
      const isSelected = selectedBot?.id === bot.id;
      const radius = isSelected ? 12 : 8;
      
      // Bot color based on team/status
      let botColor = '#3B82F6'; // Blue for player bots
      if (bot.status === 'FAILED') botColor = '#EF4444';
      else if (bot.status === 'BLOCKED') botColor = '#F59E0B';
      else if (bot.status === 'COMPLETE') botColor = '#10B981';

      // Draw selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(canvasX, canvasZ, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw bot
      ctx.beginPath();
      ctx.arc(canvasX, canvasZ, radius, 0, 2 * Math.PI);
      ctx.fillStyle = botColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bot ID label
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${bot.id}`, canvasX, canvasZ + 4);

      // Draw position trail/path
      ctx.beginPath();
      ctx.arc(canvasX, canvasZ, radius + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = botColor + '40';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw coordinate system
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`World: ${worldBounds.minX},${worldBounds.minZ} to ${worldBounds.maxX},${worldBounds.maxZ}`, 10, 20);

  }, [bots, selectedBot]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onBotSelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Find clicked bot
    const worldBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const scaleX = canvas.width / (worldBounds.maxX - worldBounds.minX);
    const scaleZ = canvas.height / (worldBounds.maxZ - worldBounds.minZ);

    for (const bot of bots) {
      const canvasX = (bot.position.x - worldBounds.minX) * scaleX;
      const canvasZ = (bot.position.z - worldBounds.minZ) * scaleZ;
      
      const distance = Math.sqrt(
        Math.pow(clickX - canvasX, 2) + Math.pow(clickY - canvasZ, 2)
      );

      if (distance <= 15) { // Click tolerance
        onBotSelect(bot);
        return;
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
        border: '1px solid #333',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >


      {/* Bot count indicator */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#00ff44',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 10
      }}>
        {bots.length} Bots Active
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '8px',
        borderRadius: '6px',
        fontSize: '10px',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#00ffff' }}>Legend:</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
            <span>Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span>Complete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
            <span>Blocked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            <span>Failed</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#888',
        padding: '6px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        zIndex: 10
      }}>
        Click bots to select
      </div>
    </div>
  );
};

export default BotCanvas;