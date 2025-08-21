# RedstoneBench WebSocket API Specification

This document specifies the WebSocket communication protocol between the RedstoneBench GUI and the server.

## Connection Details

- **Default URL**: `ws://localhost:8080`
- **Protocol**: WebSocket
- **Message Format**: JSON

## Message Types Overview

The GUI communicates with the server through the following message categories:

1. **Client → Server (Outgoing Messages)**
   - Manager Commands
   - Task Control Messages

2. **Server → Client (Incoming Messages)**
   - Bot Status Updates
   - Bot Events
   - Worker List Updates
   - Block Completion Events
   - Task Statistics Updates

---

## 1. Client → Server Messages

### 1.1 Manager Commands

All bot commands are sent with this structure:

```json
{
  "type": "manager_command",
  "command": "gather|craft|move_to|place_blueprint|use_chest|query_status|wait",
  "bot_id": 1,
  "parameters": { /* command-specific parameters */ },
  "timestamp": 1234567890123
}
```

#### Available Commands:

**1.1.1 Gather Resources**
```json
{
  "type": "manager_command",
  "command": "gather",
  "bot_id": 1,
  "resource": "minecraft:oak_log",
  "quantity": 10,
  "region": "forest_area", // optional
  "timestamp": 1234567890123
}
```

**1.1.2 Craft Items**
```json
{
  "type": "manager_command",
  "command": "craft",
  "bot_id": 1,
  "item": "minecraft:crafting_table",
  "quantity": 1,
  "timestamp": 1234567890123
}
```

**1.1.3 Move to Position**
```json
{
  "type": "manager_command",
  "command": "move_to",
  "bot_id": 1,
  "x": 10,
  "y": 64,
  "z": 20,
  "timestamp": 1234567890123
}
```

**1.1.4 Place Blueprint**
```json
{
  "type": "manager_command",
  "command": "place_blueprint",
  "bot_id": 1,
  "region": "layer_y1", // layer_y0|layer_y1|layer_y2|all_layers|custom
  "timestamp": 1234567890123
}
```

**1.1.5 Use Chest**
```json
{
  "type": "manager_command",
  "command": "use_chest",
  "bot_id": 1,
  "action": "deposit", // deposit|withdraw
  "items": "minecraft:oak_log:10",
  "chest_pos": "0,65,0",
  "timestamp": 1234567890123
}
```

**1.1.6 Query Status**
```json
{
  "type": "manager_command",
  "command": "query_status",
  "bot_id": 1,
  "timestamp": 1234567890123
}
```

**1.1.7 Wait**
```json
{
  "type": "manager_command",
  "command": "wait",
  "bot_id": 1,
  "duration": 5, // seconds
  "timestamp": 1234567890123
}
```

### 1.2 Task Control Messages

**1.2.1 Start Task**
```json
{
  "type": "start_task",
  "timestamp": 1234567890123
}
```

**1.2.2 Stop Task**
```json
{
  "type": "stop_task",
  "timestamp": 1234567890123
}
```

**1.2.3 Reset Task**
```json
{
  "type": "reset_task",
  "timestamp": 1234567890123
}
```

**1.2.4 Run Functional Test**
```json
{
  "type": "run_functional_test",
  "timestamp": 1234567890123
}
```

---

## 2. Server → Client Messages

### 2.1 Worker List

Sent when bots are added/removed or on initial connection:

```json
{
  "type": "worker_list",
  "workers": [
    {
      "id": 1,
      "position": { "x": 10, "y": 64, "z": 20 },
      "inventory": { "minecraft:oak_log": 5 },
      "current_job": "Idle - awaiting commands",
      "status": "IDLE", // IDLE|IN_PROGRESS|COMPLETE|FAILED|BLOCKED
      "last_activity": "Connected",
      "utilization": 0 // percentage 0-100
    }
  ]
}
```

### 2.2 Bot Status Updates

Sent when individual bot status changes:

```json
{
  "type": "bot_status_update",
  "bot_id": 1,
  "position": { "x": 15, "y": 64, "z": 25 }, // optional
  "inventory": { "minecraft:oak_log": 10 }, // optional
  "current_job": "Gathering oak logs", // optional
  "status": "IN_PROGRESS", // optional
  "last_activity": "Started gathering", // optional
  "utilization": 75 // optional
}
```

### 2.3 Bot Events

Real-time events from bots:

```json
{
  "type": "bot_event",
  "bot_id": 1,
  "event_type": "START", // START|PROGRESS|COMPLETE|FAILED|BLOCKED
  "job_id": "job_1234567890123", // optional
  "message": "Bot 1 started gathering oak logs",
  "details": { /* optional additional data */ },
  "error_code": "EXECUTION_FAILED", // optional, for FAILED events
  "timestamp": 1234567890123
}
```

#### Event Types:
- **START**: Bot began executing a command
- **PROGRESS**: Bot is making progress on a task
- **COMPLETE**: Bot successfully completed a command
- **FAILED**: Bot failed to complete a command
- **BLOCKED**: Bot is blocked and cannot proceed

### 2.4 Block Completion Events

Sent when blocks are placed during construction:

```json
{
  "type": "block_completed",
  "x": 5,
  "y": 1,
  "z": 10
}
```

### 2.5 Task Statistics Updates

Sent when task state changes:

```json
{
  "type": "task_stats_update",
  "start_time": 1234567890123, // optional
  "end_time": 1234567890123, // optional
  "is_running": true,
  "worker_count": 3, // optional
  "completed_blocks": 25, // optional
  "functional_complete": true // optional
}
```

---

## 3. Data Structures

### 3.1 Bot Status Object
```typescript
interface BotStatus {
  id: number;
  position: { x: number; y: number; z: number };
  inventory: { [item: string]: number };
  current_job: string;
  status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'BLOCKED';
  last_activity: string;
  utilization: number; // percentage 0-100
}
```

### 3.2 Bot Event Object
```typescript
interface BotEvent {
  id: string; // Generated client-side
  timestamp: number;
  bot_id: number;
  event_type: 'START' | 'PROGRESS' | 'COMPLETE' | 'FAILED' | 'BLOCKED';
  job_id?: string;
  message: string;
  details?: any;
  error_code?: string;
}
```

---

## 4. Connection Behavior

### 4.1 Client Behavior
- **Auto-reconnect**: Client automatically reconnects after 2 seconds on disconnect
- **Connection States**: `connecting` → `connected` → `disconnected`
- **Fallback Mode**: If connection fails, GUI continues with test data
- **Event Buffering**: Events are limited to 100 most recent entries

### 4.2 Server Expected Behavior
- **Initial Connection**: Send `worker_list` message within 100ms
- **Command Processing**: Acknowledge commands with `START` event, followed by status updates
- **Command Timing**: Commands should complete within 2-5 seconds
- **Success Rate**: Mock server simulates 90% success rate
- **Status Broadcasting**: Send status updates to all connected clients

---

## 5. Error Handling

### 5.1 Message Parsing Errors
- Client logs parsing errors but continues operation
- Malformed JSON messages are ignored

### 5.2 Command Failures
- Server should send `FAILED` event with appropriate error code
- Bot status should be updated to reflect failure state

### 5.3 Connection Issues
- Client maintains reconnection attempts indefinitely
- UI shows connection status in top bar

---

## 6. Example Communication Flow

```
1. Client connects to ws://localhost:8080
2. Server → Client: worker_list (initial bot states)
3. Client → Server: manager_command (gather)
4. Server → Client: bot_event (START)
5. Server → Client: bot_status_update (IN_PROGRESS)
6. Server → Client: bot_event (COMPLETE) [after 2-5 seconds]
7. Server → Client: bot_status_update (IDLE with updated inventory)
```

---

## 7. Common Issues & Troubleshooting

### Issue: GUI shows "Connected" but no bots visible
**Possible Causes:**
1. Server not sending `worker_list` message on connection
2. `worker_list` message has empty or malformed `workers` array
3. Bot objects missing required fields (`id`, `position`, `status`, etc.)

**Expected Server Response on Connection:**
```json
{
  "type": "worker_list",
  "workers": [
    {
      "id": 1,
      "position": { "x": 0, "y": 64, "z": 0 },
      "inventory": {},
      "current_job": "Idle - awaiting commands",
      "status": "IDLE",
      "last_activity": "Connected",
      "utilization": 0
    }
  ]
}
```

### Issue: Commands sent but no response
**Possible Causes:**
1. Server not handling `manager_command` message type
2. Server not sending `bot_event` responses
3. Missing `bot_id` field in command or bot doesn't exist

**Expected Server Response to Commands:**
1. Immediate `bot_event` with `event_type: "START"`
2. `bot_status_update` with new status
3. Eventual `bot_event` with `event_type: "COMPLETE"` or `"FAILED"`