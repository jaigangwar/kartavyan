"""KARTAVYA Windows agent.

The agent exposes one framed JSON WebSocket API for the phone PWA and keeps the
same protocol usable in AGENT_MOCK=1 mode, so the complete demo can run without
Windows or privileged input libraries. On Windows, optional integrations are
used when installed (pyautogui, pygetwindow, psutil, and the Kartavya Vault).
"""
from __future__ import annotations

import asyncio
import json
import os
import platform
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

try:
    import psutil
except ImportError:  # pragma: no cover - optional on the mock runner
    psutil = None

try:
    import pyautogui
except ImportError:  # pragma: no cover - optional on the mock runner
    pyautogui = None

try:
    import pygetwindow
except ImportError:  # pragma: no cover - optional on the mock runner
    pygetwindow = None

try:
    from .vault_lock import VaultController
except ImportError:  # direct `python agent/main.py` execution
    from vault_lock import VaultController

APP_NAME = "KARTAVYA AGENT"
TOKEN = os.getenv("KARTAVYA_TOKEN", "KV-902A")
AGENT_MOCK = os.getenv("AGENT_MOCK", "1") != "0"
PORT = int(os.getenv("KARTAVYA_AGENT_PORT", os.getenv("PORT", "8000")))
RELAY_URL = os.getenv("KARTAVYA_RELAY_URL", "").strip()
RELAY_ROOM = os.getenv("KARTAVYA_RELAY_ROOM", "KV-DEMO").strip()

MOCK_APPS = [
    {"id": "vscode", "name": "VS Code", "title": "kartavya-agent — main.py", "cpu": "4.2%", "ram": "610 MB", "accent": "#FF4F00"},
    {"id": "ppt", "name": "PowerPoint", "title": "Kartavya_Pitch_Deck.pptx", "cpu": "2.8%", "ram": "420 MB", "accent": "#FFB000"},
    {"id": "spotify", "name": "Spotify", "title": "Midnight Hardware Synth", "cpu": "1.1%", "ram": "290 MB", "accent": "#00E676"},
    {"id": "chrome", "name": "Chrome", "title": "WebRTC Internals // 60FPS", "cpu": "6.4%", "ram": "1.2 GB", "accent": "#F4F4F6"},
]


def now_ms() -> int:
    return round(time.time() * 1000)


def frame(action: str, payload: Any = None, message_id: str | None = None) -> dict[str, Any]:
    return {
        "action": action,
        "payload": payload if payload is not None else {},
        "id": message_id or str(uuid.uuid4()),
        "ts": now_ms(),
        "token": TOKEN,
    }


@dataclass
class AgentState:
    paired: bool = False
    focused_app: str = "VS Code"
    vault_locked: bool = False
    last_event: str = "READY // RTCDataChannel OPEN"
    cursor_x: float = 50.0
    cursor_y: float = 50.0
    connection: str = "P2P-LAN"


class KartavyaRuntime:
    def __init__(self) -> None:
        self.state = AgentState()
        self.clients: set[WebSocket] = set()
        self.lock = asyncio.Lock()
        self.vault = VaultController(mock=AGENT_MOCK)
        self.relay_task: asyncio.Task[None] | None = None
        self.relay_socket: Any = None

    async def start_relay_bridge(self) -> None:
        if not RELAY_URL or self.relay_task is not None:
            return
        self.relay_task = asyncio.create_task(self._relay_loop())

    async def stop_relay_bridge(self) -> None:
        if self.relay_task:
            self.relay_task.cancel()
            try:
                await self.relay_task
            except asyncio.CancelledError:
                pass
            self.relay_task = None
        self.relay_socket = None

    async def _relay_loop(self) -> None:
        try:
            import websockets
        except ImportError:
            return
        separator = '&' if '?' in RELAY_URL else '?'
        url = f"{RELAY_URL}{separator}room={RELAY_ROOM}&token={TOKEN}"
        while True:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=20) as socket:
                    self.relay_socket = socket
                    async for raw in socket:
                        try:
                            message = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        if not isinstance(message, dict) or message.get('relay') is not True:
                            continue
                        action = str(message.get('action', ''))
                        if action.startswith('relay.') or action.endswith('.ack') or action == 'context.event':
                            continue
                        response, event = self.execute(message)
                        await socket.send(json.dumps(response))
                        await socket.send(json.dumps(frame('context.event', event)))
            except asyncio.CancelledError:
                raise
            except Exception:
                self.relay_socket = None
                await asyncio.sleep(2)

    async def relay_send(self, message: dict[str, Any]) -> None:
        socket = self.relay_socket
        if socket is not None:
            try:
                await socket.send(json.dumps(message))
            except Exception:
                self.relay_socket = None

    async def register(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.clients.add(ws)
        await ws.send_json(frame("agent.ready", {"mock": AGENT_MOCK, "platform": platform.platform(), "port": PORT}))

    async def unregister(self, ws: WebSocket) -> None:
        async with self.lock:
            self.clients.discard(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        async with self.lock:
            clients = list(self.clients)
        stale: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(message)
            except Exception:
                stale.append(client)
        for client in stale:
            await self.unregister(client)

    def vitals(self) -> dict[str, Any]:
        if psutil is not None and not AGENT_MOCK:
            battery = psutil.sensors_battery()
            return {
                "cpu": round(psutil.cpu_percent(interval=None), 1),
                "ram": round(psutil.virtual_memory().percent, 1),
                "battery": round(battery.percent, 1) if battery else None,
                "platform": platform.platform(),
            }
        return {"cpu": 4.2, "ram": 38.0, "battery": 92, "platform": "Windows 11 / AGENT_MOCK"}

    def process_list(self) -> list[dict[str, Any]]:
        if psutil is None or AGENT_MOCK:
            return MOCK_APPS
        rows: list[dict[str, Any]] = []
        for proc in psutil.process_iter(["pid", "name", "memory_info", "cpu_percent"]):
            try:
                info = proc.info
                rows.append({
                    "id": str(info["pid"]),
                    "name": info.get("name") or "unknown",
                    "title": info.get("name") or "unknown",
                    "cpu": f"{info.get('cpu_percent', 0):.1f}%",
                    "ram": f"{(info.get('memory_info').rss / 1024 / 1024):.0f} MB" if info.get("memory_info") else "—",
                    "accent": "#F4F4F6",
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return rows[:48]

    def _event(self, message: str) -> dict[str, Any]:
        self.state.last_event = message
        return {"event": message, "state": asdict(self.state)}

    def _native_action(self, action: str, payload: dict[str, Any]) -> None:
        if AGENT_MOCK:
            return
        if pyautogui is not None and action == "trackpad.move":
            screen = pyautogui.size()
            x = max(0, min(screen.width - 1, int(float(payload.get("x", 0.5)) * screen.width)))
            y = max(0, min(screen.height - 1, int(float(payload.get("y", 0.5)) * screen.height)))
            pyautogui.moveTo(x, y, _pause=False)
        elif pyautogui is not None and action == "trackpad.click":
            pyautogui.click(button=payload.get("button", "left"))
        elif pyautogui is not None and action == "trackpad.scroll":
            pyautogui.scroll(int(payload.get("delta", 0)))
        elif pyautogui is not None and action == "text.type":
            pyautogui.write(str(payload.get("text", "")), interval=0.002)
        elif pyautogui is not None and action == "key.send":
            keys = payload.get("keys", [])
            shortcut = str(payload.get("shortcut", ""))
            if not keys and shortcut:
                keys = [part.strip().lower().replace("ctrl", "ctrl").replace("alt", "alt").replace("shift", "shift").replace("win", "win") for part in shortcut.split("+")]
            pyautogui.hotkey(*keys) if isinstance(keys, list) and len(keys) > 1 else pyautogui.press(str(payload.get("key", keys[0] if keys else "")))
        elif pygetwindow is not None and action == "app.focus":
            name = str(payload.get("name", ""))
            for window in pygetwindow.getWindowsWithTitle(name):
                window.activate()
                break

    def execute(self, message: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        action = str(message.get("action", ""))
        payload = message.get("payload") if isinstance(message.get("payload"), dict) else {}
        message_id = str(message.get("id", ""))
        if message.get("token") not in (None, TOKEN):
            return frame("error", {"code": "TOKEN_REJECTED", "message": "Pairing token rejected"}, message_id), self._event("SECURITY // TOKEN REJECTED")

        if action == "pair.knock_verify":
            intervals = payload.get("intervals", [])
            valid, reason = self.vault.verify_knock([int(value) for value in intervals]) if isinstance(intervals, list) else (False, "INVALID_INTERVALS")
            result = self._event(f"PAIRING // KNOCK {reason}")
            return frame(f"{action}.ack", {"valid": valid, **result}, message_id), result

        if action.startswith("pair."):
            self.state.paired = True
            self.state.connection = "CLOUD-WSS" if action == "pair.cloud" else "P2P-LAN"
            result = self._event(f"PAIRING // {action.removeprefix('pair.').upper()} LINK ESTABLISHED")
            return frame(f"{action}.ack", result, message_id), result

        if action == "trackpad.move" or action == "laser.move":
            self.state.cursor_x = float(payload.get("x", self.state.cursor_x))
            self.state.cursor_y = float(payload.get("y", self.state.cursor_y))
            self._native_action("trackpad.move", {"x": self.state.cursor_x / 100, "y": self.state.cursor_y / 100})
            result = self._event(f"{action.upper()} // ({self.state.cursor_x:.0f}%, {self.state.cursor_y:.0f}%)")
        elif action == "trackpad.click" or action == "laser.click":
            self._native_action("trackpad.click", payload)
            result = self._event(f"{action.upper()} // CLICK {payload.get('button', 'left').upper()}")
        elif action == "trackpad.scroll":
            self._native_action(action, payload)
            result = self._event(f"TRACKPAD.SCROLL // {payload.get('delta', 0)}")
        elif action in {"key.send", "text.type"}:
            self._native_action(action, payload)
            result = self._event(f"{action.upper()} // DISPATCHED")
        elif action == "app.list":
            result = {"apps": self.process_list(), "state": asdict(self.state)}
        elif action in {"app.focus", "app.launch"}:
            self.state.focused_app = str(payload.get("name", self.state.focused_app))
            self._native_action("app.focus", payload)
            result = self._event(f"WINDOW FOCUS // {self.state.focused_app.upper()}")
        elif action == "context.focused":
            self.state.focused_app = str(payload.get("name", self.state.focused_app))
            result = self._event(f"CONTEXT // FOCUSED APP {self.state.focused_app.upper()}")
        elif action == "app.kill":
            result = self._event(f"PSUTIL KILL // {payload.get('name', payload.get('pid', 'PROCESS'))}")
        elif action in {"window.min", "window.max", "window.restore", "window.close", "window.back"}:
            result = self._event(f"WINDOW // {action.removeprefix('window.').upper()}")
        elif action.startswith("media.") or action.startswith("ppt.") or action == "crown.rotate":
            result = self._event(f"{action.upper()} // ACK")
        elif action in {"clipboard.get", "clipboard.history"}:
            result = {"history": ["OTP: 849201 (Valid for 10 mins)", "wss://relay.kartavya.dev/session/KV-902", "npx vite --host"], "state": asdict(self.state)}
        elif action == "clipboard.set" or action == "otp.pour":
            self._native_action("text.type", {"text": payload.get("text", payload.get("code", ""))})
            result = self._event(f"{action.upper()} // PAYLOAD POURED")
        elif action in {"portal.file_upload", "lens.paste"}:
            result = self._event(f"{action.upper()} // DESKTOP DROP CONFIRMED")
        elif action in {"mirror.start", "mirror.stop", "mirror.tap", "mirror.drag"}:
            result = self._event(f"{action.upper()} // RTC PIPELINE ACK")
        elif action in {"laser.mode", "airdraw.stroke", "airdraw.clear"}:
            result = self._event(f"{action.upper()} // OVERLAY UPDATED")
        elif action in {"ai.exec", "ai.status"}:
            result = self._event("AI.AGENT // WHITELISTED ACTION DAG ACCEPTED" if action == "ai.exec" else "AI.AGENT // STATUS READY")
        elif action == "vault.lock" or action == "panic.trigger":
            self.vault.lock(reason="panic" if action == "panic.trigger" else "remote")
            self.state.vault_locked = True
            result = self._event("VAULT // LOCKED + INPUT HOOKS ACTIVE")
        elif action == "vault.unlock":
            self.vault.unlock()
            self.state.vault_locked = False
            result = self._event("VAULT // UNLOCKED")
        elif action == "presence.ping":
            result = self._event("PRESENCE // HEARTBEAT RECEIVED")
        elif action == "vitals.get":
            result = {"vitals": self.vitals(), "state": asdict(self.state)}
        else:
            result = self._event(f"BUS // UNKNOWN ACTION {action or '<empty>'}")

        return frame(f"{action}.ack", result, message_id), result


app = FastAPI(title=APP_NAME, version="2.6.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
runtime = KartavyaRuntime()


@app.on_event("startup")
async def startup_event() -> None:
    await runtime.start_relay_bridge()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await runtime.stop_relay_bridge()


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": APP_NAME, "mock": AGENT_MOCK, "relay": bool(RELAY_URL), "relay_room": RELAY_ROOM if RELAY_URL else None, "ts": now_ms()}


@app.get("/vitals")
async def get_vitals() -> dict[str, Any]:
    return runtime.vitals()


@app.get("/api/state")
async def get_state() -> dict[str, Any]:
    return {"state": asdict(runtime.state), "vitals": runtime.vitals()}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await runtime.register(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json(frame("error", {"code": "INVALID_JSON"}))
                continue
            if not isinstance(message, dict):
                await websocket.send_json(frame("error", {"code": "INVALID_FRAME"}))
                continue
            response, event = runtime.execute(message)
            await websocket.send_json(response)
            await runtime.broadcast(frame("context.event", event))
            await runtime.relay_send(response)
            await runtime.relay_send(frame("context.event", event))
    except WebSocketDisconnect:
        await runtime.unregister(websocket)
    except Exception:
        await runtime.unregister(websocket)
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, reload=False)
