# Server WebSocket API - Missing Bot Information

**Priority:** High  
**Component:** WebSocket API  
**Affects:** GUI Bot Display and Management  

## Issue Description

The RedstoneBench GUI is successfully connecting to the server and receiving the `connection_established` message, but cannot display bots because the message contains insufficient data.

## Current Server Response

```json
{
  "type": "connection_established",
  "client_id": "client_1755758515261_ieap104hh",
  "workers_available": [
    0,
    1
  ],
  "server_info": {
    "version": "1.0.0",
    "max_workers": 2,
    "capabilities": [
      "move_to",
      "gather",
      "craft",
      "place_block",
      "query_status"
    ]
  }
}
```

## Problem

The `workers_available` field contains only bot IDs `[0, 1]`, but the GUI needs complete bot information to:

1. Display bots on the battlefield canvas
2. Show bot status in the Worker Dashboard  
3. Track bot positions, inventories, and current jobs
4. Enable proper bot selection and command targeting

## Required Server Changes

Please modify the `connection_established` message to include full bot objects instead of just IDs:

### Expected Message Format

```json
{
  "type": "connection_established",
  "client_id": "client_1755758515261_ieap104hh",
  "workers_available": [
    {
      "id": 0,
      "position": { "x": 10, "y": 64, "z": 20 },
      "inventory": { "minecraft:oak_log": 5 },
      "current_job": "Idle - awaiting commands",
      "status": "IDLE",
      "last_activity": "Connected",
      "utilization": 0
    },
    {
      "id": 1,
      "position": { "x": 15, "y": 64, "z": 25 },
      "inventory": {},
      "current_job": "Idle - awaiting commands", 
      "status": "IDLE",
      "last_activity": "Connected",
      "utilization": 0
    }
  ],
  "server_info": {
    "version": "1.0.0",
    "max_workers": 2,
    "capabilities": [
      "move_to",
      "gather", 
      "craft",
      "place_block",
      "query_status"
    ]
  }
}
```

### Required Bot Object Fields

Each bot object in `workers_available` must include:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | number | Unique bot identifier | `0`, `1`, `2` |
| `position` | object | Current world coordinates | `{"x": 10, "y": 64, "z": 20}` |
| `inventory` | object | Current items held | `{"minecraft:oak_log": 5}` |
| `current_job` | string | Current activity description | `"Gathering oak logs"` |
| `status` | string | Bot state | `"IDLE"`, `"IN_PROGRESS"`, `"FAILED"`, `"BLOCKED"` |
| `last_activity` | string | Description of last action | `"Completed gather command"` |
| `utilization` | number | Activity percentage (0-100) | `75` |

### Valid Status Values

- `"IDLE"` - Bot is waiting for commands
- `"IN_PROGRESS"` - Bot is executing a command  
- `"COMPLETE"` - Bot just finished a task
- `"FAILED"` - Bot encountered an error
- `"BLOCKED"` - Bot is blocked and cannot proceed

## Additional Requests

1. **Consistent Message Types**: Please confirm if you'll continue using `connection_established` or switch to `worker_list` (as documented in our API spec)

2. **Real-time Updates**: When bot status changes, please send individual `bot_status_update` messages:
   ```json
   {
     "type": "bot_status_update", 
     "bot_id": 0,
     "position": {"x": 12, "y": 64, "z": 22},
     "status": "IN_PROGRESS",
     "current_job": "Moving to position",
     "utilization": 60
   }
   ```

3. **Event Notifications**: For bot events (start/complete/fail), please send:
   ```json
   {
     "type": "bot_event",
     "bot_id": 0,
     "event_type": "START",
     "message": "Bot 0 started gathering oak logs",
     "timestamp": 1234567890123
   }
   ```

## Current Impact

Without this fix:
- ❌ Bots appear with `id: undefined` in logs
- ❌ Battlefield canvas shows bots at (0,0,0) 
- ❌ Worker Dashboard shows empty bot cards
- ❌ Bot selection and commanding doesn't work properly
- ❌ React warnings about missing `key` props

## Testing

After implementing the fix, the GUI should:
- ✅ Display 2 bots on the battlefield canvas
- ✅ Show bot details in Worker Dashboard
- ✅ Allow bot selection and commanding
- ✅ Update bot positions in real-time

## Contact

If you need clarification on any of these requirements, please reference the complete API specification in `WEBSOCKET_API_SPECIFICATION.md`.

**Reporter:** RedstoneBench GUI Team  
**Date:** 2025-01-21