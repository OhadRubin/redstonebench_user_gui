import { useState, useCallback, useRef } from 'react';
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
}

export const useRedstoneBench = () => {
  // Initialize with mock data for demonstration
  const [state, setState] = useState<RedstoneBenchState>({
    bots: [
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
    ],
    events: [
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
      },
      {
        id: '4',
        timestamp: Date.now() - 5000,
        botId: 1,
        type: 'PROGRESS',
        jobId: 'gather_001',
        message: 'Collected 32/64 oak logs. Continuing search...'
      }
    ],
    taskStats: {
      startTime: Date.now() - 180000, // Started 3 minutes ago
      endTime: null,
      isRunning: true,
      totalBlocks: 85, // Total blocks in sugar cane farm blueprint
      completedBlocks: 23,
      structuralComplete: false,
      functionalComplete: false,
      workerCount: 3,
      baselineTime: null
    },
    completedBlocks: new Set(['0,1,0', '1,1,0', '2,1,0', '0,1,1', '1,1,1'])
  });

  const eventIdCounter = useRef(Date.now());

  const sendCommand = useCallback((command: any) => {
    const newEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId: command.bot_id,
      type: 'COMMAND_SENT',
      message: `Sent ${command.command} command: ${JSON.stringify(command)}`,
      details: command
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, newEvent]
    }));

    // Simulate bot response after a delay
    setTimeout(() => {
      const responseEvent: BotEvent = {
        id: (++eventIdCounter.current).toString(),
        timestamp: Date.now(),
        botId: command.bot_id,
        type: 'START',
        jobId: `job_${Date.now()}`,
        message: `Bot ${command.bot_id} started executing ${command.command}`
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

    console.log('Command sent:', command);
  }, []);

  const queryBot = useCallback((botId: number) => {
    const queryEvent: BotEvent = {
      id: (++eventIdCounter.current).toString(),
      timestamp: Date.now(),
      botId,
      type: 'COMMAND_SENT',
      message: `Queried status of Bot ${botId}`
    };

    setState(prevState => ({
      ...prevState,
      events: [...prevState.events, queryEvent]
    }));

    // Simulate detailed status response
    setTimeout(() => {
      const bot = state.bots.find(b => b.id === botId);
      const responseEvent: BotEvent = {
        id: (++eventIdCounter.current).toString(),
        timestamp: Date.now(),
        botId,
        type: 'PROGRESS',
        message: `Status Report: Position (${bot?.position.x},${bot?.position.y},${bot?.position.z}), Status: ${bot?.status}`,
        details: bot
      };

      setState(prevState => ({
        ...prevState,
        events: [...prevState.events, responseEvent]
      }));
    }, 500);
  }, [state.bots]);

  const clearEventLog = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      events: []
    }));
  }, []);

  const startTask = useCallback(() => {
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