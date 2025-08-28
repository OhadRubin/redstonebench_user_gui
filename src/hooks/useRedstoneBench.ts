import { useState, useCallback, useRef, useEffect } from 'react';
import { BotStatus } from '../components/Manager/WorkerDashboard';
import { BotEvent } from '../components/Manager/EventLog';

interface TaskStats {
  startTime: number | null;
  endTime: number | null;
  isRunning: boolean;
  totalBlocks: number;
  completedBlocks: number;
  structuralComplete: boolean;
  functionalComplete: boolean;
  workerCount: number;
  baselineTime: number | null;
}

export interface RedstoneBenchState {
  bots: BotStatus[];
  events: BotEvent[];
  taskStats: TaskStats;
  completedBlocks: Set<[number, number, number]>; // Contract-compliant coordinate arrays [x,y,z]
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

// Contract error codes as defined in contract.md
const CONTRACT_ERROR_CODES = ['BOT_BUSY', 'INVALID_PARAMETERS', 'BOT_NOT_FOUND', 'INTERNAL_ERROR'] as const;

// Bot ID validation helper (contract specifies 0-64 range)
const isValidBotId = (botId: number): boolean => {
  return Number.isInteger(botId) && botId >= 0 && botId <= 64;
};

// Position format validation and conversion helper
const validatePosition = (position: any): [number, number, number] | null => {
  if (Array.isArray(position) && position.length >= 3) {
    const [x, y, z] = position;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
      return [x, y, z];
    }
  }
  return null;
};

export const useRedstoneBench = (websocketUrl: string = 'ws://localhost:8080') => {
  // Initialize state
  const [state, setState] = useState<RedstoneBenchState>({
    bots: [],
    events: [],
    taskStats: {
      startTime: null,
      endTime: null,
      isRunning: false,
      totalBlocks: 85, // Total blocks in sugar cane farm blueprint
      completedBlocks: 0,
      structuralComplete: false,
      functionalComplete: false,
      workerCount: 0,
      baselineTime: null
    },
    completedBlocks: new Set(),
    connectionStatus: 'disconnected'
  });

  const websocket = useRef<WebSocket | null>(null);
  const eventIdCounter = useRef(Date.now());
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);

  const queryAllBots = useCallback(() => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      // Use contract-compliant bulk status query
      websocket.current.send(JSON.stringify({
        type: 'get_status_all'
      }));
    }
  }, []);

  const startStatusPolling = useCallback((botIds: number[]) => {
    // Clear any existing polling
    if (statusPollInterval.current) {
      clearInterval(statusPollInterval.current);
    }

    // Query all bots immediately
    queryAllBots();

    // Set up polling every 1 second
    statusPollInterval.current = setInterval(() => {
      queryAllBots();
    }, 1000);

    console.log('🔄 Started status polling for bots:', botIds);
  }, [queryAllBots]);

  const stopStatusPolling = useCallback(() => {
    if (statusPollInterval.current) {
      clearInterval(statusPollInterval.current);
      statusPollInterval.current = null;
      console.log('⏹️ Stopped status polling');
    }
  }, []);

  // Handle contract-specific error codes through console logging only
  const handleContractError = useCallback((error: { code: string; message: string }, botId?: number) => {
    console.error('Contract error:', error.code, error.message, botId ? `(bot ${botId})` : '');
  }, []);

  const connectWebSocket = useCallback(() => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    try {
      const ws = new WebSocket(websocketUrl);
      websocket.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to RedstoneBench server');
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        
        // Reset reconnect attempts on successful connection
        reconnectAttempts.current = 0;
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received message from server:', JSON.stringify(data, null, 2));
          
          // Handle contract-compliant messages only
          if (data.type === 'command_response') {
            // Handle command acceptance/rejection per contract
            if (data.error && CONTRACT_ERROR_CODES.includes(data.error.code)) {
              handleContractError(data.error, data.bot_id);
            }

            const responseEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: Date.now(),
              bot_id: data.bot_id ? data.bot_id.toString() : 'system',
              type: 'command_response',
              message: data.status === 'accepted' 
                ? `Command ${data.cmd} accepted for bot ${data.bot_id}`
                : `Command ${data.cmd} rejected: ${data.error?.message || data.message || 'Unknown error'}`,
              details: data,
              errorCode: data.error?.code
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), responseEvent]
            }));
          } else if (data.type === 'status_response') {
            // Handle status response per contract
            if (!isValidBotId(data.bot_id)) {
              console.warn('⚠️ Invalid bot_id received:', data.bot_id);
              return;
            }

            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => {
                if (bot.index === data.bot_id && data.result) {
                  // Keep position as [x,y,z] array format per contract
                  let position: [number, number, number] = bot.position as [number, number, number];
                  if (data.result.bot_position) {
                    const validatedPosition = validatePosition(data.result.bot_position);
                    if (validatedPosition) {
                      position = validatedPosition;
                    }
                  }
                  
                  return {
                    ...bot,
                    position,
                    currentJob: data.result.current_job || (data.status === 'IDLE' ? 'Idle - awaiting commands' : 'Working'),
                    status: data.status === 'BUSY' ? 'BUSY' : 'IDLE',
                    lastActivity: data.result.current_job || 'Connected'
                  };
                }
                return bot;
              })
            }));
          } else if (data.type === 'status_response_all') {
            // Handle bulk status response per contract
            if (!data.bots) {
              console.warn('⚠️ status_response_all missing bots data');
              return;
            }

            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => {
                // Contract format appears to have bots as object/array - handle both cases
                let botData = null;
                if (Array.isArray(data.bots)) {
                  // If bots is an array, find by bot_id
                  botData = data.bots.find((b: any) => b.bot_id === bot.index);
                } else if (typeof data.bots === 'object') {
                  // If bots is an object, access by bot_id key
                  botData = data.bots[bot.index] || data.bots[bot.index.toString()];
                }

                if (botData && botData.result) {
                  // Keep position as [x,y,z] array format per contract
                  let position: [number, number, number] = bot.position as [number, number, number];
                  if (botData.result.bot_position) {
                    const validatedPosition = validatePosition(botData.result.bot_position);
                    if (validatedPosition) {
                      position = validatedPosition;
                    }
                  }
                  
                  return {
                    ...bot,
                    position,
                    currentJob: botData.result.current_job || (botData.status === 'IDLE' ? 'Idle - awaiting commands' : 'Working'),
                    status: botData.status === 'BUSY' ? 'BUSY' : 'IDLE',
                    lastActivity: botData.result.current_job || 'Connected'
                  };
                }
                return bot;
              })
            }));
          } else if (data.type === 'cancel_response') {
            // Handle job cancellation response per contract
            if (!isValidBotId(data.bot_id)) {
              console.warn('⚠️ Invalid bot_id received:', data.bot_id);
              return;
            }

            const cancelEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: Date.now(),
              bot_id: data.bot_id.toString(),
              type: 'cancel_response',
              message: data.success 
                ? `Job cancelled for bot ${data.bot_id}: ${data.message || 'Success'}`
                : `Cancel failed for bot ${data.bot_id}: ${data.message || 'Unknown error'}`,
              details: data
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), cancelEvent]
            }));
          } else if (['job_start', 'job_progress', 'job_complete', 'job_failed'].includes(data.type)) {
            // Handle contract-compliant job lifecycle events
            if (!isValidBotId(data.bot_id)) {
              console.warn('⚠️ Invalid bot_id received:', data.bot_id);
              return;
            }

            // Process contract-compliant job lifecycle events

            const generateEventMessage = (eventData: any) => {
              const bot = state.bots.find(b => b.index === eventData.bot_id);
              const botDisplayName = bot ? bot.id : `Bot ${eventData.bot_id}`;
              
              switch (eventData.type) {
                case 'job_start': {
                  const cmdName = eventData.command || 'unknown';
                  return `${botDisplayName} started ${cmdName}`;
                }
                case 'job_progress': {
                  const progress = eventData.result?.progress_percent;
                  const message = eventData.result?.message;
                  return `${botDisplayName} progress: ${progress}%${message ? ` - ${message}` : ''}`;
                }
                case 'job_complete': {
                  const position = eventData.result?.position;
                  return `${botDisplayName} completed job${position ? ` at [${position.join(', ')}]` : ''}`;
                }
                case 'job_failed': {
                  const reason = eventData.reason || 'Unknown error';
                  return `${botDisplayName} failed: ${reason}`;
                }
                default: return `${botDisplayName} event: ${eventData.type}`;
              }
            };

            // Update bot position if provided in result
            if (data.result?.position || data.result?.current_location) {
              const positionData = data.result.position || data.result.current_location;
              const validatedPosition = validatePosition(positionData);
              if (validatedPosition) {
                setState(prev => ({
                  ...prev,
                  bots: prev.bots.map(bot => 
                    bot.index === data.bot_id 
                      ? { ...bot, position: validatedPosition }
                      : bot
                  )
                }));
              }
            }

            const newEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: data.timestamp || Date.now(),
              bot_id: data.bot_id.toString(),
              type: data.type as BotEvent['type'],
              job_id: `job_${data.bot_id}_${Date.now()}`,
              message: data.message || generateEventMessage(data),
              details: data.result || data.error_details || data,
              errorCode: undefined
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), newEvent]
            }));
          } else {
            // Log unrecognized message types for debugging
            console.warn('⚠️ Received message type not in contract:', data.type, data);
            
            // Skip unknown message types rather than creating events for them
            console.warn('⚠️ Received message type not in contract:', data.type, data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        
        // Stop status polling when disconnected
        if (statusPollInterval.current) {
          clearInterval(statusPollInterval.current);
          statusPollInterval.current = null;
        }
        
        reconnectAttempts.current++;
        
        // Log with exponential frequency: 1, 2, 4, 8, 16, 32, 64, 128...
        if (reconnectAttempts.current === 1) {
          console.log('❌ Disconnected from RedstoneBench server - attempting to reconnect...');
        } else {
          // Check if attempt count is a power of 2 (1, 2, 4, 8, 16, 32...)
          const isPowerOfTwo = (reconnectAttempts.current & (reconnectAttempts.current - 1)) === 0;
          if (isPowerOfTwo) {
            console.log(`⚠️ Still trying to reconnect (${reconnectAttempts.current} attempts)...`);
          }
        }
        
        // Keep original 2-second reconnect (fast reconnection is desired)
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = () => {
        // Silently handle WebSocket errors to reduce console spam
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      };

    } catch (error) {
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      
      reconnectAttempts.current++;
      
      // Only log on first attempt to avoid spam
      if (reconnectAttempts.current === 1) {
        console.error('Failed to create WebSocket:', error);
      }
      
      // Keep original 2-second reconnect
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, 2000);
    }
  }, [websocketUrl, handleContractError, state.bots]);

  // Initialize WebSocket connection 
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      stopStatusPolling();
    };
  }, [connectWebSocket, stopStatusPolling]);

  // Transform client command format to contract-compliant server format
  const transformCommandForServer = useCallback((command: any) => {
    // Validate and convert bot_id
    let botId = command.bot_id || 0;
    
    // If bot_id is a string, try to find the numeric index from current bots
    if (typeof botId === 'string') {
      const bot = state.bots.find(b => b.id === botId);
      if (bot && typeof bot.index === 'number') {
        botId = bot.index;
      } else {
        // Try to parse as number
        const parsed = parseInt(botId);
        botId = isNaN(parsed) ? 0 : parsed;
      }
    }
    
    // Validate bot ID range per contract
    if (!isValidBotId(botId)) {
      throw new Error(`Invalid bot ID: ${botId}. Must be between 0 and 64.`);
    }
    
    // Contract-compliant base command structure
    const baseCommand = {
      type: "command",
      cmd: command.command,
      bot_id: botId,
      parameters: {} as any
    };

    // Handle specific command parameter transformations according to contract
    switch (command.command) {
      case 'move_to':
        // Validate coordinates
        const x = Number(command.x);
        const y = Number(command.y);
        const z = Number(command.z);
        
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          throw new Error('Invalid coordinates for move_to command. x, y, z must be numbers.');
        }
        
        return {
          ...baseCommand,
          parameters: {
            target: [x, y, z] // Contract requires [x,y,z] array format
          }
        };
      
      case 'gather':
        return {
          ...baseCommand,
          parameters: {
            resource: command.resource?.replace('minecraft:', '') || command.resource,
            quantity: command.quantity || 1,
            ...(command.region && {
              area: {
                x1: command.region.x1,
                z1: command.region.z1,
                x2: command.region.x2,
                z2: command.region.z2
              }
            })
          }
        };
      
      case 'craft':
        return {
          ...baseCommand,
          parameters: {
            item: command.item?.replace('minecraft:', '') || command.item,
            quantity: command.quantity || 1
          }
        };
      
      case 'place_blueprint':
        // Validate coordinates
        const px = Number(command.x);
        const py = Number(command.y);
        const pz = Number(command.z);
        
        if (isNaN(px) || isNaN(py) || isNaN(pz)) {
          throw new Error('Invalid coordinates for place_blueprint command. x, y, z must be numbers.');
        }
        
        return {
          ...baseCommand,
          cmd: 'place_blueprint',
          parameters: {
            block_type: command.block_type || 'stone',
            coordinates: [px, py, pz] // Contract requires [x,y,z] array format
          }
        };
      
      case 'use_chest':
        return {
          ...baseCommand,
          parameters: {
            action: command.action,
            items: command.items,
            chest_pos: command.chest_pos
          }
        };
      
      default:
        return baseCommand;
    }
  }, [state.bots]);

  const sendCommand = useCallback((command: any) => {
    try {
      if (websocket.current?.readyState === WebSocket.OPEN) {
        // Transform command to contract-compliant server format
        const serverCommand = transformCommandForServer(command);
        console.log('📤 Sending contract-compliant command:', JSON.stringify(serverCommand, null, 2));
        websocket.current.send(JSON.stringify(serverCommand));
      }

      // Commands are tracked through server responses, no local event needed


      console.log('Command sent:', command);
    } catch (error) {
      // Handle validation errors
      // Log error to console only, contract doesn't define local error events
      console.error('Failed to send command:', error instanceof Error ? error.message : error);
    }
  }, [transformCommandForServer]);

  const queryBot = useCallback((botId: string | number) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      // Convert string botId to numeric if needed
      let numericBotId = typeof botId === 'number' ? botId : 0;
      if (typeof botId === 'string') {
        const bot = state.bots.find(b => b.id === botId);
        if (bot && typeof bot.index === 'number') {
          numericBotId = bot.index;
        } else {
          const parsed = parseInt(botId);
          numericBotId = isNaN(parsed) ? 0 : parsed;
        }
      }
      
      if (!isValidBotId(numericBotId)) {
        console.warn('⚠️ Invalid bot ID for query:', botId);
        return;
      }
      
      websocket.current.send(JSON.stringify({
        type: 'get_status',
        bot_id: numericBotId
      }));
    }
  }, [state.bots]);

  const clearEventLog = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      events: []
    }));
  }, []);

  const cancelJob = useCallback((botId: string | number) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      // Convert to numeric bot ID
      let resolvedBotId = typeof botId === 'number' ? botId : 0;
      
      if (typeof botId === 'string') {
        const bot = state.bots.find(b => b.id === botId);
        if (bot && typeof bot.index === 'number') {
          resolvedBotId = bot.index;
        } else {
          const parsed = parseInt(botId);
          resolvedBotId = isNaN(parsed) ? 0 : parsed;
        }
      }

      if (!isValidBotId(resolvedBotId)) {
        console.warn('⚠️ Invalid bot ID for cancel:', botId);
        return;
      }

      const cancelMessage = {
        type: 'cancel_job',
        bot_id: resolvedBotId
      };

      websocket.current.send(JSON.stringify(cancelMessage));
      console.log('Cancel job message sent:', cancelMessage);

      // Add local event for immediate feedback
      // Cancel requests are tracked through server responses, no local event needed
    }
  }, [state.bots]);

  // Initialize bots manually (since connection_established is non-contract)
  const initializeBots = useCallback((botCount: number = 4) => {
    const newBots: BotStatus[] = Array.from({ length: Math.min(botCount, 65) }, (_, i) => ({
      id: `worker_${i}`, // String ID for display
      index: i, // Numeric index for contract communication
      position: [0, 64, 0] as [number, number, number], // Contract-compliant [x, y, z] format
      inventory: {},
      currentJob: 'Idle - awaiting commands',
      status: 'IDLE' as const,
      lastActivity: 'Connected',
      utilization: 0,
      lastLog: 'Bot connected and ready',
      health: undefined,
      food: undefined,
      currentJobProgress: undefined
    }));

    setState(prev => ({
      ...prev,
      bots: newBots,
      taskStats: { ...prev.taskStats, workerCount: newBots.length }
    }));

    // Start polling for bot status updates
    const botIds = newBots.map(bot => bot.index);
    startStatusPolling(botIds);

    console.log('🤖 Initialized bots:', newBots.map(b => `${b.id} (ID: ${b.index})`));
  }, [startStatusPolling]);

  const resetTask = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      taskStats: {
        ...prevState.taskStats,
        startTime: null,
        endTime: null,
        isRunning: false,
        completedBlocks: 0,
        structuralComplete: false,
        functionalComplete: false
      },
      completedBlocks: new Set(),
      events: [],
      bots: prevState.bots.map(bot => ({
        ...bot,
        status: 'IDLE',
        currentJob: 'Idle - awaiting commands',
        lastActivity: 'Reset to spawn',
        position: [0, 64, 0] as [number, number, number],
        inventory: {},
        utilization: 0,
        health: undefined,
        food: undefined,
        currentJobProgress: undefined
      }))
    }));
  }, []);


  return {
    ...state,
    actions: {
      sendCommand,
      queryBot,
      clearEventLog,
      cancelJob,
      resetTask,
      initializeBots
    }
  };
};