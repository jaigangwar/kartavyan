# KARTAVYA PWA

The runnable PWA is kept at the repository root so judges can launch it with one command (`npm run dev`). This folder documents the intended product boundary: the root Vite entry point, `src/` UI, generated `manifest.webmanifest`, and service worker are the `/pwa` tier of the KARTAVYA stack. Keeping the entry point at root avoids a second dependency tree while preserving the requested `/pwa`, `/agent`, and `/relay` separation for deployment.

The UI includes `AGENT_MOCK` behavior in the live laptop simulator. Switching apps, moving the trackpad, rotating the crown, driving Stage Director, pairing, pouring an OTP, running the whitelisted AI flow, and engaging the Vault all work without a Windows host.


## Mobile launch flow

The default root route is an animated landing page. Choose **I’m on my laptop** to expose the host pairing station, or **I’m on my phone** to enter the mobile cockpit. On the same Wi-Fi, start the agent on the laptop, run Vite with `--host 0.0.0.0`, open the Vite Network URL on the phone, scan the host QR, and press **CONNECT PHONE**. If QR scanning is unavailable, paste the generated `ws://<laptop-LAN-IP>:8000/ws` endpoint and token.
