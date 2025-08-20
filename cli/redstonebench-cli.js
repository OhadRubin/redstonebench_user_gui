#!/usr/bin/env node

const WebSocket = require('ws');
const readline = require('readline');
const { program } = require('commander');

class RedstoneBenchCLI {
  constructor(wsUrl = 'ws://localhost:8080') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.bots = new Map();
    this.events = [];
    this.taskStats = {
      startTime: null,
      endTime: null,
      isRunning: false,
      completedBlocks: 0,
      totalBlocks: 85
    };
    this.connectionStatus = 'disconnected';
    this.rl = null;
    this.dashboardInterval = null;
  }

  async connect() {
    console.log(`🔌 Connecting to RedstoneBench server at ${this.wsUrl}...`);
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        this.connectionStatus = 'connected';
        console.log('✅ Connected to RedstoneBench server');
        this.startInteractiveMode();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      this.ws.on('close', () => {
        this.connectionStatus = 'disconnected';
        console.log('🔌 Disconnected from server');
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.connectionStatus = 'disconnected';
      });

    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      process.exit(1);
    }
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'worker_list':
        message.workers.forEach(worker => {
          this.bots.set(worker.id, worker);
        });
        break;
        
      case 'bot_status_update':
        if (this.bots.has(message.bot_id)) {
          const bot = this.bots.get(message.bot_id);
          Object.assign(bot, message);
        }
        break;
        
      case 'bot_event':
        this.events.push({
          id: Date.now().toString(),
          timestamp: message.timestamp || Date.now(),
          botId: message.bot_id,
          type: message.event_type,
          message: message.message,
          jobId: message.job_id,
          errorCode: message.error_code
        });
        
        // Keep only last 50 events
        if (this.events.length > 50) {
          this.events = this.events.slice(-50);
        }
        
        this.printEvent(this.events[this.events.length - 1]);
        break;
        
      case 'task_stats_update':
        Object.assign(this.taskStats, message);
        break;
        
      case 'block_completed':
        this.taskStats.completedBlocks++;
        console.log(`🧱 Block completed at (${message.x}, ${message.y}, ${message.z})`);
        break;
    }
  }

  printEvent(event) {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const icons = {
      'START': '▶️',
      'PROGRESS': '⏳',  
      'COMPLETE': '✅',
      'FAILED': '❌',
      'BLOCKED': '⚠️',
      'COMMAND_SENT': '📤'
    };
    
    const icon = icons[event.type] || '📄';
    console.log(`${icon} [${time}] Bot ${event.botId}: ${event.message}`);
  }

  startInteractiveMode() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎮 redstone> '
    });

    console.log(`
🏗️ RedstoneBench CLI Manager
Connected to: ${this.wsUrl}

Type 'help' for available commands or 'dashboard' to see bot status.
    `);

    this.rl.prompt();

    this.rl.on('line', (input) => {
      this.handleCommand(input.trim());
      this.rl.prompt();
    });

    this.rl.on('SIGINT', () => {
      this.disconnect();
    });
  }

  handleCommand(input) {
    const args = input.split(' ');
    const command = args[0].toLowerCase();

    switch (command) {
      case 'help':
        this.showHelp();
        break;
        
      case 'status':
        this.showStatus();
        break;
        
      case 'dashboard':
        this.showDashboard();
        break;
        
      case 'bots':
        this.listBots();
        break;
        
      case 'events':
        this.showEvents();
        break;
        
      case 'gather':
        this.sendGatherCommand(args);
        break;
        
      case 'craft':
        this.sendCraftCommand(args);
        break;
        
      case 'move':
        this.sendMoveCommand(args);
        break;
        
      case 'build':
        this.sendBuildCommand(args);
        break;
        
      case 'query':
        this.queryBot(args);
        break;
        
      case 'start-task':
        this.startTask();
        break;
        
      case 'stop-task':
        this.stopTask();
        break;
        
      case 'reset-task':
        this.resetTask();
        break;
        
      case 'test-function':
        this.runFunctionalTest();
        break;
        
      case 'clear':
        console.clear();
        break;
        
      case 'watch':
        this.startDashboardWatch();
        break;
        
      case 'unwatch':
        this.stopDashboardWatch();
        break;
        
      case 'exit':
      case 'quit':
        this.disconnect();
        break;
        
      default:
        if (input) {
          console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
        }
    }
  }

  showHelp() {
    console.log(`
📋 RedstoneBench CLI Commands:

🤖 Bot Management:
  bots                     - List all bots and their status
  dashboard               - Show detailed bot dashboard  
  query <bot_id>          - Query specific bot status
  
🎮 Bot Commands:
  gather <bot_id> <item> <qty> [region]  - Command bot to gather resources
  craft <bot_id> <item> <qty>            - Command bot to craft items  
  move <bot_id> <x> <y> <z>              - Command bot to move to position
  build <bot_id> <region>                - Command bot to build blueprint region
  
⏱️ Task Control:
  start-task              - Start the construction task
  stop-task               - Stop the current task
  reset-task              - Reset task progress
  test-function           - Run functional test
  
📊 Information:
  status                  - Show connection and task status
  events                  - Show recent bot events
  watch                   - Auto-refresh dashboard every 2s
  unwatch                 - Stop auto-refresh
  
🔧 Utility:
  clear                   - Clear screen
  help                    - Show this help
  exit/quit               - Exit CLI

Examples:
  gather 1 minecraft:oak_log 64 forest
  craft 2 minecraft:crafting_table 1
  move 3 10 64 20
  build 1 layer_y1
    `);
  }

  showStatus() {
    const uptime = this.taskStats.startTime ? 
      Math.floor((Date.now() - this.taskStats.startTime) / 1000) : 0;
    
    console.log(`
📊 Status Report:
┌─────────────────────────────────────┐
│ Connection: ${this.connectionStatus.padEnd(23)} │
│ Active Bots: ${this.bots.size.toString().padEnd(22)} │  
│ Task Running: ${this.taskStats.isRunning.toString().padEnd(21)} │
│ Blocks Done: ${this.taskStats.completedBlocks}/${this.taskStats.totalBlocks.toString().padEnd(17)} │
│ Task Time: ${uptime}s${' '.repeat(25 - uptime.toString().length)} │
└─────────────────────────────────────┘
    `);
  }

  showDashboard() {
    console.log('\n🤖 Bot Dashboard:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (this.bots.size === 0) {
      console.log('No bots available');
      return;
    }

    this.bots.forEach(bot => {
      const statusIcon = {
        'IDLE': '😴',
        'IN_PROGRESS': '⚡',
        'COMPLETE': '✅', 
        'FAILED': '❌',
        'BLOCKED': '⚠️'
      }[bot.status] || '❓';

      const inventory = Object.entries(bot.inventory)
        .map(([item, count]) => `${item.replace('minecraft:', '')}: ${count}`)
        .join(', ') || 'Empty';

      console.log(`
${statusIcon} Bot ${bot.id} [${bot.status}]
  📍 Position: (${bot.position.x}, ${bot.position.y}, ${bot.position.z})
  🎯 Job: ${bot.current_job}
  📦 Inventory: ${inventory}
  📈 Utilization: ${bot.utilization?.toFixed(1)}%
  🕐 Last: ${bot.last_activity}
      `);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  listBots() {
    if (this.bots.size === 0) {
      console.log('No bots available');
      return;
    }

    console.log('\n🤖 Bot List:');
    this.bots.forEach(bot => {
      const status = bot.status.padEnd(12);
      console.log(`  Bot ${bot.id}: ${status} - ${bot.current_job}`);
    });
  }

  showEvents() {
    console.log('\n📋 Recent Events:');
    if (this.events.length === 0) {
      console.log('No events recorded');
      return;
    }

    this.events.slice(-10).forEach(event => {
      this.printEvent(event);
    });
  }

  sendGatherCommand(args) {
    const [, botId, item, qty, region] = args;
    if (!botId || !item) {
      console.log('❌ Usage: gather <bot_id> <item> <qty> [region]');
      return;
    }

    this.sendCommand({
      command: 'gather',
      bot_id: parseInt(botId),
      resource: item,
      quantity: parseInt(qty) || 10,
      region: region || ''
    });
  }

  sendCraftCommand(args) {
    const [, botId, item, qty] = args;
    if (!botId || !item) {
      console.log('❌ Usage: craft <bot_id> <item> <qty>');
      return;
    }

    this.sendCommand({
      command: 'craft', 
      bot_id: parseInt(botId),
      item: item,
      quantity: parseInt(qty) || 1
    });
  }

  sendMoveCommand(args) {
    const [, botId, x, y, z] = args;
    if (!botId || !x || !y || !z) {
      console.log('❌ Usage: move <bot_id> <x> <y> <z>');
      return;
    }

    this.sendCommand({
      command: 'move_to',
      bot_id: parseInt(botId),
      x: parseInt(x),
      y: parseInt(y), 
      z: parseInt(z)
    });
  }

  sendBuildCommand(args) {
    const [, botId, region] = args;
    if (!botId || !region) {
      console.log('❌ Usage: build <bot_id> <region>');
      console.log('Regions: layer_y0, layer_y1, layer_y2, all_layers');
      return;
    }

    this.sendCommand({
      command: 'place_blueprint',
      bot_id: parseInt(botId),
      region: region
    });
  }

  queryBot(args) {
    const [, botId] = args;
    if (!botId) {
      console.log('❌ Usage: query <bot_id>');
      return;
    }

    this.sendCommand({
      command: 'query_status',
      bot_id: parseInt(botId)
    });
  }

  sendCommand(command) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'manager_command',
        ...command,
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(message));
      console.log(`📤 Sent ${command.command} to Bot ${command.bot_id}`);
    } else {
      console.log('❌ Not connected to server');
    }
  }

  startTask() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'start_task', timestamp: Date.now() }));
      console.log('▶️ Task started');
    } else {
      console.log('❌ Not connected to server');
    }
  }

  stopTask() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop_task', timestamp: Date.now() }));
      console.log('⏹️ Task stopped');
    } else {
      console.log('❌ Not connected to server');
    }
  }

  resetTask() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reset_task', timestamp: Date.now() }));
      console.log('🔄 Task reset');
    } else {
      console.log('❌ Not connected to server');
    }
  }

  runFunctionalTest() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'run_functional_test', timestamp: Date.now() }));
      console.log('🧪 Running functional test...');
    } else {
      console.log('❌ Not connected to server');
    }
  }

  startDashboardWatch() {
    if (this.dashboardInterval) {
      console.log('⚠️ Dashboard watch already running');
      return;
    }

    console.log('👀 Starting dashboard watch (updates every 2s)...');
    this.dashboardInterval = setInterval(() => {
      console.clear();
      console.log('🔄 Auto-refreshing dashboard (type "unwatch" to stop)\n');
      this.showDashboard();
    }, 2000);
  }

  stopDashboardWatch() {
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
      this.dashboardInterval = null;
      console.log('⏹️ Dashboard watch stopped');
    } else {
      console.log('⚠️ Dashboard watch is not running');
    }
  }

  disconnect() {
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}

// CLI Program setup
program
  .name('redstonebench-cli')
  .description('CLI interface for RedstoneBench human calibration')
  .version('1.0.0')
  .option('-u, --url <url>', 'WebSocket URL', 'ws://localhost:8080')
  .action((options) => {
    const cli = new RedstoneBenchCLI(options.url);
    cli.connect();
  });

program.parse();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});