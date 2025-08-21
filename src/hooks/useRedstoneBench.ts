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

  const connectWebSocket = useCallback(() => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    try {
      const ws = new WebSocket(websocketUrl);
      websocket.current = ws;

      ws.onopen = () => {
        console.log('Connected to RedstoneBench server');
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        
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
              const newBots: BotStatus[] = data.workers_available.map((botId: number) => ({
                id: botId,
                position: { x: 0, y: 64, z: 0 },
                inventory: {},
                currentJob: 'Querying status...',
                status: 'IDLE' as const,
                lastActivity: 'Connected',
                utilization: 0
              }));

              setState(prev => ({
                ...prev,
                bots: newBots,
                taskStats: { ...prev.taskStats, workerCount: newBots.length }
              }));

              // Start polling for bot status updates
              startStatusPolling(data.workers_available);
            }
          } else if (data.type === 'bot_status_update') {
            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => 
                bot.id === data.bot_id ? {
                  ...bot,
                  position: data.position || bot.position,
                  inventory: data.inventory || bot.inventory,
                  currentJob: data.current_job || bot.currentJob,
                  status: data.status || bot.status,
                  lastActivity: data.last_activity || bot.lastActivity,
                  utilization: data.utilization || bot.utilization
                } : bot
              )
            }));
          } else if (data.type === 'bot_event') {
            const newEvent: BotEvent = {
              id: (++eventIdCounter.current).toString(),
              timestamp: data.timestamp || Date.now(),
              botId: data.bot_id,
              type: data.event_type,
              jobId: data.job_id,
              message: data.message,
              details: data.details,
              errorCode: data.error_code
            };

            setState(prev => ({
              ...prev,
              events: [...prev.events.slice(-99), newEvent]
            }));
          } else if (data.type === 'worker_list') {
            const newBots: BotStatus[] = data.workers.map((worker: any) => ({
              id: worker.id,
              position: worker.position || { x: 0, y: 64, z: 0 },
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
          } else if (data.type === 'status_response' || data.type === 'query_status_response') {
            // Handle detailed bot status response from query_status command
            setState(prev => ({
              ...prev,
              bots: prev.bots.map(bot => 
                bot.id === data.bot_id ? {
                  ...bot,
                  position: data.position || bot.position,
                  inventory: data.inventory || bot.inventory,
                  currentJob: data.current_job || data.currentJob || bot.currentJob,
                  status: data.status || bot.status,
                  lastActivity: data.last_activity || data.lastActivity || bot.lastActivity,
                  utilization: data.utilization !== undefined ? data.utilization : bot.utilization
                } : bot
              )
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from RedstoneBench server');
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        
        // Stop status polling when disconnected
        if (statusPollInterval.current) {
          clearInterval(statusPollInterval.current);
          statusPollInterval.current = null;
        }
        
        // Auto-reconnect after 2 seconds
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, 2000);
    }
  }, [websocketUrl]);

  const startStatusPolling = useCallback((botIds: number[]) => {
    // Clear any existing polling
    if (statusPollInterval.current) {
      clearInterval(statusPollInterval.current);
    }

    // Query all bots immediately
    queryAllBots(botIds);

    // Set up polling every 1 second
    statusPollInterval.current = setInterval(() => {
      queryAllBots(botIds);
    }, 1000);

    console.log('🔄 Started status polling for bots:', botIds);
  }, []);

  const queryAllBots = useCallback((botIds: number[]) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      botIds.forEach(botId => {
        websocket.current!.send(JSON.stringify({
          type: 'manager_command',
          command: 'query_status',
          bot_id: botId,
          timestamp: Date.now()
        }));
      });
    }
  }, []);

  const stopStatusPolling = useCallback(() => {
    if (statusPollInterval.current) {
      clearInterval(statusPollInterval.current);
      statusPollInterval.current = null;
      console.log('⏹️ Stopped status polling');
    }
  }, []);

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

  const sendCommand = useCallback((command: any) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      // Send command to WebSocket server
      websocket.current.send(JSON.stringify({
        type: 'manager_command',
        command: command.command,
        bot_id: command.bot_id,
        parameters: command,
        timestamp: Date.now()
      }));
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

  const queryBot = useCallback((botId: number) => {
    sendCommand({
      command: 'query_status',
      bot_id: botId
    });
  }, [sendCommand]);

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
      botId: 0, // System event
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
      botId: 0, // System event
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
      botId: 0, // System event
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
        botId: 0,
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
      botId: 0,
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