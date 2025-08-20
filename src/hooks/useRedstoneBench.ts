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
          
          if (data.type === 'bot_status_update') {
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
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from RedstoneBench server');
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        
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

  // Initialize WebSocket connection and add test data
  useEffect(() => {
    connectWebSocket();

    // Add some test bots if no WebSocket connection after 2 seconds
    const testDataTimeout = setTimeout(() => {
      if (!websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
        console.log('Adding test bot data since WebSocket is not connected');
        
        const testBots: BotStatus[] = [
          {
            id: 1,
            position: { x: 0, y: 64, z: 0 },
            inventory: { 'minecraft:oak_log': 64, 'minecraft:stone': 32 },
            currentJob: 'Gathering wood in forest area',
            status: 'IN_PROGRESS',
            lastActivity: 'Mining oak logs',
            utilization: 85.2
          },
          {
            id: 2,
            position: { x: 15, y: 63, z: 12 },
            inventory: { 'minecraft:cobblestone': 45, 'minecraft:iron_ore': 8 },
            currentJob: 'Mining stone for foundation',
            status: 'IN_PROGRESS',
            lastActivity: 'Breaking cobblestone',
            utilization: 72.8
          },
          {
            id: 3,
            position: { x: -8, y: 64, z: 5 },
            inventory: {},
            currentJob: 'Idle - awaiting commands',
            status: 'IDLE',
            lastActivity: 'Completed chest deposit',
            utilization: 23.1
          }
        ];

        const testEvents: BotEvent[] = [
          {
            id: '1',
            timestamp: Date.now() - 30000,
            botId: 1,
            type: 'START',
            jobId: 'gather_001',
            message: 'Started gathering oak_log (quantity: 64) in forest area'
          },
          {
            id: '2',
            timestamp: Date.now() - 25000,
            botId: 2,
            type: 'START',
            jobId: 'gather_002',
            message: 'Started gathering stone (quantity: 50)'
          },
          {
            id: '3',
            timestamp: Date.now() - 15000,
            botId: 3,
            type: 'COMPLETE',
            jobId: 'chest_001',
            message: 'Successfully deposited items in chest at (0,65,0)'
          }
        ];

        setState(prev => ({
          ...prev,
          bots: testBots,
          events: testEvents,
          taskStats: {
            ...prev.taskStats,
            startTime: Date.now() - 180000,
            isRunning: true,
            completedBlocks: 23,
            workerCount: testBots.length
          },
          completedBlocks: new Set(['0,1,0', '1,1,0', '2,1,0', '0,1,1', '1,1,1'])
        }));
      }
    }, 2000);

    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      clearTimeout(testDataTimeout);
    };
  }, [connectWebSocket]);

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