#!/usr/bin/env node

const WebSocket = require('ws');
const readline = require('readline');

class MockRedstoneBenchServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();
    this.bots = new Map();
    this.taskRunning = false;
    this.completedBlocks = new Set();
    
    // Initialize mock bots
    this.initializeBots();
    
    console.log(`🤖 Mock RedstoneBench Server starting on port ${port}`);
    console.log('📝 Commands: help, status, start, stop, add-bot, remove-bot, simulate-event');
    
    this.setupWebSocketServer();
    this.setupCLI();
    this.startSimulation();
  }

  initializeBots() {
    // Start with 3 bots
    for (let i = 1; i <= 3; i++) {
      this.bots.set(i, {
        id: i,
        position: { x: Math.floor(Math.random() * 20), y: 64, z: Math.floor(Math.random() * 20) },
        inventory: {},
        current_job: 'Idle - awaiting commands',
        status: 'IDLE',
        last_activity: 'Connected',
        utilization: 0
      });
    }
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      const clientId = Date.now();
      this.clients.set(clientId, ws);
      
      console.log(`📱 Client ${clientId} connected`);
      
      // Send initial worker list
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'worker_list',
          workers: Array.from(this.bots.values())
        }));
      }, 100);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`📨 Received:`, data);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📱 Client ${clientId} disconnected`);
      });
    });
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'manager_command':
        this.handleManagerCommand(data);
        break;
      case 'start_task':
        this.startTask();
        break;
      case 'stop_task':
        this.stopTask();
        break;
      case 'reset_task':
        this.resetTask();
        break;
      case 'run_functional_test':
        this.runFunctionalTest();
        break;
      default:
        console.log(`❓ Unknown message type: ${data.type}`);
    }
  }

  handleManagerCommand(data) {
    const { command, bot_id, parameters } = data;
    const bot = this.bots.get(bot_id);
    
    if (!bot) {
      console.log(`❌ Bot ${bot_id} not found`);
      return;
    }

    console.log(`🎮 Command: ${command} -> Bot ${bot_id}`);

    // Update bot status
    bot.status = 'IN_PROGRESS';
    bot.current_job = `Executing ${command}`;
    bot.last_activity = `Started ${command}`;
    bot.utilization = Math.min(100, bot.utilization + Math.random() * 20);

    // Send START event
    this.broadcast({
      type: 'bot_event',
      bot_id: bot_id,
      event_type: 'START',
      job_id: `job_${Date.now()}`,
      message: `Bot ${bot_id} started ${command}`,
      timestamp: Date.now()
    });

    // Send bot status update
    this.broadcast({
      type: 'bot_status_update',
      bot_id: bot_id,
      ...bot
    });

    // Simulate command completion after delay
    setTimeout(() => {
      this.completeCommand(bot_id, command, parameters);
    }, 2000 + Math.random() * 3000);
  }

  completeCommand(bot_id, command, parameters) {
    const bot = this.bots.get(bot_id);
    if (!bot) return;

    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      bot.status = 'IDLE';
      bot.current_job = 'Idle - awaiting commands';
      bot.last_activity = `Completed ${command}`;

      // Update bot based on command type
      switch (command) {
        case 'gather':
          const item = parameters.resource || 'minecraft:oak_log';
          const quantity = parameters.quantity || 10;
          bot.inventory[item] = (bot.inventory[item] || 0) + quantity;
          break;
        case 'move_to':
          bot.position = {
            x: parameters.x || bot.position.x,
            y: parameters.y || bot.position.y,
            z: parameters.z || bot.position.z
          };
          break;
        case 'craft':
          // Simulate crafting by removing materials and adding result
          bot.inventory[parameters.item] = (bot.inventory[parameters.item] || 0) + (parameters.quantity || 1);
          break;
      }

      this.broadcast({
        type: 'bot_event',
        bot_id: bot_id,
        event_type: 'COMPLETE',
        message: `Bot ${bot_id} completed ${command} successfully`,
        timestamp: Date.now()
      });
    } else {
      bot.status = 'FAILED';
      bot.last_activity = `Failed ${command}`;
      
      this.broadcast({
        type: 'bot_event',
        bot_id: bot_id,
        event_type: 'FAILED',
        message: `Bot ${bot_id} failed to complete ${command}`,
        error_code: 'EXECUTION_FAILED',
        timestamp: Date.now()
      });
    }

    // Send updated bot status
    this.broadcast({
      type: 'bot_status_update',
      bot_id: bot_id,
      ...bot
    });
  }

  startTask() {
    this.taskRunning = true;
    console.log('▶️ Task started');
    
    this.broadcast({
      type: 'task_stats_update',
      start_time: Date.now(),
      is_running: true,
      worker_count: this.bots.size
    });
  }

  stopTask() {
    this.taskRunning = false;
    console.log('⏹️ Task stopped');
    
    this.broadcast({
      type: 'task_stats_update',
      end_time: Date.now(),
      is_running: false
    });
  }

  resetTask() {
    this.taskRunning = false;
    this.completedBlocks.clear();
    console.log('🔄 Task reset');
    
    // Reset all bots
    this.bots.forEach(bot => {
      bot.status = 'IDLE';
      bot.current_job = 'Idle - awaiting commands';
      bot.inventory = {};
      bot.utilization = 0;
    });

    this.broadcast({
      type: 'task_stats_update',
      start_time: null,
      end_time: null,
      is_running: false,
      completed_blocks: 0
    });

    this.broadcast({
      type: 'worker_list',
      workers: Array.from(this.bots.values())
    });
  }

  runFunctionalTest() {
    console.log('🧪 Running functional test...');
    
    setTimeout(() => {
      const success = Math.random() > 0.3;
      this.broadcast({
        type: 'task_stats_update',
        functional_complete: success
      });
      
      console.log(success ? '✅ Functional test PASSED' : '❌ Functional test FAILED');
    }, 3000);
  }

  startSimulation() {
    // Periodically simulate block completion
    setInterval(() => {
      if (this.taskRunning && Math.random() > 0.7) {
        const x = Math.floor(Math.random() * 5);
        const y = Math.floor(Math.random() * 3);
        const z = Math.floor(Math.random() * 11);
        
        this.broadcast({
          type: 'block_completed',
          x, y, z
        });
        
        this.completedBlocks.add(`${x},${y},${z}`);
      }
    }, 2000);

    // Periodically update bot utilization
    setInterval(() => {
      this.bots.forEach(bot => {
        if (bot.status === 'IN_PROGRESS') {
          bot.utilization = Math.max(0, bot.utilization + (Math.random() - 0.5) * 10);
          
          this.broadcast({
            type: 'bot_status_update',
            bot_id: bot.id,
            utilization: bot.utilization
          });
        }
      });
    }, 5000);
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  setupCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 server> '
    });

    rl.prompt();

    rl.on('line', (input) => {
      const args = input.trim().split(' ');
      const command = args[0];

      switch (command) {
        case 'help':
          console.log(`
📋 Available Commands:
• help              - Show this help
• status            - Show server status  
• start             - Start task simulation
• stop              - Stop task simulation
• add-bot [id]      - Add a new bot
• remove-bot [id]   - Remove a bot
• simulate-event [type] [bot_id] - Simulate bot event
• clients           - List connected clients
• bots              - List all bots
          `);
          break;

        case 'status':
          console.log(`
📊 Server Status:
• Port: ${this.port}
• Connected clients: ${this.clients.size}
• Active bots: ${this.bots.size}  
• Task running: ${this.taskRunning}
• Completed blocks: ${this.completedBlocks.size}
          `);
          break;

        case 'clients':
          console.log(`👥 Connected clients: ${Array.from(this.clients.keys()).join(', ')}`);
          break;

        case 'bots':
          console.log('🤖 Bots:');
          this.bots.forEach(bot => {
            console.log(`  Bot ${bot.id}: ${bot.status} - ${bot.current_job}`);
          });
          break;

        case 'add-bot':
          const newId = parseInt(args[1]) || Math.max(...this.bots.keys()) + 1;
          this.bots.set(newId, {
            id: newId,
            position: { x: 0, y: 64, z: 0 },
            inventory: {},
            current_job: 'Idle - awaiting commands',
            status: 'IDLE',
            last_activity: 'Added by admin',
            utilization: 0
          });
          this.broadcast({
            type: 'worker_list',
            workers: Array.from(this.bots.values())
          });
          console.log(`✅ Added Bot ${newId}`);
          break;

        case 'remove-bot':
          const removeId = parseInt(args[1]);
          if (this.bots.delete(removeId)) {
            this.broadcast({
              type: 'worker_list',
              workers: Array.from(this.bots.values())
            });
            console.log(`✅ Removed Bot ${removeId}`);
          } else {
            console.log(`❌ Bot ${removeId} not found`);
          }
          break;

        case 'simulate-event':
          const eventType = args[1] || 'PROGRESS';
          const botId = parseInt(args[2]) || 1;
          this.broadcast({
            type: 'bot_event',
            bot_id: botId,
            event_type: eventType.toUpperCase(),
            message: `Simulated ${eventType} event for Bot ${botId}`,
            timestamp: Date.now()
          });
          console.log(`📨 Sent ${eventType} event for Bot ${botId}`);
          break;

        case 'start':
          this.startTask();
          break;

        case 'stop':
          this.stopTask();
          break;

        default:
          if (input.trim()) {
            console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
          }
      }

      rl.prompt();
    });

    rl.on('SIGINT', () => {
      console.log('\n👋 Shutting down server...');
      process.exit(0);
    });
  }
}

// Start server
const port = process.env.PORT || 8080;
new MockRedstoneBenchServer(port);