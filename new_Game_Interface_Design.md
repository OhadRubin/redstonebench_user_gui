# Improved RTS Game Interface Design

**Created:** 8/21/2025  
**Purpose:** Redesign the bottom bar layout for better UX flow and explain UI element connections

## Proposed Bottom Bar Layout

The new layout follows a logical left-to-right workflow:

```
[Unit Selection] → [Unit Information] → [Command Selection] → [Contextual Options]
```

## UI Element Connections & Data Flow

### 1. **Unit Selection Panel** (Far Left)
- **Purpose**: Display all currently selected units as a group
- **Content**: 
  - Small unit portraits in a grid/list
  - Multi-select capability with checkboxes
  - Quick selection filters (e.g., "All Cavalry", "All Archers")
- **Connections**:
  - **Feeds into** → Unit Information Panel
  - **Receives from** → Battlefield clicks and drag selections

### 2. **Unit Information Panel** (Left-Center)
- **Purpose**: Show detailed stats for the active unit(s)
- **Content**: 
  - Unit portrait, name, and type
  - Health, attack, defense, speed stats
  - Status effects and inventory slots
- **Connections**:
  - **Receives from** → Unit Selection Panel (which unit to display)
  - **Feeds into** → Command Selection Panel (available commands depend on unit type)

### 3. **Command Selection Panel** (Right-Center)
- **Purpose**: Display available actions for the selected unit type
- **Content**:
  - Primary commands (Move, Attack, Defend, etc.)
  - Formation options
  - Unit-specific abilities
- **Connections**:
  - **Receives from** → Unit Information Panel (unit type determines available commands)
  - **Feeds into** → Contextual Options Panel (selected command shows sub-options)

### 4. **Contextual Options Panel** (Far Right)
- **Purpose**: Show sub-options and parameters for the selected command
- **Content**:
  - Attack: Target priority (Buildings first, Units first, etc.)
  - Move: Formation type, stance (Aggressive, Defensive, etc.)
  - Build: Available structures based on tech level
- **Connections**:
  - **Receives from** → Command Selection Panel (which command is active)
  - **Feeds back to** → Battlefield for command execution

## Information Flow Diagram

```
Battlefield Selection
        ↓
Unit Selection Panel ← (Multi-select, filters)
        ↓
Unit Information Panel ← (Active unit details)
        ↓
Command Selection Panel ← (Available actions)
        ↓
Contextual Options Panel ← (Command parameters)
        ↓
Command Execution → Battlefield
```

## Benefits of This Layout

### **Logical Workflow**
- Users naturally flow from "what do I have?" → "what can it do?" → "how should it do it?"
- Each panel builds upon the previous one

### **Reduced Cognitive Load**
- Clear separation of concerns
- No need to hunt for related options across the interface
- Related information is grouped together

### **Better Multi-Unit Management**
- Dedicated unit selection area for complex army management
- Easy switching between different unit types in a selection
- Batch command application with individual customization

### **Contextual Intelligence**
- Options change based on selections, reducing clutter
- Only relevant commands and sub-options are shown
- Smart defaults based on unit type and situation

## Implementation Considerations

### **Component Structure**
```jsx
<BottomPanel>
  <UnitSelectionPanel selectedUnits={units} onSelectionChange={...} />
  <UnitInformationPanel activeUnit={activeUnit} />
  <CommandPanel availableCommands={commands} onCommandSelect={...} />
  <ContextualOptionsPanel selectedCommand={command} options={options} />
</BottomPanel>
```

### **State Management**
- **selectedUnits**: Array of all selected units
- **activeUnit**: The unit whose details are displayed (usually first in selection)
- **selectedCommand**: Currently highlighted command
- **commandOptions**: Dynamic options based on selected command

### **Data Dependencies**
1. Battlefield selection updates **selectedUnits**
2. **selectedUnits** determines **activeUnit** (first unit or user-clicked unit)
3. **activeUnit** type determines available **commands**
4. **selectedCommand** determines visible **options**

## Comparison with Current Design

### **Current Layout** (Age of Empires style)
```
[Unit Info] [Command Panel] [Minimap]
```

### **New Layout**
```
[Unit Selection] [Unit Information] [Command Selection] [Contextual Options]
```

The new design trades the minimap space for better command workflow, moving the minimap to a different location (potentially top-right corner or as an overlay).

## Technical Implementation Notes

- **Unit Selection Panel**: Virtualized list for large army management
- **Command Panel**: Dynamic button generation based on unit capabilities
- **Contextual Options**: Form-like interface with sliders, dropdowns, and toggles
- **Real-time Updates**: All panels react to battlefield changes and user actions

This design creates a more intuitive and efficient interface for complex RTS gameplay while maintaining the visual appeal and functionality of traditional RTS games.