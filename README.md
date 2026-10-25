# KARTAVYA // Spatial Tactile OS Controller

KARTAVYA turns a phone browser into a tactile control surface for a Windows laptop. The repository ships a polished, installable React PWA with a built-in live laptop simulator, a FastAPI Windows agent protocol, and a small WebSocket relay for remote sessions.

## Architecture

```text
┌──────────────────────────────┐       WSS / WebRTC upgrade       ┌────────────────────────┐
│ /pwa  KARTAVYA controller    │ ─────────────────────────────────▶│ /relay  signaling hub │
│ Vite + React + Three.js      │                                   │ Railway / Fly ready   │
│ phone PWA + AGENT_MOCK=1     │◀──────── RTCDataChannel ──────────│ room token + heartbeat │
└───────────────┬──────────────┘                                   └───────────┬────────────┘
                │ local Wi-Fi / WSS                                             │
                └───────────────────────┬──────────────────────────────────────┘
                                        ▼
                         ┌────────────────────────┐
                         │ /agent  Windows host   │
                         │ FastAPI + WebSocket    │
                         │ pyautogui / psutil    │
                         │ Vault + input adapters │
                         └────────────────────────┘
```

The root Vite app is the runnable `/pwa` tier. The `pwa/README.md` explains why the entry point stays at the repository root: judges can run one command without a second dependency tree, while the deployment boundary remains explicit in `/agent` and `/relay`.

The default route opens on an animated 3D landing page and asks whether the user is on a laptop or phone. Laptop mode exposes the host pairing station with a real QR generated from the agent WebSocket endpoint. Phone mode opens the mobile cockpit with gyro permission, screen wake lock, audio keep-alive, camera lens snipping, speech dictation, reconnect-safe offline command queue, and QR/manual pairing.

## What is working now

- Industrial anodized hardware UI: Syne, Plus Jakarta Sans, JetBrains Mono, dot-matrix chassis, specular gyro border, mechanical keycaps, haptic/audio detents.
- Built-in live Windows 11-style monitor and orbitable Three.js laptop twin. Click `VS Code`, `PowerPoint`, `Spotify`, or `Chrome` to context-morph the macro deck, crown label, screen shader, and telemetry.
- One-Euro-style trackpad surface, live coordinate crosshair, laser cursor, rotary crown, stage director, dual laser modes, air-draw ink, file portal beam, clipboard time machine, OTP pour, voice-dictation fallback, AI progress chips, Vault lock, Panic Palm, Knock Rhythm UI, and six pairing modes.
- PWA install metadata and generated service worker through `vite-plugin-pwa`.
- Agent protocol with framed `{action, payload, id, ts, token}` messages, ACK responses, vitals, process/app simulation, optional native input adapters, Vault controller, air-draw buffer, and ultrasonic FSK helpers.
- Relay protocol with token-checked rooms, peer join/leave events, message forwarding, health endpoint, and Dockerfile.

`AGENT_MOCK=1` is the default so the entire stage demo is repeatable without Windows permissions, a camera, an IMU, or a second device. Set `AGENT_MOCK=0` on Windows after installing optional native dependencies to connect the same protocol to real input and process APIs.

## Run the PWA

```bash
npm install
npm run dev -- --host 0.0.0.0
```

On the laptop, open the printed local URL and choose **I'm on my laptop**. To control that laptop from a phone on the same Wi-Fi, open the Vite **Network** URL on the phone, choose **I'm on my phone**, scan the live host QR (or paste the `ws://<laptop-LAN-IP>:8000/ws` endpoint), then press **CONNECT PHONE**. The host agent must be running on the laptop. For cloud mode, set `KARTAVYA_RELAY_URL` on the agent and put the public `wss://.../ws?room=KV-DEMO` relay endpoint in the phone pairing screen. Open the printed local URL. For a production check:

```bash
npm run build
npm run preview
```

The build emits `dist/manifest.webmanifest` and `dist/sw.js`. On Chrome Android, install the page as a PWA; on iOS, the UI gracefully falls back when device orientation, vibration, wake lock, or Web Speech APIs are unavailable.

## Run the mock agent

```bash
python -m venv .venv
# Linux/macOS
. .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r agent/requirements.txt
AGENT_MOCK=1 python agent/main.py
```

Windows native mode:

```powershell
$env:AGENT_MOCK="0"
$env:KARTAVYA_TOKEN="KV-902A"
python agent/main.py
```

The API is available at `http://127.0.0.1:8000/health`, `http://127.0.0.1:8000/vitals`, and `ws://127.0.0.1:8000/ws`.

## Recommended production hosting

Use a split deployment; **no cloud provider can replace the Windows agent**, because the agent must run on the user's Windows laptop to access `pyautogui`, `pywin32`, DXGI capture, webcam, speakers, and the system tray.

### Recommended: Vercel + Railway

- **Vercel:** host the static React/Vite PWA. `vercel.json` is included and rewrites SPA routes to `index.html`.
- **Railway:** host the `/relay` WebSocket service from `railway.json` and `relay/Dockerfile`. Set `KARTAVYA_TOKEN`, generate a public HTTPS domain, and use its `wss://.../ws` URL.
- **Windows laptop:** keep `/agent` running locally with `AGENT_MOCK=0` and set `KARTAVYA_RELAY_URL`, `KARTAVYA_RELAY_ROOM`, and `KARTAVYA_TOKEN`.

This gives the phone a trusted HTTPS PWA and a public WSS path while keeping OS control local to Windows. Railway's public networking supports WebSockets that can remain open indefinitely, which matches the relay's long-lived room connections.

### One-provider alternative: Render

`render.yaml` contains a two-service blueprint for the static PWA and Docker relay. Render web services accept inbound WebSockets and provide managed TLS; use the relay service URL as `wss://.../ws`. Render recommends keepalive pings and reconnect logic because instances can be replaced during deploys or maintenance.

### Why Railway is still the default relay choice

Vercel WebSockets are now generally available, but using them would require moving this raw Node `ws` server into a Vercel Function/WebSocket upgrade route, enabling Fluid compute, and adding external shared state for rooms across instances. Railway can run the existing `relay/server.js` unchanged as a long-lived service, so it is the lower-risk deployment for this repository. Vercel remains an excellent frontend host.

### Fly.io

Fly.io can also run the relay and supports WebSocket workloads, but it adds more VM/networking operations than this demo needs. Choose it when you specifically want region-aware machines, private networking, or TURN infrastructure.

## Run the relay

```bash
cd relay
npm install
npm start
```

- Health: `http://127.0.0.1:8787/health`
- WebSocket: `ws://127.0.0.1:8787/ws?room=KV-DEMO&token=KV-902A`
- Docker: `docker build -t kartavya-relay relay && docker run -p 8787:8787 kartavya-relay`

For a real HTTPS phone session, terminate TLS at the deployment edge and use `wss://`; the local agent should then exchange a WebRTC data channel after signaling. The mock simulator remains the source of truth for a zero-setup demo.

## Protocol namespaces

The agent accepts the requested namespaces, including `pair.*`, `trackpad.*`, `crown.rotate`, `key.send`, `text.type`, `otp.pour`, `app.*`, `window.*`, `media.*`, `ppt.*`, `clipboard.*`, `portal.file_upload`, `lens.paste`, `mirror.*`, `laser.*`, `airdraw.*`, `ai.*`, `vault.*`, `presence.ping`, `panic.trigger`, and `vitals.get`. Every request receives an action-specific `.ack` frame and the runtime broadcasts a `context.event` telemetry frame.

## Three-minute stage demo

1. **00:00–00:25 — Ultrasonic Chirp Pairing.** Open `PAIR`, select `19kHz CHIRP`, fire the synthesized chirp, and call out the PWA → WSS → local RTC upgrade path. QR, mDNS, cloud token, PIN, and Knock 2FA are one tap away.
2. **00:25–00:55 — Tactile control.** Drag the recessed trackpad, hit L-CLK/R-CLK, and rotate the crown. The monitor crosshair, 3D twin laser sphere, detent audio, and telemetry bus move together.
3. **00:55–01:20 — Context morph.** Click `VS Code`, then `PowerPoint`, then `Spotify` on the live laptop monitor. The macro keycaps, crown binding, and screen shader morph instantly.
4. **01:20–01:50 — Stage Director.** Enter the Stage tab, advance slides, blackout, select `GYRO-60HZ`, enable Air-Draw, pick Signal Orange, and draw on the simulated screen.
5. **01:50–02:10 — Edge Portal.** Open `3D APPS`, fling `Slide_Diagram_3D.png`, and show the top bezel portal pulse plus desktop drop telemetry.
6. **02:10–02:35 — Voice AI.** Open `AI & VAULT`, run the prefilled goal, and let the four whitelisted telemetry chips complete.
7. **02:35–03:00 — Panic Palm + Knock.** Trigger Panic Palm, show the Vault overlay and five-frame capture status, then use four knock taps to unlock. Explain that native Windows `LockWorkStation` is optional and the reliable user-space Vault remains available for the live demo.

## Verification

```bash
npm run build
python -m py_compile agent/main.py agent/vault_lock.py agent/overlay_airdraw.py agent/ultrasonic_fsk.py
node --check relay/server.js
```

The UI is deliberately a simulator-first product: native OS control, DXGI capture, WebRTC video encoding, MediaPipe, and ultrasonic microphone decoding are isolated behind adapters so unsupported browsers and non-Windows machines still get the full interaction model instead of a dead screen.
