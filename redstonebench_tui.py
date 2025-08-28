#!/usr/bin/env python
import asyncio
import json
import random
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

import websockets
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical, VerticalScroll
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.screen import ModalScreen
from textual.widget import Widget
from textual.widgets import (
    Button,
    ContentSwitcher,
    Footer,
    Header,
    Input,
    Label,
    ProgressBar,
    RichLog,
    Static,
    TabbedContent,
    TabPane,
)
from rich.panel import Panel
from rich.style import Style
from rich.text import Text

# --- MOCK WEBSOCKET SERVER (for demonstration) ---
# This server simulates the RedstoneBench backend.

class MockBot:
    """Represents a single bot on the mock server."""
    def __init__(self, bot_id):
        self.bot_id = bot_id
        self.pos = [random.randint(-250, 250), 64, random.randint(-250, 250)]
        self.status = "IDLE"
        self.job = "Idle - awaiting commands"
        self.target_pos = None
        self.progress = 0

    def update(self):
        """Simulates bot behavior over time."""
        if self.status == "BUSY" and self.target_pos:
            move_speed = 5
            for i in [0, 2]: # Move in X and Z
                if abs(self.pos[i] - self.target_pos[i]) > move_speed:
                    self.pos[i] += move_speed if self.target_pos[i] > self.pos[i] else -move_speed
                else:
                    self.pos[i] = self.target_pos[i]
            
            # Check if arrived
            if self.pos[0] == self.target_pos[0] and self.pos[2] == self.target_pos[2]:
                self.status = "IDLE"
                self.job = "Idle - awaiting commands"
                self.target_pos = None
                return {"type": "job_complete", "bot_id": self.bot_id, "result": {"position": self.pos}}
        return None

    def set_move_target(self, target):
        self.target_pos = target
        self.status = "BUSY"
        self.job = f"Moving to {target}"
        return {"type": "job_start", "bot_id": self.bot_id, "command": "move_to"}

# Dictionary to hold all server-side bots
mock_bots: Dict[int, MockBot] = {i: MockBot(i) for i in range(4)}

async def mock_server_handler(websocket, path):
    """Handles WebSocket connections for the mock server."""
    print("Mock Server: Client connected.")
    try:
        # Main loop to send periodic updates
        while True:
            # Send status of all bots
            all_status = {
                "type": "status_response_all",
                "bots": {
                    bot.bot_id: {
                        "bot_id": bot.bot_id,
                        "status": bot.status,
                        "result": {
                            "bot_position": bot.pos,
                            "current_job": bot.job,
                        },
                    }
                    for bot in mock_bots.values()
                },
            }
            await websocket.send(json.dumps(all_status))

            # Update bot states and send events
            for bot in mock_bots.values():
                event = bot.update()
                if event:
                    await websocket.send(json.dumps(event))

            # Wait for incoming messages or timeout
            try:
                message_str = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                message = json.loads(message_str)

                # Handle client commands
                if message.get("type") == "command" and message.get("cmd") == "move_to":
                    bot_id = message["bot_id"]
                    if bot_id in mock_bots:
                        target = message["parameters"]["target"]
                        event = mock_bots[bot_id].set_move_target(target)
                        await websocket.send(json.dumps(event))
                        # Send acceptance response
                        response = {
                            "type": "command_response", "status": "accepted", 
                            "cmd": "move_to", "bot_id": bot_id
                        }
                        await websocket.send(json.dumps(response))

            except asyncio.TimeoutError:
                continue  # No message received, continue loop
            except websockets.ConnectionClosed:
                break
    finally:
        print("Mock Server: Client disconnected.")

def run_mock_server():
    """Sets up and runs the mock server in a separate thread."""
    async def main():
        async with websockets.serve(mock_server_handler, "localhost", 8080):
            print("Mock WebSocket server started on ws://localhost:8080")
            await asyncio.Future()  # run forever

    asyncio.run(main())

# --- DATA STRUCTURES (from original interface definitions) ---

@dataclass
class Bot:
    id: str
    index: int
    position: Tuple[float, float, float] = (0, 64, 0)
    status: str = "IDLE"
    currentJob: str = "Idle - awaiting commands"
    lastLog: str = "Bot connected and ready"

@dataclass
class TaskStats:
    startTime: Optional[float] = None
    workerCount: int = 0
    totalBlocks: int = 85
    completedBlocks: int = 0
    isRunning: bool = True # Start as if running for demo

# --- WEBSOCKET CONTROLLER ---
# This class runs in a background thread to handle WebSocket communication.

class RedstoneBenchController:
    def __init__(self, app_host: App, url="ws://localhost:8080"):
        self.app = app_host
        self.url = url
        self.ws = None
        self.thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self.thread.start()

    def _run(self):
        asyncio.run(self._connect_and_listen())

    async def _connect_and_listen(self):
        self.app.call_from_thread(self.app.update_connection_status, "connecting")
        while True:
            try:
                async with websockets.connect(self.url) as ws:
                    self.ws = ws
                    self.app.call_from_thread(self.app.update_connection_status, "connected")
                    # Initial setup
                    self.app.call_from_thread(self.app.initialize_bots, 4)
                    
                    while True:
                        message = await ws.recv()
                        data = json.loads(message)
                        self.app.call_from_thread(self.app.handle_websocket_message, data)

            except (websockets.ConnectionClosed, OSError) as e:
                self.ws = None
                self.app.call_from_thread(self.app.update_connection_status, "disconnected")
                await asyncio.sleep(2) # Reconnect delay
                self.app.call_from_thread(self.app.update_connection_status, "connecting")

    def send_command(self, command: Dict):
        if self.ws:
            # The controller is in another thread, so we must use asyncio.run_coroutine_threadsafe
            loop = asyncio.get_running_loop()
            asyncio.run_coroutine_threadsafe(
                self.ws.send(json.dumps(command)), loop
            )

# --- TUI WIDGETS ---

WORLD_BOUNDS = {"minX": -500, "maxX": 500, "minZ": -500, "maxZ": 500}

class TopBar(Static):
    """The header bar displaying global stats."""
    elapsed_time = reactive("0:00")
    task_progress = reactive("0/85")
    worker_count = reactive("0 Bots")
    connection_status = reactive(("disconnected", "red"))

    def render(self) -> str:
        status, color = self.connection_status
        return f"[b]RedstoneBench HCI[/]  |  ⏱️ {self.elapsed_time}  |  🔧 {self.task_progress}  |  👥 {self.worker_count}  |  [{color}]● {status}[/]"

class TaskProgressPanel(Static):
    """A small panel showing task progress."""
    def compose(self) -> ComposeResult:
        yield Label("[b]⏱️ Task Progress[/b]")
        yield ProgressBar(total=100, show_eta=False, id="task_progress_bar")
        yield Label("Status: [bold #00aaff]IN PROGRESS[/]")

class BotCanvas(Widget):
    """The main 2D map display."""
    bots = reactive([])
    selected_bot = reactive(None)
    
    # Viewport state for panning and zooming
    offset_x = reactive(0.0)
    offset_y = reactive(0.0)
    zoom = reactive(1.0)

    # Mouse panning state
    is_panning = False
    last_pan_pos = (0, 0)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.world_to_screen_scale = 0.2  # Determines how spread out bots are initially

    def screen_to_world(self, screen_x, screen_y):
        # Center coordinates
        center_x = self.content_size.width / 2
        center_y = self.content_size.height / 2
        
        # Apply inverse transformations
        world_x = (screen_x - center_x) / (self.zoom * self.world_to_screen_scale) + self.offset_x
        world_y = (screen_y - center_y) / (self.zoom * self.world_to_screen_scale) + self.offset_y
        return world_x, world_y
        
    def world_to_screen(self, world_x, world_y):
        # Center coordinates
        center_x = self.content_size.width / 2
        center_y = self.content_size.height / 2
        
        # Apply transformations
        screen_x = ((world_x - self.offset_x) * self.zoom * self.world_to_screen_scale) + center_x
        screen_y = ((world_y - self.offset_y) * self.zoom * self.world_to_screen_scale) + center_y
        return int(screen_x), int(screen_y)

    def render(self) -> Panel:
        # Create a blank canvas as a list of lists of characters
        canvas = [[" " for _ in range(self.size.width)] for _ in range(self.size.height)]
        
        for bot in self.bots:
            # Bot's world position (using x and z)
            world_x, _, world_z = bot.position
            
            # Convert to screen coordinates
            screen_x, screen_y = self.world_to_screen(world_x, world_z)

            # Draw bot if it's within the visible area
            if 0 <= screen_x < self.size.width and 0 <= screen_y < self.size.height:
                symbol = "🤖"
                style = "bold blue"
                if bot.status == "IDLE":
                    style = "grey50"
                if self.selected_bot and self.selected_bot.id == bot.id:
                    style = "on yellow" # Highlight selected bot
                    
                # Place the character on the canvas
                canvas[screen_y][screen_x] = f"[{style}]{symbol}[/]"

        # Add some grid lines for reference
        for i in range(0, self.size.height, 10):
            wx, wy_start = self.screen_to_world(0, i)
            wx_end, wy_end = self.screen_to_world(self.size.width, i)
            if abs(wy_start % 250) < 150/self.zoom:
                 for x in range(self.size.width):
                     if canvas[i][x] == " ": canvas[i][x] = "[dim].[/dim]"

        # Convert the canvas to a single Text object for rendering
        text = Text("\n").join(Text("").join(row) for row in canvas)
        return Panel(text, title=f"Tactical Map (Zoom: {self.zoom:.2f}x)", border_style="cyan")
        
    def on_mouse_down(self, event) -> None:
        self.is_panning = True
        self.last_pan_pos = (event.x, event.y)
        
        # Check for bot selection
        clicked_world_x, clicked_world_y = self.screen_to_world(event.x, event.y)
        
        clicked_bot = None
        min_dist = 20 / self.world_to_screen_scale / self.zoom  # Click radius
        for bot in self.bots:
            dist = ((bot.position[0] - clicked_world_x)**2 + (bot.position[2] - clicked_world_y)**2)**0.5
            if dist < min_dist:
                clicked_bot = bot
                break
        
        if clicked_bot:
            self.parent.post_message(self.BotSelected(bot=clicked_bot))
        
    def on_mouse_up(self, event) -> None:
        self.is_panning = False

    def on_mouse_move(self, event) -> None:
        if self.is_panning:
            dx = event.x - self.last_pan_pos[0]
            dy = event.y - self.last_pan_pos[1]
            self.offset_x -= dx / (self.zoom * self.world_to_screen_scale)
            self.offset_y -= dy / (self.zoom * self.world_to_screen_scale)
            self.last_pan_pos = (event.x, event.y)
            self.refresh()
            
    def on_mouse_scroll_up(self, event) -> None:
        self.zoom *= 1.1
        self.refresh()

    def on_mouse_scroll_down(self, event) -> None:
        self.zoom *= 0.9
        self.refresh()
        
    def center_on_bot(self, bot: Bot):
        self.offset_x, _, self.offset_y = bot.position
        self.refresh()

    class BotSelected(App.Message):
        """Custom message for when a bot is selected."""
        def __init__(self, bot: Bot):
            self.bot = bot
            super().__init__()

class UnitSelection(VerticalScroll):
    """Panel for selecting a bot."""
    def update_bots(self, bots: List[Bot], selected_bot: Optional[Bot]):
        self.remove_children()
        for bot in bots:
            is_selected = selected_bot and selected_bot.id == bot.id
            variant = "success" if is_selected else "default"
            status_icon = '⚡' if bot.status == 'BUSY' else '⏸️'
            button = Button(f"{bot.id} {status_icon}", id=f"select_{bot.id}", variant=variant)
            self.mount(button)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        bot_id = event.button.id.split("_")[1]
        self.parent.post_message(self.BotButtonClicked(bot_id=bot_id))
        
    class BotButtonClicked(App.Message):
        def __init__(self, bot_id: str):
            self.bot_id = bot_id
            super().__init__()

class CommandCenter(Static):
    """The main command interface for the selected bot."""
    selected_bot = reactive(None)

    def compose(self) -> ComposeResult:
        with Vertical(id="cc_main"):
            yield Static("No unit selected.", id="cc_unit_info")
            with Horizontal(classes="cc_buttons"):
                yield Button("🚶 Move", id="cmd_move_to", variant="primary")
                yield Button("🛑 Cancel", id="cmd_cancel_job", variant="error")
                yield Button("❓ Query", id="cmd_get_status")
            with ContentSwitcher(initial="info", id="cc_options"):
                with Vertical(id="info"):
                    yield Label("Select a command.")
                with Vertical(id="move_to"):
                    yield Input(placeholder="X", id="move_x", type="number")
                    yield Input(placeholder="Y", id="move_y", type="number")
                    yield Input(placeholder="Z", id="move_z", type="number")
            yield Button("Execute Command", variant="success", id="execute_cmd", disabled=True)
            yield Static("Recent Activity: None", id="cc_bot_log")

    def watch_selected_bot(self, bot: Optional[Bot]):
        """Update the display when a new bot is selected."""
        info_panel = self.query_one("#cc_unit_info", Static)
        log_panel = self.query_one("#cc_bot_log", Static)
        execute_button = self.query_one("#execute_cmd", Button)
        
        if bot:
            pos_str = ", ".join(f"{p:.1f}" for p in bot.position)
            status_color = "green" if bot.status == "BUSY" else "yellow"
            info_panel.update(
                f"[b]{bot.id}[/]\n"
                f"Status: [{status_color}]{bot.status}[/]\n"
                f"Pos: {pos_str}\n"
                f"Job: {bot.currentJob}"
            )
            log_panel.update(f"Recent Activity: {bot.lastLog}")
            execute_button.disabled = False
        else:
            info_panel.update("No unit selected.")
            log_panel.update("Recent Activity: None")
            execute_button.disabled = True
            
    def on_button_pressed(self, event: Button.Pressed) -> None:
        switcher = self.query_one("#cc_options")
        if event.button.id.startswith("cmd_"):
            command = event.button.id.split("_")[1]
            switcher.current = command
        elif event.button.id == "execute_cmd":
            self.execute_command(switcher.current)

    def execute_command(self, command: str):
        if not self.selected_bot:
            return

        bot_id = self.selected_bot.index
        if command == "move_to":
            try:
                x = int(self.query_one("#move_x", Input).value)
                y = int(self.query_one("#move_y", Input).value)
                z = int(self.query_one("#move_z", Input).value)
                payload = {
                    "type": "command", "cmd": "move_to", "bot_id": bot_id,
                    "parameters": {"target": [x, y, z]}
                }
                self.parent.post_message(self.SendCommand(command=payload))
            except (ValueError, NoMatches):
                self.app.notify("Invalid coordinates for move command.", title="Command Error", severity="error")

# --- MAIN APPLICATION ---

class RedstoneBenchTUI(App):
    """The main TUI application class."""

    CSS_PATH = "redstone_tui.css"
    BINDINGS = [
        Binding("q", "quit", "Quit"),
    ]

    # --- Reactive State ---
    bots = reactive(dict)
    task_stats = reactive(TaskStats())
    connection_status = reactive("disconnected")
    selected_bot = reactive(None)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.controller = RedstoneBenchController(self)
        self.start_time = time.time()

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header()
        yield TopBar()
        with Container(id="main_container"):
            with Container(id="canvas_container"):
                yield BotCanvas()
                yield TaskProgressPanel(id="task_progress_panel")
            with Horizontal(id="bottom_panel"):
                with Vertical(id="left_column"):
                    yield Label("[b]🎯 Unit Selection[/b]")
                    yield UnitSelection()
                with Vertical(id="center_column"):
                    yield Label("[b]⚙️ Command Center[/b]")
                    yield CommandCenter()
                with Vertical(id="right_column"):
                    yield Label("[b]🗺️ Log[/b]")
                    yield RichLog(wrap=True)
        yield Footer()

    def on_mount(self) -> None:
        """Called when the app is first mounted."""
        self.controller.start()
        self.set_interval(1, self.update_timer)
        self.query_one(RichLog).write("TUI Initialized. Connecting to server...")

    # --- Message Handlers ---
    
    def on_unit_selection_bot_button_clicked(self, message: UnitSelection.BotButtonClicked):
        bot = self.bots.get(f"worker_{message.bot_id}")
        if bot:
            self.selected_bot = bot
            self.query_one(BotCanvas).center_on_bot(bot)

    def on_bot_canvas_bot_selected(self, message: BotCanvas.BotSelected):
        self.selected_bot = message.bot
    
    def on_command_center_send_command(self, message: CommandCenter.SendCommand):
        self.controller.send_command(message.command)
        self.notify(f"Command '{message.command['cmd']}' sent to bot {message.command['bot_id']}.")
        
    # --- WebSocket Data Handling ---

    def handle_websocket_message(self, data: Dict):
        """Routes incoming WebSocket data to the correct handler."""
        msg_type = data.get("type")
        log = self.query_one(RichLog)

        if msg_type == "status_response_all":
            updated_bots = self.bots.copy()
            for bot_id_str, bot_data in data.get("bots", {}).items():
                bot_id = int(bot_id_str)
                bot_key = f"worker_{bot_id}"
                if bot_key in updated_bots:
                    bot = updated_bots[bot_key]
                    bot.status = bot_data.get("status", bot.status)
                    result = bot_data.get("result", {})
                    bot.position = tuple(result.get("bot_position", bot.position))
                    bot.currentJob = result.get("current_job", bot.currentJob)
            self.bots = updated_bots

        elif msg_type in ["job_start", "job_complete", "job_failed", "command_response"]:
            bot_id = data.get("bot_id")
            bot_key = f"worker_{bot_id}"
            
            message = data.get("message", f"Event '{msg_type}' for bot {bot_id}")
            if msg_type == "job_start":
                message = f"Bot {bot_id} started job: {data.get('command')}"
            elif msg_type == "job_complete":
                message = f"Bot {bot_id} completed job."
            
            if bot_key in self.bots:
                self.bots[bot_key].lastLog = message
            
            log.write(f"[{self.get_time_str()}] {message}")
            
    # --- State Update Methods (called from controller thread) ---
    
    def update_connection_status(self, status: str):
        self.connection_status = status
        self.query_one(RichLog).write(f"Connection status changed: {status}")

    def initialize_bots(self, count: int):
        new_bots = {
            f"worker_{i}": Bot(id=f"worker_{i}", index=i)
            for i in range(count)
        }
        self.bots = new_bots
        self.task_stats = TaskStats(workerCount=count, startTime=time.time())

    # --- Reactive Watchers ---
    
    def watch_connection_status(self, status: str):
        top_bar = self.query_one(TopBar)
        color = "green" if status == "connected" else "yellow" if status == "connecting" else "red"
        top_bar.connection_status = (status, color)

    def watch_bots(self, bots: Dict[str, Bot]):
        bot_list = list(bots.values())
        self.query_one(BotCanvas).bots = bot_list
        self.query_one(UnitSelection).update_bots(bot_list, self.selected_bot)
        
        # If the currently selected bot's data updated, refresh the command center
        if self.selected_bot:
            updated_selected_bot = self.bots.get(self.selected_bot.id)
            if updated_selected_bot:
                self.selected_bot = updated_selected_bot

    def watch_selected_bot(self, bot: Optional[Bot]):
        self.query_one(CommandCenter).selected_bot = bot
        self.query_one(BotCanvas).selected_bot = bot
        # Re-render unit selection to show the new selection highlight
        self.query_one(UnitSelection).update_bots(list(self.bots.values()), bot)

    def watch_task_stats(self, stats: TaskStats):
        top_bar = self.query_one(TopBar)
        top_bar.worker_count = f"{stats.workerCount} Bots"
        top_bar.task_progress = f"{stats.completedBlocks}/{stats.totalBlocks}"

    # --- Helpers ---
    
    def update_timer(self):
        elapsed_seconds = int(time.time() - self.start_time)
        minutes, seconds = divmod(elapsed_seconds, 60)
        self.query_one(TopBar).elapsed_time = f"{minutes}:{seconds:02d}"

    def get_time_str(self):
        return time.strftime("%H:%M:%S")
        
    class SendCommand(App.Message):
        def __init__(self, command: Dict):
            self.command = command
            super().__init__()

# --- CSS for the TUI ---

REDSTONE_CSS = """
TopBar {
    width: 100%;
    height: 1;
    background: $primary;
    color: $text;
    dock: top;
    text-align: center;
}

#main_container {
    layout: grid;
    grid-size: 2 1;
    grid-columns: 1fr;
    grid-rows: 2fr 1fr;
    height: 100%;
}

#canvas_container {
    height: 100%;
    width: 100%;
    row-span: 1;
}

#task_progress_panel {
    background: $panel;
    border: round cyan;
    width: 30;
    height: 5;
    align: right top;
    margin-right: 2;
    margin-top: 1;
}

#bottom_panel {
    height: 100%;
    width: 100%;
    row-span: 1;
}

#left_column, #center_column, #right_column {
    border: round cyan;
    padding: 1;
    margin: 1;
}

#left_column { width: 20%; }
#center_column { width: 50%; }
#right_column { width: 30%; }

UnitSelection Button { width: 100%; margin-bottom: 1; }
CommandCenter #cc_main { height: 100%; }
CommandCenter .cc_buttons { height: 5; }
CommandCenter Button { width: 1fr; }
CommandCenter Input { margin-bottom: 1; }
CommandCenter #execute_cmd { width: 100%; margin-top: 1; }
CommandCenter #cc_unit_info { height: 5; }
"""

if __name__ == "__main__":
    # Start the mock server in a background thread
    server_thread = threading.Thread(target=run_mock_server, daemon=True)
    server_thread.start()
    time.sleep(1) # Give server a moment to start up

    # Create CSS file
    with open("redstone_tui.css", "w") as f:
        f.write(REDSTONE_CSS)

    # Run the TUI app
    app = RedstoneBenchTUI()
    app.run()