# RedstoneBench WebSocket API Specification

This document specifies the WebSocket communication protocol between the RedstoneBench GUI and the server.

**Note**: This specification has been updated to align with the server implementation.

## Connection Details

- **Default URL**: `ws://localhost:8080`
- **Protocol**: WebSocket
- **Message Format**: JSON

## Message Types Overview

The GUI communicates with the server through the following message categories:

1. **Client → Server (Outgoing Messages)**
   - Direct Bot Commands
   - Task Control Messages
   - Status Queries

2. **Server → Client (Incoming Messages)**
   - Connection Confirmation
   - Status Responses
   - Worker Events
   - Task Event Messages

---

## 1. Client → Server Messages

### 1.1 Direct Bot Commands

Bot commands are sent directly without wrapper, using the command type as the message type:

**General Structure:**
```json
{
  "type": "command_type",
  "bot_id": "worker_0",
  "job_id": "gui_job_1234567890",
  /* command-specific parameters */
}
```

#### Available Commands:

**1.1.1 Move to Position**
```json
{
  "type": "move_to",
  "bot_id": "worker_0",
  "job_id": "gui_job_1234567890",
  "target": {
    "x": 100,
    "y": 64, 
    "z": 200
  }
}
```

**1.1.2 Gather Resources**
```json
{
  "type": "gather",
  "bot_id": "worker_0",
  "job_id": "gui_job_1234567890",
  "resource": "oak_log",
  "quantity": 5,
  "area": {
    "x1": 95, "z1": 195,
    "x2": 105, "z2": 205
  }
}
```

**1.1.3 Craft Items**
```json
{
  "type": "craft",
  "bot_id": "worker_0",
  "job_id": "gui_job_1234567890", 
  "item": "oak_planks",
  "quantity": 4
}
```

**1.1.4 Place Block**
```json
{
  "type": "place_block",
  "bot_id": "worker_0",
  "job_id": "gui_job_1234567890",
  "block_type": "stone",
  "coordinates": {
    "x": 100,
    "y": 64,
    "z": 200
  }
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
  "type": "run_functional_test"
}
```

### 1.3 Status Queries

**1.3.1 Get Status (All Workers)**
```json
{
  "type": "get_status"
}
```

**1.3.2 Query Status (Detailed)**
```json
{
  "type": "query_status",
  "detailed": true
}
```

---

## 2. Server → Client Messages

### 2.1 Connection Established

Sent immediately when client connects:

```json
{
  "type": "connection_established", 
  "client_id": "client_1703123456789_abc123def",
  "workers_available": ["worker_0", "worker_1"], // Array of string worker IDs
  "server_info": {
    "version": "1.0.0",
    "max_workers": 5,
    "capabilities": ["move_to", "gather", "craft", "place_block", "query_status"]
  }
}
```

**Note**: This message provides worker IDs as strings. To get detailed worker information, send `get_status` command.

### 2.2 Status Response

Sent in response to `get_status` or `query_status` commands:

```json
{
  "status": "success",
  "data": {
    "workers": [
      {
        "id": "worker_0",
        "position": { "x": 100, "y": 64, "z": 200 },
        "inventory": { "oak_log": 3, "stone": 12 },
        "status": "IDLE", // or "BUSY"
        "current_job": null, // or job_id string
        "health": 20.0,
        "utilization": 0.0 // 1.0 if BUSY, 0.0 if IDLE
      }
    ],
    "task_active": false,
    "active_jobs": [],
    "start_time": null, // or timestamp
    "current_time": 1703123456789
  }
}
```

### 2.3 Bot Status Updates

Sent when individual bot status changes (if server supports real-time updates):

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

### 2.3 Worker Events

Real-time events from workers (lowercase event types):

**Worker Start Event:**
```json
{
  "type": "start",
  "bot_id": "worker_0",
  "job_id": "move_123",
  "timestamp": 1703123456789,
  "command": {
    "cmd": "move_to",
    "parameters": {"target": {"x": 100, "y": 64, "z": 200}}
  }
}
```

**Worker Progress Event:**
```json
{
  "type": "progress",
  "bot_id": "worker_0", 
  "job_id": "gather_001",
  "timestamp": 1703123456889,
  "progress": 0.6,
  "current": {"x": 102, "y": 64, "z": 198},
  "target": {"x": 100, "y": 64, "z": 200}
}
```

**Worker Complete Event:**
```json
{
  "type": "complete",
  "bot_id": "worker_0",
  "job_id": "gather_001", 
  "timestamp": 1703123456989,
  "result": {
    "position": {"x": 100, "y": 64, "z": 200},
    "inventory_changes": {"oak_log": 3},
    "collected": ["oak_log", "oak_log", "oak_log"]
  }
}
```

**Worker Failed Event:**
```json
{
  "type": "failed",
  "bot_id": "worker_0",
  "job_id": "craft_001",
  "timestamp": 1703123457089,
  "error": {
    "code": "INSUFFICIENT_MATERIALS",
    "message": "Not enough oak_log in inventory"
  }
}
```

#### Event Types:
- **start**: Worker began executing a command  
- **progress**: Worker is making progress on a task
- **complete**: Worker successfully completed a command
- **failed**: Worker failed to complete a command

### 2.5 Block Completion Events

Sent when blocks are placed during construction:

```json
{
  "type": "block_completed",
  "x": 5,
  "y": 1,
  "z": 10
}
```

### 2.6 Task Statistics Updates

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

### 3.1 Worker Status Object (Client-side representation)
```typescript
interface BotStatus {
  id: string; // e.g., "worker_0"
  position: { x: number; y: number; z: number };
  inventory: { [item: string]: number };
  currentJob: string;
  status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'BLOCKED';
  lastActivity: string;
  utilization: number; // percentage 0-100
}
```

### 3.2 Worker Object (Server format)
```typescript
interface Worker {
  id: string; // e.g., "worker_0"
  position: { x: number; y: number; z: number };
  inventory: { [item: string]: number };
  status: 'IDLE' | 'BUSY';
  current_job: string | null;
  health: number;
  utilization: number; // 0.0 to 1.0
}
```

### 3.3 Bot Event Object (Client-side)
```typescript
interface BotEvent {
  id: string; // Generated client-side
  timestamp: number;
  botId: string; // e.g., "worker_0"
  type: 'START' | 'PROGRESS' | 'COMPLETE' | 'FAILED' | 'BLOCKED' | 'COMMAND_SENT';
  jobId?: string;
  message: string;
  details?: any;
  errorCode?: string;
}
```

---

## 4. Status Polling Pattern

The client uses a simplified polling pattern to maintain up-to-date worker information:

### 4.1 Polling Behavior
- **Initial Query**: Send `get_status` immediately after receiving `connection_established`
- **Continuous Polling**: Send `get_status` every 1 second to get all worker statuses
- **Response Processing**: Update worker state from server's status response
- **Cleanup**: Stop polling on disconnect or error

### 4.2 Implementation Flow
```
1. Connect → Receive connection_established with worker IDs ["worker_0", "worker_1"]
2. Create placeholder bot objects with string IDs
3. Send get_status immediately  
4. Set up 1-second interval to repeat get_status command
5. Process status response with nested workers data
6. Stop polling on disconnect
```

## 5. Connection Behavior

### 5.1 Client Behavior
- **Auto-reconnect**: Client automatically reconnects after 2 seconds on disconnect
- **Connection States**: `connecting` → `connected` → `disconnected`
- **Polling Management**: Start polling on successful connection, stop on disconnect
- **Fallback Mode**: If connection fails, GUI continues with test data
- **Event Buffering**: Events are limited to 100 most recent entries

### 5.2 Server Expected Behavior
- **Initial Connection**: Send `connection_established` message immediately with bot IDs
- **Status Queries**: Respond to `query_status` with detailed `status_response` messages
- **Command Processing**: Acknowledge commands with `START` event, followed by status updates
- **Command Timing**: Commands should complete within 2-5 seconds
- **Response Format**: Use consistent field names in status responses

---

## 6. Error Handling

### 6.1 Message Parsing Errors
- Client logs parsing errors but continues operation
- Malformed JSON messages are ignored

### 6.2 Command Failures
- Server should send `FAILED` event with appropriate error code
- Bot status should be updated to reflect failure state

### 6.3 Connection Issues
- Client maintains reconnection attempts indefinitely
- UI shows connection status in top bar
- Polling automatically resumes on reconnection

### 6.4 Polling Issues
- If `status_response` messages stop arriving, bots will show stale data
- Client continues polling even if some responses fail
- Network interruptions automatically stop and resume polling

---

## 7. Example Communication Flow

```
1. Client connects to ws://localhost:8080
2. Server → Client: connection_established (worker IDs: ["worker_0", "worker_1"])
3. Client → Server: get_status
4. Server → Client: status response (nested workers data)
5. [Every 1 second: repeat steps 3-4]
6. Client → Server: gather command (worker_0)
7. Server → Client: success response (job_id)
8. Server → Client: start event (worker_0)
9. Server → Client: progress event (worker_0)
10. Server → Client: complete event (worker_0) [after execution]
11. Next get_status response shows updated worker inventory
```

---

## 8. Common Issues & Troubleshooting

### Issue: GUI shows "Connected" but no bots visible
**Possible Causes:**
1. Server not sending `connection_established` message on connection
2. `workers_available` field is empty or malformed
3. Bot IDs in `workers_available` are not valid numbers

**Expected Server Response on Connection:**
```json
{
  "type": "connection_established",
  "client_id": "client_1234567890",
  "workers_available": [0, 1],
  "server_info": { "version": "1.0.0", "max_workers": 2, "capabilities": [...] }
}
```

### Issue: Bots appear but show "Querying status..." indefinitely
**Possible Causes:**
1. Server not responding to `query_status` commands
2. Server using different message type than `status_response` or `query_status_response`
3. Response missing `bot_id` field or using wrong bot ID

**Expected Server Response to query_status:**
```json
{
  "type": "status_response",
  "bot_id": 0,
  "position": { "x": 0, "y": 64, "z": 0 },
  "inventory": {},
  "current_job": "Idle - awaiting commands",
  "status": "IDLE",
  "last_activity": "Connected",
  "utilization": 0
}
```

### Issue: Commands sent but no response
**Possible Causes:**
1. Server not handling `manager_command` message type
2. Server not sending `bot_event` responses
3. Missing `bot_id` field in command or bot doesn't exist

**Expected Server Response to Commands:**
1. Immediate `bot_event` with `event_type: "START"`
2. Updated `status_response` showing new status during next poll cycle
3. Eventual `bot_event` with `event_type: "COMPLETE"` or `"FAILED"`