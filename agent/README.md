# KARTAVYA Windows agent

The FastAPI agent is intentionally runnable in `AGENT_MOCK=1` mode on any machine. It exposes `/health`, `/vitals`, `/api/state`, and a framed JSON WebSocket at `/ws`. Set `AGENT_MOCK=0` on Windows and install the optional desktop libraries from `requirements.txt` to enable native mouse, keyboard, process, and Vault integrations.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:AGENT_MOCK="1"
python main.py
```

The browser simulator is the reference client for the protocol, so every namespace can be exercised before native Windows permissions are configured.


## Remote relay mode

To let a phone connect over the public internet, deploy `/relay` to a long-running WebSocket service and start the Windows agent with the relay URL:

```powershell
$env:KARTAVYA_RELAY_URL="wss://your-relay.example.com/ws"
$env:KARTAVYA_RELAY_ROOM="KV-DEMO"
$env:KARTAVYA_TOKEN="KV-902A"
$env:AGENT_MOCK="0"
python main.py
```

The agent joins the same relay room as the phone, executes the framed command locally on Windows, and sends the ACK/telemetry back through the relay. This keeps the desktop-control process on the laptop; the cloud service only carries signaling/commands.
