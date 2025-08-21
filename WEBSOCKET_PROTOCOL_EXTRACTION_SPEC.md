# WebSocket Protocol Extraction Specification

## Transformation Definition

**z**: Extract WebSocket communication patterns from codebase and generate standardized API specification document with message schemas, connection behavior, data structures, error handling, and implementation examples.

## Input (x)
- Codebase containing WebSocket client/server implementation
- Source files with message handling, connection logic, and data structures

## Output (y)
- Structured markdown document following the format below

## Transformation Rules

### 1. Document Structure
Generate markdown with exactly these sections:
1. **Connection Details** - URL, protocol, message format
2. **Message Types Overview** - Categories of messages
3. **Client → Server Messages** - Outgoing message schemas with examples
4. **Server → Client Messages** - Incoming message schemas with examples  
5. **Data Structures** - TypeScript interfaces for all objects
6. **Connection Behavior** - Polling patterns, reconnection logic
7. **Error Handling** - Error scenarios and responses
8. **Example Communication Flow** - Step-by-step message sequence
9. **Common Issues & Troubleshooting** - Known problems and solutions

### 2. Message Schema Extraction
For each message type found in code:
- Extract JSON structure from send/receive calls
- Document all required and optional fields
- Include example with realistic values
- Note field types and constraints
- Add timestamp field if present

### 3. Code Pattern Recognition
Identify these patterns in source code:
- `websocket.send()` or similar → Client → Server messages
- `websocket.onmessage` handlers → Server → Client messages  
- Message type switches/conditionals → Message categories
- Polling intervals → Connection behavior
- Reconnection logic → Error handling
- Data interfaces/types → Data structures

### 4. Documentation Standards
- Use JSON code blocks for all message examples
- Include TypeScript interfaces for complex objects
- Add comments in JSON for field explanations
- Use consistent field naming (snake_case or camelCase as found)
- Include realistic example values, not placeholders
- Document optional fields with `// optional` comments

### 5. Behavioral Documentation
Extract from code:
- Connection URLs and fallback behavior
- Polling intervals and retry logic
- Message validation and error responses
- State management patterns
- Event handling workflows

### 6. Troubleshooting Generation
For each message type, document:
- What happens if message is malformed
- Expected server responses and timing
- Common integration issues
- Debug techniques and logging

## Quality Criteria
- Every message type in code has corresponding documentation
- All data structures used in messages are defined
- Connection behavior matches actual implementation
- Examples use realistic data, not generic placeholders
- Troubleshooting covers actual implementation edge cases

## Application Scope
This transformation applies to codebases containing:
- WebSocket client implementations (browser/Node.js)
- WebSocket server implementations  
- Real-time communication systems
- API clients with persistent connections
- Live data streaming applications

## Exclusions
Does not extract:
- HTTP REST API endpoints
- Database schemas unrelated to WebSocket messages
- UI component structures
- Build configurations
- Testing frameworks