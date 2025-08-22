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
  completedBlocks: Set<string>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

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
      // Use server's get_status format to get all workers
      websocket.current.send(JSON.stringify({
        type: 'get_status'
      }));
    }
  }, []);

  const startStatusPolling = useCallback((botIds: (string | number)[]) => {
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
          
          if (data.type === 'connection_established') {
            // Handle connection_established message with workers_available IDs
            if (data.workers_available && Array.isArray(data.workers_available)) {
              // Protocol V2: workers_available is array of {index, botId} objects
              // Protocol V1: workers_available is array of botId strings
              const isProtocolV2 = data.workers_available.length > 0 && 
                                   typeof data.workers_available[0] === 'object' && 
                                   'index' in data.workers_available[0];
              
              const newBots: BotStatus[] = data.workers_available.map((worker: any) => {
                const botId = isProtocolV2 ? worker.botId : worker;
                const index = isProtocolV2 ? worker.index : parseInt(botId.split('_')[1]) || 0;
                
                return {
                  id: botId, // Keep as string (e.g., "worker_0") for display
                  index: index, // Numeric index for Protocol V2 communication
                  position: { x: 0, y: 0, z: 64 }, // x=x, y=z (for 2D view), z=y
                  inventory: {},
                  currentJob: 'Querying status...',
                  status: 'IDLE' as const,
                  lastActivity: 'Connected',
                  utilization: 0
                };
              });

              setState(prev => ({
                ...prev,
                bots: newBots,
                taskStats: { ...prev.taskStats, workerCount: newBots.length }
              }));

              // Log protocol version detected
              const protocolVersion = data.server_info?.protocol_version || (isProtocolV2 ? 2 : 1);
              console.log(`🔗 Protocol V${protocolVersion} detected`, {
                protocolVersion,
                aliases: data.server_info?.aliases,
                capabilities: data.server_info?.capabilities
              });

              // Start polling for bot status updates with proper format
              const botIdentifiers = isProtocolV2 ? 
                data.workers_available.map((w: any) => w.index) : 
                data.workers_available;
              startStatusPolling(botIdentifiers);
            }
          } else if (data.type === 'bot_status_update') {
            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => {
                // Protocol V2 uses numeric bot_id, V1 uses string bot_id
                const matchesBot = typeof data.bot_id === 'number' 
                  ? bot.index === data.bot_id 
                  : bot.id === data.bot_id;
                
                return matchesBot ? {
                  ...bot,
                  position: data.position || bot.position,
                  inventory: data.inventory || bot.inventory,
                  currentJob: data.current_job || bot.currentJob,
                  status: data.status || bot.status,
                  lastActivity: data.last_activity || bot.lastActivity,
                  utilization: data.utilization || bot.utilization
                } : bot;
              })
            }));
          } else if (data.type === 'start' || data.type === 'progress' || data.type === 'complete' || data.type === 'failed') {
            // Handle server's worker event format (lowercase types)
            const eventTypeMap: {[key: string]: string} = {
              'start': 'START',
              'progress': 'PROGRESS', 
              'complete': 'COMPLETE',
              'failed': 'FAILED'
            };

            const generateEventMessage = (eventData: any) => {
              // Protocol V2 uses numeric bot_id, find display name
              const bot = state.bots.find(b => 
                typeof eventData.bot_id === 'number' ? b.index === eventData.bot_id : b.id === eventData.bot_id
              );
              const botDisplayName = bot ? bot.id : `Worker ${eventData.bot_id}`;
              const jobId = eventData.job_id;
              
              switch (eventData.type) {
                case 'start': {
                  // Protocol V2: command is string; V1: command is object with cmd property
                  const cmdName = typeof eventData.command === 'string' 
                    ? eventData.command 
                    : eventData.command?.cmd || 'unknown';
                  return `${botDisplayName} started ${cmdName} (${jobId})`;
                }
                case 'progress': return `${botDisplayName} making progress on ${jobId}`;
                case 'complete': return `${botDisplayName} completed ${jobId}`;
                case 'failed': return `${botDisplayName} failed ${jobId}: ${eventData.error?.message || 'Unknown error'}`;
                default: return `${botDisplayName} event: ${eventData.type}`;
              }
            };

            const newEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: data.timestamp || Date.now(),
              botId: typeof data.bot_id === 'number' ? data.bot_id.toString() : data.bot_id,
              type: eventTypeMap[data.type] || data.type.toUpperCase(),
              jobId: data.job_id,
              message: data.message || generateEventMessage(data),
              details: data.result || data.error || data.current,
              errorCode: data.error?.code
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), newEvent]
            }));
          } else if (data.type === 'worker_list') {
            const newBots: BotStatus[] = data.workers.map((worker: any) => ({
              id: worker.id,
              position: worker.position || { x: 0, y: 0, z: 64 }, // x=x, y=z (for 2D view), z=y
              inventory: worker.inventory || {},
              currentJob: worker.current_job || 'Idle',
              status: worker.status || 'IDLE',
              lastActivity: worker.last_activity || 'Connected',
              utilization: worker.utilization || 0
            }));

            setState(prev => ({
              ...prev,
              bots: newBots,
              taskStats: { ...prev.taskStats, workerCount: newBots.length }
            }));
          } else if (data.type === 'block_completed') {
            const blockKey = `${data.x},${data.y},${data.z}`;
            setState(prev => ({
              ...prev,
              completedBlocks: new Set([...Array.from(prev.completedBlocks), blockKey])
            }));
          } else if (data.status === 'success' && data.data && data.data.workers) {
            // Handle server's status response format: {status: "success", data: {workers: [...]}}
            const workers = data.data.workers;
            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => {
                // Protocol V2 uses numeric worker.id, V1 uses string worker.id
                const serverWorker = workers.find((w: any) => 
                  typeof w.id === 'number' ? w.id === bot.index : w.id === bot.id
                );
                if (serverWorker) {
                  // Convert position array [x, y, z] to object {x, y} (using x and z for 2D view)
                  let position = bot.position;
                  if (serverWorker.position && Array.isArray(serverWorker.position) && serverWorker.position.length >= 3) {
                    position = { x: serverWorker.position[0], y: serverWorker.position[2], z: serverWorker.position[1] };
                  } else if (serverWorker.position && typeof serverWorker.position === 'object') {
                    position = serverWorker.position;
                  }

                  return {
                    ...bot,
                    position,
                    inventory: serverWorker.inventory || bot.inventory,
                    currentJob: serverWorker.current_job || (serverWorker.status === 'IDLE' ? 'Idle - awaiting commands' : 'Working'),
                    status: serverWorker.status === 'BUSY' ? 'IN_PROGRESS' : 'IDLE',
                    lastActivity: serverWorker.current_job || 'Connected',
                    utilization: serverWorker.utilization || 0
                  };
                }
                return bot;
              }),
              taskStats: {
                ...prev.taskStats,
                isRunning: data.data.task_active || false,
                startTime: data.data.start_time || prev.taskStats.startTime
              }
            }));
          } else if (data.status === 'accepted' || data.status === 'rejected') {
            // Handle Protocol V2 command acknowledgments
            const ackEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: Date.now(),
              botId: data.data?.job_id || 'system',
              type: data.status.toUpperCase(),
              jobId: data.data?.job_id || 'unknown',
              message: data.status === 'accepted' 
                ? `Command accepted (Job: ${data.data?.job_id})`
                : `Command rejected: ${data.message || 'Unknown error'}`,
              details: data
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), ackEvent]
            }));
          } else if ((data.status === 'success' || data.status === 'error') && !data.data?.workers) {
            // Handle Protocol V2 control responses (start/stop/reset operations)
            const controlEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: Date.now(),
              botId: 'system',
              type: data.status.toUpperCase(),
              jobId: 'control',
              message: data.message || `Control operation ${data.status}`,
              details: data
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), controlEvent]
            }));
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
  }, [websocketUrl]);


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

  // Transform client command format to server format
  const transformCommandForServer = useCallback((command: any) => {
    // For Protocol V2, prefer numeric index if available; fallback to string bot_id
    let botId = command.bot_id || 0;
    
    // If bot_id is a string, try to find the numeric index from current bots
    if (typeof botId === 'string') {
      const bot = state.bots.find(b => b.id === botId);
      if (bot) {
        botId = bot.index; // Use numeric index for Protocol V2
      }
    }
    
    // Handle Protocol V2 aliases
    let commandType = command.command;
    if (commandType === 'place_blueprint') {
      commandType = 'place_block'; // Protocol V2 alias: place_blueprint → place_block
    }
    
    const baseCommand = {
      type: commandType,
      bot_id: botId,
      job_id: `gui_job_${Date.now()}`
    };

    // Handle specific command transformations
    switch (command.command) {
      case 'move_to':
        return {
          ...baseCommand,
          target: {
            x: command.x,
            y: command.y, 
            z: command.z
          }
        };
      
      case 'gather':
        return {
          ...baseCommand,
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
        };
      
      case 'craft':
        return {
          ...baseCommand,
          item: command.item?.replace('minecraft:', '') || command.item,
          quantity: command.quantity || 1
        };
      
      case 'place_blueprint':
        return {
          ...baseCommand,
          type: 'place_block', // Server uses place_block
          block_type: command.block_type || 'stone',
          coordinates: {
            x: command.x,
            y: command.y,
            z: command.z
          }
        };
      
      case 'use_chest':
        // Transform chest command if needed
        return {
          ...baseCommand,
          action: command.action,
          items: command.items,
          chest_pos: command.chest_pos
        };
      
      default:
        return baseCommand;
    }
  }, [state.bots]);

  const sendCommand = useCallback((command: any) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      // Transform command to server format
      const serverCommand = transformCommandForServer(command);
      websocket.current.send(JSON.stringify(serverCommand));
    }

    // Add local event for immediate feedback
    const newEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: command.bot_id,
      type: 'COMMAND_SENT',
      message: `Sent ${command.command} command to Bot ${command.bot_id}`,
      details: command
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, newEvent]
    }));

    // If not connected, simulate response (for test mode)
    if (!websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
      setTimeout(() => {
        const responseEvent: BotEvent = {
          id: (++eventIdCounter.current).toString(),
          timestamp: Date.now(),
          botId: command.bot_id,
          type: 'START',
          jobId: `job_${Date.now()}`,
          message: `Bot ${command.bot_id} started executing ${command.command} (test mode)`
        };

        setState(prevState => ({
          ...prevState,
          events: [...prevState.events, responseEvent],
          bots: prevState.bots.map(bot => 
            bot.id === command.bot_id 
              ? { 
                  ...bot, 
                  status: 'IN_PROGRESS', 
                  currentJob: `Executing ${command.command}`,
                  lastActivity: `Started ${command.command}`
                }
              : bot
          )
        }));
      }, 1000 + Math.random() * 2000);
    }

    console.log('Command sent:', command);
  }, []);

  const queryBot = useCallback((_botId: string) => {
    // Use get_status instead of individual bot queries
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify({
        type: 'get_status'
      }));
    }
  }, []);

  const clearEventLog = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      events: []
    }));
  }, []);

  const startTask = useCallback(() => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify({
        type: 'start_task',
        timestamp: Date.now()
      }));
    }

    setState(prevState => ({
      ...prevState,
      taskStats: {
        ...prevState.taskStats,
        startTime: Date.now(),
        endTime: null,
        isRunning: true
      }
    }));

    const startEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: 'system', // System event
      type: 'START',
      message: 'Task started: Build Sugar Cane Farm'
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, startEvent]
    }));
  }, []);

  const stopTask = useCallback(() => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify({
        type: 'stop_task',
        timestamp: Date.now()
      }));
    }

    setState(prevState => ({
      ...prevState,
      taskStats: {
        ...prevState.taskStats,
        endTime: Date.now(),
        isRunning: false
      }
    }));

    const stopEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: 'system', // System event
      type: 'COMPLETE',
      message: 'Task stopped by manager'
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, stopEvent]
    }));
  }, []);

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
        position: { x: 0, y: 64, z: 0 },
        inventory: {},
        utilization: 0
      }))
    }));
  }, []);

  const runFunctionalTest = useCallback(() => {
    const testEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: 'system', // System event
      type: 'START',
      message: 'Running functional test: Accelerating game time and checking sugar cane output...'
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, testEvent]
    }));

    // Simulate functional test result after 3 seconds
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3; // 70% success rate for demo
      const resultEvent: BotEvent = {
        id: (++eventIdCounter.current).toString(),
        timestamp: Date.now(),
        botId: 'system',
        type: isSuccess ? 'COMPLETE' : 'FAILED',
        message: isSuccess 
          ? 'Functional test PASSED: Sugar cane farm produced 24 items in output chest'
          : 'Functional test FAILED: No sugar cane detected in output chest',
        errorCode: isSuccess ? undefined : 'FUNCTIONAL_TEST_FAILED'
      };

      setState(prevState => ({
        ...prevState,
        events: [...prevState.events, resultEvent],
        taskStats: {
          ...prevState.taskStats,
          functionalComplete: isSuccess
        }
      }));
    }, 3000);
  }, []);

  const selectBlueprintRegion = useCallback((region: string) => {
    const regionEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: 'system',
      type: 'COMMAND_SENT',
      message: `Selected blueprint region: ${region} for construction planning`
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, regionEvent]
    }));
  }, []);

  return {
    ...state,
    actions: {
      sendCommand,
      queryBot,
      clearEventLog,
      startTask,
      stopTask,
      resetTask,
      runFunctionalTest,
      selectBlueprintRegion
    }
  };
};