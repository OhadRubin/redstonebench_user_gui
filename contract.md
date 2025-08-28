# RedstoneBench WebSocket Client-Server Contract

## Overview

The RedstoneBench WebSocket protocol enables real-time communication between clients and the bot management server. The protocol is JSON-based and supports command execution, job management, and status monitoring.

## Connection

- **Default URL**: `ws://localhost:8080`
- **Protocol**: WebSocket over HTTP
- **Format**: All messages are JSON strings
- **Version**: 1.0


## Message Types

### Client-to-Server Messages

#### 1. Command Messages

```json
{
  "type": "command",
  "cmd": "<command_name>",
  "bot_id": <bot_id>,
  "parameters": { ... }
}
```

#### 2. Job Control Messages

```json
{
  "type": "cancel_job",
  "bot_id": <bot_id>,
}
```

#### 3. Status Query Messages

```json
{
  "type": "get_status",
  "bot_id": <bot_id>
}
```

#### 3. Status Query Messages

```json
{
  "type": "get_status_all",
}
```



### Server-to-Client Messages

#### 1. Command Response

```json
{
  "type": "command_response",
  "bot_id": <bot_id>,
  "status": "accepted" | "rejected",
  "cmd": "<command_name>",
  "message": "<optional_message>",
  "error": {
    "code": "BOT_BUSY",
    "message": "Bot 0 is currently busy with another job."
  }
}
```

#### 2. Job Lifecycle Events

**Job Start**:
```json
{
  "type": "job_start",
  "command": "<command_name>",
  "bot_id": <bot_id>
}
```

**Job Progress**:
```json
{
  "type": "job_progress",
  "bot_id": <bot_id>,
  "result": {
    "progress_percent": <0-100>,
    "current_location": [x, y, z],
    "message": "<progress_description>"
  }
}
```

**Job Complete**:
```json
{
  "type": "job_complete",
  "bot_id": <bot_id>,
  "result": {
    "position": [x, y, z],
    "health": <health_value>,
    "food": <food_level>,
    "additional_data": "..."
  }
}
```

**Job Failed**:
```json
{
  "type": "job_failed",
  "bot_id": <bot_id>,
  "reason": "<failure_reason>",
  "error_details": "..."
}
```

#### 3. Status Responses

```json
{
  "type": "status_response",
  "bot_id": <bot_id>,
  "status": "IDLE" | "BUSY",
  "result": {"current_job": "<command-name>",
              "bot_position": [x, y, z]}
}
```

#### 4. Cancel Responses

```json
{
  "type": "cancel_response",
  "bot_id": <bot_id>,
  "success": true,
  "message": "<cancellation_result>"
}
```

#### 3. Status Response For All Bots

```json
{
  "type": "status_response_all",
  "bots": {"bot_id": <bot_id>,
  "status": "IDLE" | "BUSY",
  "result": {"current_job": "<command-name>",
              "bot_position": [x, y, z]}}
}
```


## Supported Commands

### 1. move_to
Moves the bot to a specified target position.

**Parameters**:
```json
{
  "target": [x, y, z]
}
```

**Workflow**:
1. Client sends `move_to` command
2. Server responds with `command_response` (accepted/rejected)
3. If accepted, server sends `job_start` event with job_id
4. Server sends periodic `job_progress` events during movement
5. Server sends `job_complete` event when bot reaches target

### 2. get_status
Queries the current status and position of the bot.

**Parameters**:
```json
{
  "bot_id": <bot_id> {a number from 0 to 64}
}
```

**Workflow**:
1. Client sends `get_status` message with `bot` ID
2. Server responds immediately with `status_response`

### 3. cancel_job
Cancels the current job for a specific bot.

**Parameters**:
```json
{
  "bot_id": <bot_id>
}
```

**Workflow**:
1. Client sends `cancel_job` message with `bot_id`
2. Server responds with `cancel_response`
3. If successful, server sends `job_failed` event for the cancelled job with reason "cancelled"

## Job Management

### Job States

1. **Accepted**: Command accepted, job_id assigned (`command_response`)
2. **Started**: Job execution began (`job_start` event)
3. **In Progress**: Job running with periodic progress updates (`job_progress` events)
4. **Complete**: Job finished successfully (`job_complete` event)
5. **Failed**: Job failed or was cancelled (`job_failed` event)


## Bot State Information

### Position Format
- Coordinates: `[x, y, z]` as numeric array
- Example: `[100, 64, 200]`

### Status Fields
- **position**: Current bot coordinates
- **health**: Bot health points (0-20)
- **food**: Bot food/hunger level (0-20)

## Protocol Flow Examples

### Successful Move Command

```json
Client -> {
  "type": "command",
  "cmd": "move_to",
  "bot_id": 0,
  "parameters": {"target": [100, 64, 200]}
}
Server -> {
  "type": "command_response",
  "bot_id": 0,
  "status": "accepted",
  "cmd": "move_to"
}
Server -> {
  "type": "job_start",
  "bot_id": 0,
  "command": "move_to",
}
Server -> {
  "type": "job_progress",
  "bot_id": 0,
  "result": {"progress_percent": 25,
            "current_location": [75, 64, 150],
            "message": "Moving towards target"}
}
Server -> {
  "type": "job_progress",
  "bot_id": 0,
  "result": {"progress_percent": 50,
            "current_location": [87, 64, 175],
            "message": "Halfway to destination"}
}
Server -> {
  "type": "job_complete",
  "bot_id": 0,
  "result": {
    "position": [100, 64, 200],
    "health": 20,
    "food": 18
  }
}
```

### Job Cancellation

```json
Client -> {
  "type": "command",
  "cmd": "move_to",
  "bot_id": 0,
  "parameters": {"target": [1000, 64, 1000]}
}
Server -> {
  "type": "command_response",
  "bot_id": 0,
  "status": "accepted",
  "cmd": "move_to"
}
Server -> {
  "type": "job_start",
  "bot_id": 0,
  "command": "move_to",
}
Server -> {
  "type": "job_progress",
  "bot_id": 0,
  "result": {"progress_percent": 15,
              "current_location": [150, 64, 150],
              "message": "Moving towards distant target"}
}
Client -> {
  "type": "cancel_job",
  "bot_id": 0
}
Server -> {
  "type": "cancel_response",
  "bot_id": 0,
  "success": true,
  "message": "Job successfully cancelled"
}
Server -> {
  "type": "job_failed",
  "bot_id": 0,
  "reason": "cancelled",
  "error_details": "Job was cancelled by client request"
}
```

### Status Query

```json
Client -> {
  "type": "get_status",
  "bot_id": 0
}
Server -> {
  "type": "status_response",
  "bot_id": 0,
  "status": "BUSY",
  "result": {"current_job": "move_to",
            "bot_position": [87, 64, 175]}
}
```

### Command Rejection

```json
Client -> {
  "type": "command",

  "cmd": "move_to",
  "bot_id": 0,
  "parameters": {"target": [200, 64, 300]}
}
Server -> {
  "type": "command_response",

  "status": "rejected",
  "cmd": "move_to",
  "error": {
    "code": "BOT_BUSY",
    "message": "Bot 0 is currently busy with job a8c2f1f0-e8b9-4a4c-8f1a-3d2f1a2b3c4d"
  }
}
```

## Error Handling

### Structured Error Responses

All error responses include a structured `error` object with:
- **code**: Machine-readable error identifier
- **message**: Human-readable error description

### Common Error Codes

#### BOT_BUSY
- **Cause**: Attempting to send a command to a bot that's already executing another job
- **Response**: Command rejected with current job information

#### INVALID_PARAMETERS
- **Cause**: Command parameters are missing, malformed, or invalid
- **Response**: Command rejected with parameter validation details

#### BOT_NOT_FOUND
- **Cause**: Specified bot ID doesn't exist or is not connected
- **Response**: Command rejected with available bot list

#### INTERNAL_ERROR
- **Cause**: Server-side error during command processing
- **Response**: Command rejected with error tracking information

### Error Response Examples

```json
{
  "type": "command_response",

  "status": "rejected",
  "cmd": "move_to",
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Target coordinates [x, y, z] are required for move_to command"
  }
}
```
