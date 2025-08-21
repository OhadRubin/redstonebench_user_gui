import React, { useRef, useEffect, useState } from 'react';
import { BotStatus } from './WorkerDashboard';

// Shared world bounds constants
export const WORLD_BOUNDS = { minX: -500, maxX: 500, minZ: -500, maxZ: 500 };

interface BotCanvasProps {
  bots: BotStatus[];
  selectedBot?: BotStatus | null;
  onBotSelect?: (bot: BotStatus) => void;
  viewport?: { x: number; y: number; zoom: number };
  onViewportChange?: (viewport: { x: number; y: number; zoom: number; width: number; height: number }) => void;
}

const BotCanvas: React.FC<BotCanvasProps> = ({ bots, selectedBot, onBotSelect, viewport: propViewport, onViewportChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport state for panning and zooming
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // Helper compare with small epsilon for floats
  const sameViewport = (a: {x:number;y:number;zoom:number}, b: {x:number;y:number;zoom:number}) => {
    const eps = 1e-6;
    return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.zoom - b.zoom) < eps;
  };

  // Sync internal viewport state with prop, but only if values changed
  useEffect(() => {
    if (propViewport && !sameViewport(propViewport, viewport)) {
      setViewport(propViewport);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propViewport?.x, propViewport?.y, propViewport?.zoom]);

  // Notify parent of viewport changes with canvas dimensions (throttled + deduped)
  const lastSentRef = useRef<{x:number;y:number;zoom:number;width:number;height:number}|null>(null);
  const rafIdRef = useRef<number | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !onViewportChange) return;

    // Use CSS pixel dimensions for reporting to parent (not internal DPR-scaled size)
    const displayWidth = Math.round(container.clientWidth);
    const displayHeight = Math.round(container.clientHeight);

    // Quantize values to avoid subpixel churn
    const payload = {
      x: Math.round(viewport.x * 100) / 100, // 0.01 precision
      y: Math.round(viewport.y * 100) / 100,
      zoom: Math.round(viewport.zoom * 10000) / 10000, // 4 dp for zoom
      width: displayWidth,
      height: displayHeight
    };

    const sendIfChanged = () => {
      const last = lastSentRef.current;
      const changed = !last ||
        last.x !== payload.x ||
        last.y !== payload.y ||
        last.zoom !== payload.zoom ||
        last.width !== payload.width ||
        last.height !== payload.height;
      if (changed) {
        lastSentRef.current = payload;
        onViewportChange(payload);
      }
      rafIdRef.current = null;
    };

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(sendIfChanged);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [viewport, onViewportChange]);

  // Separate useEffect for canvas sizing to prevent resize loops
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      // Get device pixel ratio for high-DPI display support
      const dpr = window.devicePixelRatio || 1;
      
      // Use client dimensions (content box) to avoid border-included rounding
      const displayWidth = Math.round(container.clientWidth);
      const displayHeight = Math.round(container.clientHeight);
      
      // Calculate internal canvas dimensions with device pixel ratio scaling
      const canvasWidth = Math.round(displayWidth * dpr);
      const canvasHeight = Math.round(displayHeight * dpr);
      
      // Only update if size actually changed to prevent unnecessary re-renders
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        // Set internal canvas dimensions (actual rendering surface)
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Set CSS dimensions (display size)
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Normalize transform so 1 unit = 1 CSS pixel
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
    };

    // Initial sizing
    updateCanvasSize();

    // Use ResizeObserver for efficient resize handling
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Separate useEffect for drawing logic - no mousePos dependency
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use canvas rect for exact CSS pixel size
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Ensure base transform is normalized per frame and clear in CSS pixels
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Apply viewport transformation using display dimensions (center-based)
    ctx.save();
    ctx.translate(displayWidth / 2, displayHeight / 2);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-viewport.x, -viewport.y);

    // Draw terrain-like background
    const terrainSize = 60;
    
    // Calculate world bounds that will fill the canvas regardless of zoom level
    const worldHalfWidth = displayWidth / (2 * viewport.zoom);
    const worldHalfHeight = displayHeight / (2 * viewport.zoom);
    const worldMinX = viewport.x - worldHalfWidth;
    const worldMaxX = viewport.x + worldHalfWidth;
    const worldMinY = viewport.y - worldHalfHeight;
    const worldMaxY = viewport.y + worldHalfHeight;
    
    const offsetX = Math.floor(worldMinX / terrainSize) * terrainSize;
    const offsetY = Math.floor(worldMinY / terrainSize) * terrainSize;
    
    // Create a Minecraft-like world background
    for (let x = offsetX - terrainSize; x <= worldMaxX + terrainSize; x += terrainSize) {
      for (let y = offsetY - terrainSize; y <= worldMaxY + terrainSize; y += terrainSize) {
        // Vary terrain types based on position
        const hash = Math.abs(Math.sin(x * 0.01) * Math.cos(y * 0.01) * 1000);
        // const terrainType = Math.floor(hash % 3);
        const terrainType = 0;
        
        if (terrainType === 0) {
          // Grass terrain
          ctx.fillStyle = '#2d5a27';
        } else if (terrainType === 1) {
          // Stone terrain
          ctx.fillStyle = '#4a4a4a';
        } else {
          // Dirt terrain
          ctx.fillStyle = '#8b4513';
        }
        
        ctx.fillRect(x, y, terrainSize, terrainSize);
        
        // Add texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(x, y, terrainSize, terrainSize / 8);
        ctx.fillRect(x, y + terrainSize * 7/8, terrainSize, terrainSize / 8);
      }
    }

    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / viewport.zoom;
    const gridSize = 20;
    
    const gridOffsetX = Math.floor(worldMinX / gridSize) * gridSize;
    const gridOffsetY = Math.floor(worldMinY / gridSize) * gridSize;
    
    for (let x = gridOffsetX - gridSize; x <= worldMaxX + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, worldMinY - gridSize);
      ctx.lineTo(x, worldMaxY + gridSize);
      ctx.stroke();
    }
    
    for (let y = gridOffsetY - gridSize; y <= worldMaxY + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(worldMinX - gridSize, y);
      ctx.lineTo(worldMaxX + gridSize, y);
      ctx.stroke();
    }

    // Draw bots as units in the world
    bots.forEach((bot) => {
      const worldX = bot.position.x * 5; // Scale up for better visibility
      const worldZ = bot.position.y * 5; // Using y coordinate (which contains the original z) for 2D view

      // Bot body
      const isSelected = selectedBot?.id === bot.id;
      const size = isSelected ? 16 : 12;
      
      // Bot color based on team/status
      let botColor = '#3B82F6'; // Blue for player bots
      if (bot.status === 'FAILED') botColor = '#EF4444';
      else if (bot.status === 'BLOCKED') botColor = '#F59E0B';
      else if (bot.status === 'COMPLETE') botColor = '#10B981';

      // Draw bot shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(worldX - size/2 + 2, worldZ - size/2 + 2, size, size);

      // Draw selection ring
      if (isSelected) {
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 3 / viewport.zoom;
        ctx.strokeRect(worldX - size/2 - 4, worldZ - size/2 - 4, size + 8, size + 8);
      }

      // Draw bot as a square (like Minecraft)
      ctx.fillStyle = botColor;
      ctx.fillRect(worldX - size/2, worldZ - size/2, size, size);
      
      // Add bot face/details
      ctx.fillStyle = '#fff';
      ctx.fillRect(worldX - 2, worldZ - 4, 2, 2); // Eyes
      ctx.fillRect(worldX + 1, worldZ - 4, 2, 2);
      ctx.fillRect(worldX - 1, worldZ - 1, 2, 1); // Mouth

      // Bot ID label (scale with zoom)
      const fontSize = Math.max(10, 12 / viewport.zoom);
      ctx.fillStyle = '#fff';
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.strokeText(`Bot ${bot.id}`, worldX, worldZ + size + fontSize);
      ctx.fillText(`Bot ${bot.id}`, worldX, worldZ + size + fontSize);

      // Draw activity indicator
      if (bot.currentJob && bot.status === 'IN_PROGRESS') {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(worldX + size/2, worldZ - size/2, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.restore();

    // Draw viewport coordinates only (not mouse coordinates to prevent re-renders)
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Viewport: x:${Math.round(viewport.x)}, y:${Math.round(viewport.y)}, zoom:${viewport.zoom.toFixed(2)}`, 10, 20);

  }, [bots, selectedBot, viewport]); // Removed mousePos from dependencies to prevent jitter

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const canvasX = screenX - rect.left - displayWidth / 2;
    const canvasY = screenY - rect.top - displayHeight / 2;
    
    return {
      x: viewport.x + canvasX / viewport.zoom,
      y: viewport.y + canvasY / viewport.zoom
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 0) { // Left click
      const worldPos = screenToWorld(event.clientX, event.clientY);
      
      // Check if clicking on a bot
      let clickedBot = null;
      for (const bot of bots) {
        const worldX = bot.position.x * 5;
        const worldZ = bot.position.y * 5; // Using y coordinate (which contains the original z) for 2D view
        const distance = Math.sqrt(
          Math.pow(worldPos.x - worldX, 2) + Math.pow(worldPos.y - worldZ, 2)
        );
        
        if (distance <= 20) { // Click tolerance
          clickedBot = bot;
          break;
        }
      }
      
      if (clickedBot && onBotSelect) {
        onBotSelect(clickedBot);
      } else {
        // Start panning
        setIsPanning(true);
        setLastPanPoint({ x: event.clientX, y: event.clientY });
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(event.clientX, event.clientY);
    setMouseWorldPos(worldPos);
    
    if (isPanning) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      
      setViewport(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.zoom,
        y: prev.y - deltaY / prev.zoom
      }));
      
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));
    
    setViewport(prev => ({
      ...prev,
      zoom: newZoom
    }));
  };

  const resetViewport = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        background: `
          radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%),
          linear-gradient(45deg, transparent 30%, rgba(0,255,255,0.05) 50%, transparent 70%)
        `,
        border: '2px solid #00ffff',
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: 0, // Allow container to shrink below content size
        maxHeight: '100%', // Prevent container from growing beyond parent
        contain: 'layout paint size' // Isolate layout to prevent upstream jitter
      }}
    >
      {/* Bot count and viewport info */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff44',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 10,
        fontFamily: "'Courier New', monospace"
      }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '4px' }}>
          🎯 Battlefield View
        </div>
        <div>{bots.length} Bots Active</div>
        <div>Zoom: {viewport.zoom.toFixed(2)}x</div>
      </div>

      {/* Viewport controls */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '8px',
        borderRadius: '8px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={resetViewport}
          style={{
            background: 'rgba(0, 255, 255, 0.2)',
            color: '#00ffff',
            border: '1px solid #00ffff',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)'}
        >
          🏠 Reset View
        </button>
      </div>

      {/* Mouse coordinates overlay - separate from canvas to prevent re-renders */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#888',
        padding: '6px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontFamily: 'monospace',
        zIndex: 10
      }}>
        Mouse: {Math.round(mouseWorldPos.x)}, {Math.round(mouseWorldPos.y)}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '10px',
        zIndex: 10,
        fontFamily: "'Courier New', monospace"
      }}>
        <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#00ffff' }}>🔧 Bot Status:</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: '#3B82F6' }} />
            <span>Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: '#10B981' }} />
            <span>Complete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: '#F59E0B' }} />
            <span>Blocked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: '#EF4444' }} />
            <span>Failed</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#888',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '10px',
        zIndex: 10,
        fontFamily: "'Courier New', monospace"
      }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '4px' }}>
          ⌨️ Controls:
        </div>
        <div>🖱️ Click bots to select</div>
        <div>🖱️ Drag to pan</div>
        <div>🔍 Scroll to zoom</div>
      </div>
    </div>
  );
};

export default BotCanvas;
