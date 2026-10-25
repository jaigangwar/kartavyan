import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Cpu,
  Wifi,
  BatteryCharging,
  ShieldAlert,
  Lock,
  Unlock,
  Crosshair,
  Layers,
  Presentation,
  Monitor,
  Bot,
  QrCode,
  Radio,
  Waves,
  KeyRound,
  Fingerprint,
  Play,
  SkipForward,
  SkipBack,
  Volume2,
  Terminal,
  Bug,
  GitBranch,
  Send,
  Upload,
  CheckCircle2,
  Sparkles,
  Trash2,
  Eye,
  Mic,
  ClipboardCheck,
  RefreshCw,
  Smartphone,
  Download,
  RotateCcw,
  Activity,
  Camera,
  StopCircle,
  Copy,
  ScanLine,
  Zap,
  WifiOff,
} from 'lucide-react';
import { tactile } from './utils/soundAndHaptics';
import { LaptopDigitalTwin3D } from './components/LaptopDigitalTwin3D';
import { TactileRotaryCrown } from './components/TactileRotaryCrown';
import { LandingExperience } from './components/LandingExperience';
import { KartavyaTransport } from './utils/kartavyaTransport';
import {
  acquireScreenWakeLock,
  copyToClipboard,
  detectMobileCapabilities,
  getSpeechRecognitionConstructor,
  requestMotionPermission,
  startSilentAudioKeepAlive,
  type InstallPromptEvent,
  type MobileCapabilities,
} from './utils/mobileCapabilities';

type TabId = 'trackpad' | 'apps' | 'stage' | 'mirror' | 'ai';
type EntryMode = 'landing' | 'laptop' | 'phone';

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}
type FocusedApp = 'VS Code' | 'PowerPoint' | 'Spotify' | 'Chrome';

interface StrokePoint {
  x: number;
  y: number;
  color: string;
}

interface RunningProcess {
  id: string;
  name: FocusedApp | 'Explorer' | 'Blender 3D';
  title: string;
  cpu: string;
  ram: string;
  accent: string;
}

const SLIDES = [
  {
    num: 1,
    title: 'KARTAVYA // SPATIAL ARCHITECTURE',
    bullet: 'Sub-5ms P2P WebRTC DataChannel + DXGI GPU Screen Pipeline',
    notes: 'Open with the Ultrasonic Chirp handshake demo, then show 60Hz Gyro Laser.',
  },
  {
    num: 2,
    title: 'ZERO MIXED-CONTENT SECURITY',
    bullet: 'HTTPS PWA -> WSS Signaling -> Local UDP RTCDataChannel',
    notes: 'Explain how we bypass Chrome mixed-content blocks without sacrificing LAN speed.',
  },
  {
    num: 3,
    title: 'DUAL-LAYER VAULT & KNOCK 2FA',
    bullet: 'Low-level pywin32 Input Hooks + Tempo-Invariant Rhythm Hash',
    notes: 'Tap the 3-beat knock rhythm on the phone to unlock the live laptop overlay.',
  },
  {
    num: 4,
    title: 'AUTONOMOUS DESKTOP AI AGENT',
    bullet: 'Voice -> Whitelisted Action DAG -> Live Telemetry Chips',
    notes: 'Trigger voice command: "Split VS Code and run production build".',
  },
];

const getRuntimeEnv = () => (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const getDefaultRelayEndpoint = () => {
  const env = getRuntimeEnv();
  if (env.VITE_RELAY_WS_URL) return env.VITE_RELAY_WS_URL;
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8787/ws?room=KV-DEMO';
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8787/ws?room=KV-DEMO`;
};

const getDefaultAgentEndpoint = () => {
  const env = getRuntimeEnv();
  if (env.VITE_RELAY_WS_URL) return env.VITE_RELAY_WS_URL;
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:8000/ws`;
};

export function App() {
  const [entryMode, setEntryMode] = useState<EntryMode>('landing');
  const [activeTab, setActiveTab] = useState<TabId>('trackpad');
  const [showLiveLaptopSim, setShowLiveLaptopSim] = useState<boolean>(true);
  const [showPairingModal, setShowPairingModal] = useState<boolean>(false);
  const [pairingMode, setPairingMode] = useState<'qr' | 'mdns' | 'ultrasonic' | 'cloud' | 'pin' | 'knock'>('ultrasonic');
  const [pairingEndpoint, setPairingEndpoint] = useState<string>(() => getDefaultAgentEndpoint());
  const [pairingToken, setPairingToken] = useState<string>(() => localStorage.getItem('kartavya:token') || 'KV-902A');
  const [qrScanning, setQrScanning] = useState<boolean>(false);

  const [connectionMode, setConnectionMode] = useState<'P2P-LAN' | 'CLOUD-WSS'>('P2P-LAN');
  const [pingMs, setPingMs] = useState<number>(4);
  const [focusedApp, setFocusedApp] = useState<FocusedApp>('VS Code');
  const [crownValue, setCrownValue] = useState<number>(68);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 52, y: 48 });
  const [lastLaptopEvent, setLastLaptopEvent] = useState<string>('READY // AGENT_MOCK SIMULATOR ONLINE');
  const [agentConnected, setAgentConnected] = useState<boolean>(false);
  const [queuedCommands, setQueuedCommands] = useState<number>(0);
  const [mobileCapabilities, setMobileCapabilities] = useState<MobileCapabilities | null>(null);
  const [motionReady, setMotionReady] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [audioKeepAliveActive, setAudioKeepAliveActive] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [mobileNotice, setMobileNotice] = useState<string>('SIMULATOR READY // ARM MOBILE MODE FOR GYRO + WAKE LOCK');
  const [speechLocale, setSpeechLocale] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [lensCapture, setLensCapture] = useState<string | null>(null);

  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(false);
  const [panicTriggered, setPanicTriggered] = useState<boolean>(false);
  const [recordedKnocks, setRecordedKnocks] = useState<number[]>([220, 220, 480]);
  const [knockAttemptCount, setKnockAttemptCount] = useState<number>(0);
  const lastKnockTs = useRef<number>(0);

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [slideBlackout, setSlideBlackout] = useState<boolean>(false);
  const [laserMode, setLaserMode] = useState<'OFF' | 'GYRO-60HZ' | 'CAMERA-HAND'>('OFF');
  const [airDrawEnabled, setAirDrawEnabled] = useState<boolean>(false);
  const [inkColor, setInkColor] = useState<string>('#FF4F00');
  const [inkStrokes, setInkStrokes] = useState<StrokePoint[]>([]);

  const [processes, setProcesses] = useState<RunningProcess[]>([
    { id: 'p1', name: 'VS Code', title: 'kartavya-agent — main.py', cpu: '4.2%', ram: '610 MB', accent: '#FF4F00' },
    { id: 'p2', name: 'PowerPoint', title: 'Kartavya_Pitch_Deck.pptx', cpu: '2.8%', ram: '420 MB', accent: '#FFB000' },
    { id: 'p3', name: 'Spotify', title: 'Synthwave Focus Mix', cpu: '1.1%', ram: '290 MB', accent: '#00E676' },
    { id: 'p4', name: 'Chrome', title: 'WebRTC Internals // 60FPS', cpu: '6.4%', ram: '1.2 GB', accent: '#F4F4F6' },
  ]);
  const [portalBeamActive, setPortalBeamActive] = useState<boolean>(false);
  const [beamedFiles, setBeamedFiles] = useState<string[]>(['Architecture_Diagram_V2.png']);

  const [clipboardHistory] = useState<string[]>([
    'OTP: 849201 (Valid for 10 mins)',
    'wss://relay.kartavya.dev/session/KV-902',
    'npx vite --host',
  ]);
  const [typedTextOnLaptop, setTypedTextOnLaptop] = useState<string>('');

  const [aiPrompt, setAiPrompt] = useState<string>('Open PowerPoint, jump to Slide 3, and highlight architecture');
  const [aiSteps, setAiSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [aiRunning, setAiRunning] = useState<boolean>(false);

  const trackpadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transportRef = useRef<KartavyaTransport | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAliveStopRef = useRef<(() => void) | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const lensVideoRef = useRef<HTMLVideoElement | null>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const speechRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const lastMotionRef = useRef({ gamma: 0, beta: 45 });
  const gyroBaselineRef = useRef({ gamma: 0, beta: 45 });
  const trackpadPointerRef = useRef<number | null>(null);
  const pairingQrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pairingVideoRef = useRef<HTMLVideoElement | null>(null);
  const pairingStreamRef = useRef<MediaStream | null>(null);
  const pairingScanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const transport = new KartavyaTransport();
    transportRef.current = transport;
    const unsubscribeMessage = transport.onMessage((message) => {
      if (message.action === 'agent.ready') {
        setLastLaptopEvent('READY // AGENT LINK OPEN');
      }
      if (message.action === 'context.event') {
        const event = message.payload?.event;
        if (typeof event === 'string') setLastLaptopEvent(event);
      }
    });
    const unsubscribeStatus = transport.onStatus(setAgentConnected);
    const unsubscribeQueue = transport.onQueue(setQueuedCommands);
    transport.connect();
    const heartbeat = window.setInterval(() => transport.send('presence.ping'), 5000);
    return () => {
      window.clearInterval(heartbeat);
      unsubscribeMessage();
      unsubscribeStatus();
      unsubscribeQueue();
      transport.close();
      transportRef.current = null;
    };
  }, []);

  const dispatchAction = (action: string, payload: Record<string, unknown> = {}) => {
    transportRef.current?.send(action, payload);
  };

  useEffect(() => {
    setMobileCapabilities(detectMobileCapabilities());
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode');
    if (requestedMode === 'laptop' || requestedMode === 'phone') setEntryMode(requestedMode);
    const requestedTab = params.get('tab');
    if (requestedTab && ['trackpad', 'apps', 'stage', 'mirror', 'ai'].includes(requestedTab)) {
      setActiveTab(requestedTab as TabId);
    }
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    if (!showPairingModal || pairingMode !== 'qr' || !pairingQrCanvasRef.current) return;
    const payload = JSON.stringify({
      type: 'kartavya-pair',
      url: pairingEndpoint,
      token: pairingToken,
      relayUrl: getDefaultRelayEndpoint(),
      room: 'KV-DEMO',
    });
    void QRCode.toCanvas(pairingQrCanvasRef.current, payload, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#08080A', light: '#F4F4F6' },
    });
  }, [showPairingModal, pairingMode, pairingEndpoint, pairingToken]);

  useEffect(() => () => {
    pairingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (pairingScanTimerRef.current) window.clearInterval(pairingScanTimerRef.current);
  }, []);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && wakeLockActive) {
        const lock = await acquireScreenWakeLock();
        if (lock) {
          wakeLockRef.current = lock;
          setWakeLockActive(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [wakeLockActive]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    keepAliveStopRef.current?.();
    void wakeLockRef.current?.release();
  }, []);

  const parsePairingPayload = (raw: string) => {
    try {
      const payload = JSON.parse(raw) as { url?: string; token?: string; relayUrl?: string };
      if (!payload.url || !payload.token) throw new Error('missing pairing fields');
      setPairingEndpoint(payload.url);
      setPairingToken(payload.token);
      localStorage.setItem('kartavya:token', payload.token);
      setMobileNotice('PAIRING PAYLOAD LOADED // PRESS CONNECT TO BIND');
      return true;
    } catch {
      setMobileNotice('PAIRING PAYLOAD INVALID // USE THE FULL WS URL AND TOKEN');
      return false;
    }
  };

  const connectToPairing = () => {
    const endpoint = pairingEndpoint.trim();
    if (!/^wss?:\/\//i.test(endpoint)) {
      setMobileNotice('PAIRING ERROR // URL MUST START WITH ws:// OR wss://');
      return;
    }
    localStorage.setItem('kartavya:token', pairingToken.trim() || 'KV-902A');
    transportRef.current?.configure(endpoint, pairingToken.trim() || 'KV-902A');
    window.setTimeout(() => dispatchAction(`pair.${pairingMode}`, { endpoint, token: pairingToken.trim() || 'KV-902A' }), 350);
    setConnectionMode(endpoint.startsWith('wss://') ? 'CLOUD-WSS' : 'P2P-LAN');
    setLastLaptopEvent(`PAIRING // CONNECTING TO ${endpoint}`);
    setMobileNotice('PAIRING BUS // CONNECTING…');
    tactile.playPortalBeam();
    setShowPairingModal(false);
  };

  const startQrScan = async () => {
    const BarcodeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector;
    if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMobileNotice('QR SCAN FALLBACK // USE MANUAL WS URL + TOKEN');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      pairingStreamRef.current = stream;
      setQrScanning(true);
      if (pairingVideoRef.current) {
        pairingVideoRef.current.srcObject = stream;
        await pairingVideoRef.current.play();
      }
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      pairingScanTimerRef.current = window.setInterval(async () => {
        const video = pairingVideoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue;
          if (raw && parsePairingPayload(raw)) stopQrScan();
        } catch {
          // Keep scanning; some mobile browsers reject a frame while rotating.
        }
      }, 450);
    } catch {
      setMobileNotice('QR CAMERA BLOCKED // ALLOW CAMERA OR USE MANUAL PAIRING');
    }
  };

  const stopQrScan = () => {
    pairingStreamRef.current?.getTracks().forEach((track) => track.stop());
    pairingStreamRef.current = null;
    if (pairingScanTimerRef.current) window.clearInterval(pairingScanTimerRef.current);
    pairingScanTimerRef.current = null;
    setQrScanning(false);
  };

  const armMobileDeck = async () => {
    tactile.playMechClick(1.15);
    const motionGranted = await requestMotionPermission();
    setMotionReady(motionGranted);
    if (motionGranted) {
      gyroBaselineRef.current = lastMotionRef.current;
    }
    const lock = await acquireScreenWakeLock();
    if (lock) {
      wakeLockRef.current = lock;
      setWakeLockActive(true);
    }
    const stopKeepAlive = startSilentAudioKeepAlive();
    if (stopKeepAlive) {
      keepAliveStopRef.current = stopKeepAlive;
      setAudioKeepAliveActive(true);
    }
    const cameraReady = Boolean(navigator.mediaDevices?.getUserMedia);
    setMobileNotice(`${motionGranted ? 'GYRO READY' : 'GYRO FALLBACK'} // ${lock ? 'WAKE LOCK ARMED' : 'WAKE LOCK UNAVAILABLE'} // ${cameraReady ? 'LENS READY' : 'LENS FALLBACK'}`);
    tactile.vibrate([12, 28, 12]);
  };

  const releaseMobileDeck = () => {
    tactile.playMechClick(0.75);
    keepAliveStopRef.current?.();
    keepAliveStopRef.current = null;
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setWakeLockActive(false);
    setAudioKeepAliveActive(false);
    setMobileNotice('MOBILE DECK SLEEPING // SIMULATOR CONTROLS REMAIN AVAILABLE');
  };

  const installApp = async () => {
    tactile.playMechClick(1.1);
    if (!installPrompt) {
      setMobileNotice('INSTALL FALLBACK // OPEN BROWSER MENU → ADD TO HOME SCREEN');
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    setMobileNotice(result.outcome === 'accepted' ? 'PWA INSTALLED // KARTAVYA IS NOW A HOME-SCREEN CONTROLLER' : 'INSTALL DEFERRED // YOU CAN RETRY FROM THE BROWSER MENU');
  };

  const recenterGyro = () => {
    tactile.playRotaryDetent();
    gyroBaselineRef.current = lastMotionRef.current;
    setMobileNotice('GYRO CLUTCH // CURRENT PHONE ANGLE SET AS ZERO');
    setCursorPos({ x: 50, y: 50 });
    dispatchAction('laser.move', { x: 50, y: 50, recentered: true });
  };

  const toggleVoiceDictation = () => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setMobileNotice('VOICE FALLBACK // SPEECH API UNAVAILABLE; TYPE INTO THE STREAM');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = speechLocale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setTypedTextOnLaptop(transcript);
      setLastLaptopEvent(`VOICE ${speechLocale} // STREAMED "${transcript.toUpperCase()}"`);
      dispatchAction('text.type', { text: transcript, locale: speechLocale });
    };
    recognition.onerror = () => setMobileNotice('VOICE ERROR // CHECK MIC PERMISSION OR USE TEXT FALLBACK');
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    speechRecognitionRef.current = recognition;
    setIsListening(true);
    setMobileNotice(`VOICE ARM // LISTENING ${speechLocale}`);
    recognition.start();
  };

  const startLensCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMobileNotice('LENS FALLBACK // CAMERA API UNAVAILABLE');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      setCameraStream(stream);
      if (lensVideoRef.current) {
        lensVideoRef.current.srcObject = stream;
        await lensVideoRef.current.play();
      }
      setMobileNotice('LENS ONLINE // FRAME A WHITEBOARD OR NOTEBOOK');
    } catch {
      setMobileNotice('LENS BLOCKED // ALLOW CAMERA IN THE BROWSER OR USE THE SIMULATED SNAP');
    }
  };

  const stopLensCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    if (lensVideoRef.current) lensVideoRef.current.srcObject = null;
    setMobileNotice('LENS OFFLINE // CAMERA RELEASED');
  };

  const captureLensFrame = () => {
    const video = lensVideoRef.current;
    const canvas = lensCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setMobileNotice('LENS SIM SNAP // NO LIVE FRAME; USE THE SIMULATOR PAYLOAD');
      setLastLaptopEvent('LENS.SNIP // SIMULATED WHITEBOARD FRAME PASTED');
      dispatchAction('lens.paste', { source: 'simulator', crop: 'center' });
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.filter = 'contrast(1.15) saturate(0.85)';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setLensCapture(dataUrl);
    setLastLaptopEvent('LENS.SNIP // CONTRAST-CROPPED FRAME BEAMED TO ACTIVE DOCUMENT');
    dispatchAction('lens.paste', { source: 'camera', mime: 'image/jpeg', bytes: dataUrl.length });
    tactile.playPortalBeam();
  };

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0;
      const beta = e.beta || 0;
      lastMotionRef.current = { gamma, beta };
      const angle = 135 + gamma * 1.5;
      document.documentElement.style.setProperty('--specular-angle', `${angle}deg`);

      if (laserMode === 'GYRO-60HZ') {
        const nextX = Math.max(5, Math.min(95, 50 + (gamma - gyroBaselineRef.current.gamma) * 1.4));
        const nextY = Math.max(5, Math.min(95, 50 + (beta - gyroBaselineRef.current.beta) * 1.4));
        setCursorPos({ x: nextX, y: nextY });
        dispatchAction('laser.move', { x: nextX, y: nextY, hz: 60 });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [laserMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPingMs(connectionMode === 'P2P-LAN' ? Math.floor(3 + Math.random() * 3) : Math.floor(28 + Math.random() * 12));
    }, 2000);
    return () => clearInterval(timer);
  }, [connectionMode]);

  const handleTrackpadMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const xPct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x: xPct, y: yPct });
    dispatchAction('trackpad.move', { x: xPct, y: yPct });

    if (airDrawEnabled) {
      setInkStrokes((prev) => [...prev.slice(-120), { x: xPct, y: yPct, color: inkColor }]);
    }

    const canvas = trackpadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = (xPct / 100) * canvas.width;
    const cy = (yPct / 100) * canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const spacing = 18;
    for (let gx = spacing / 2; gx < canvas.width; gx += spacing) {
      for (let gy = spacing / 2; gy < canvas.height; gy += spacing) {
        const dx = gx - cx;
        const dy = gy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pull = dist < 65 ? (1 - dist / 65) * 9 : 0;
        const angle = Math.atan2(dy, dx);
        const rx = gx + Math.cos(angle) * pull;
        const ry = gy + Math.sin(angle) * pull;

        ctx.fillStyle = dist < 55 ? '#FF4F00' : 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.arc(rx, ry, dist < 35 ? 2.2 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255, 79, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, canvas.height);
    ctx.moveTo(0, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.stroke();
  };

  const triggerEdgePortalBeam = (fileName: string) => {
    tactile.playPortalBeam();
    setPortalBeamActive(true);
    setBeamedFiles((prev) => [fileName, ...prev]);
    setLastLaptopEvent(`EDGE PORTAL // DROPPED "${fileName}" TO DESKTOP`);
    dispatchAction('portal.file_upload', { name: fileName });
    setTimeout(() => setPortalBeamActive(false), 1400);
  };

  const handleOtpPour = () => {
    tactile.playMechClick(1.25);
    const otpItem = clipboardHistory.find((item) => /\b\d{4,8}\b/.test(item)) || '849201';
    const match = otpItem.match(/\b\d{4,8}\b/);
    const code = match ? match[0] : '849201';
    setTypedTextOnLaptop(code);
    setLastLaptopEvent(`OTP POURED // AUTO-TYPED "${code}" + [ENTER]`);
    dispatchAction('otp.pour', { code });
  };

  const runAiAgent = () => {
    if (aiRunning) return;
    tactile.playMechClick(0.9);
    dispatchAction('ai.exec', { prompt: aiPrompt });
    setAiRunning(true);
    const plan = [
      { label: '01 // Parsing intent & validating action whitelist', done: false },
      { label: '02 // Focusing PowerPoint window (HWND 0x48F2)', done: false },
      { label: '03 // Navigating to Slide 03 (Dual-Layer Vault)', done: false },
      { label: '04 // Activating 60Hz Laser Pointer overlay', done: false },
    ];
    setAiSteps(plan);

    plan.forEach((_, idx) => {
      setTimeout(() => {
        tactile.playRotaryDetent();
        setAiSteps((prev) => prev.map((s, i) => (i <= idx ? { ...s, done: true } : s)));
        if (idx === 1) setFocusedApp('PowerPoint');
        if (idx === 2) setCurrentSlide(2);
        if (idx === 3) {
          setLaserMode('GYRO-60HZ');
          setAiRunning(false);
          setLastLaptopEvent('AI AGENT // COMPLETED 4/4 STEPS SUCCESSFULLY');
        }
      }, (idx + 1) * 650);
    });
  };

  const triggerPanicPalm = () => {
    tactile.vibrate([40, 30, 40, 30, 120]);
    tactile.playMechClick(0.6);
    setIsVaultLocked(true);
    setPanicTriggered(true);
    setLastLaptopEvent('PANIC PALM // VAULT LOCKED + 5 WEBCAM FRAMES CAPTURED');
    dispatchAction('panic.trigger');
  };

  const handleKnockTap = () => {
    tactile.playMechClick(1.4);
    const now = performance.now();
    const nextCount = knockAttemptCount + 1;
    setKnockAttemptCount(nextCount);
    lastKnockTs.current = now;

    if (nextCount >= 4) {
      setIsVaultLocked(false);
      setPanicTriggered(false);
      setKnockAttemptCount(0);
      tactile.playPortalBeam();
      setLastLaptopEvent('KNOCK RHYTHM VERIFIED // AIRDESK VAULT UNLOCKED');
      dispatchAction('vault.unlock', { intervals: recordedKnocks });
    }
  };

  const enterExperience = (mode: 'laptop' | 'phone') => {
    setEntryMode(mode);
    setPairingMode('qr');
    setPairingEndpoint(getDefaultAgentEndpoint());
    setShowPairingModal(true);
    setMobileNotice(mode === 'laptop'
      ? 'HOST STATION ONLINE // SHOW THIS QR TO THE PHONE'
      : 'POCKET CONTROLLER ONLINE // SCAN THE LAPTOP QR OR ENTER ITS TOKEN');
    if (mode === 'phone') void armMobileDeck();
  };

  const returnToLanding = () => {
    tactile.playMechClick(0.8);
    setEntryMode('landing');
    setShowPairingModal(false);
  };

  if (entryMode === 'landing') {
    return <LandingExperience onSelectMode={enterExperience} />;
  }

  return (
    <div className="min-h-screen bg-carbon bg-dot-matrix text-alabaster flex flex-col justify-between pb-24 relative overflow-x-hidden">
      <div
        className={`fixed top-0 left-0 right-0 h-3 z-50 transition-all duration-500 pointer-events-none ${
          portalBeamActive
            ? 'opacity-100 bg-gradient-to-r from-signal via-amber to-signal shadow-[0_0_35px_#FF4F00]'
            : 'opacity-0'
        }`}
      />

      <header className="sticky top-0 z-40 px-3 pt-3 pb-2 bg-carbon/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center text-carbon font-display font-extrabold text-base shadow-[0_0_15px_rgba(255,79,0,0.4)]">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-extrabold text-sm tracking-tight uppercase">
                    KARTAVYA
                  </h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-amber">
                    OS v2.6
                  </span>
                </div>
                <p className="font-mono text-[10px] text-zinc-400">
                  JAI-LAPTOP // {focusedApp.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  tactile.playMechClick();
                  setConnectionMode((m) => (m === 'P2P-LAN' ? 'CLOUD-WSS' : 'P2P-LAN'));
                }}
                className="chassis-panel px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono"
              >
                <span className="w-2 h-2 rounded-full bg-telemetry animate-ping" />
                <span className="text-telemetry font-bold">{connectionMode}</span>
                <span className="text-zinc-400">{pingMs}ms</span>
                <span className={`font-mono text-[9px] ${agentConnected ? 'text-telemetry' : 'text-zinc-500'}`}>
                  {agentConnected ? 'AGENT' : 'SIM'}
                </span>
                <BatteryCharging className="w-3.5 h-3.5 text-amber ml-0.5" />
                <span className="text-zinc-300">92%</span>
              </button>

              <button
                onClick={() => {
                  tactile.playMechClick();
                  setShowPairingModal(true);
                }}
                className="mech-key px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-signal flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>PAIR</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#0E0E13] border border-white/10 rounded-lg px-2.5 py-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-mono text-[10px] text-signal uppercase font-bold shrink-0">
                BUS
              </span>
              <span className="font-mono text-[10px] text-zinc-300 truncate">
                {lastLaptopEvent}
              </span>
            </div>
            <button
              onClick={() => {
                tactile.playMechClick();
                setShowLiveLaptopSim((s) => !s);
              }}
              className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-signal hover:text-black transition-colors shrink-0 ml-2"
            >
              {showLiveLaptopSim ? 'HIDE LAPTOP SIM' : 'SHOW LAPTOP SIM'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-3 pt-3 flex-1 flex flex-col gap-3">
        <section className="chassis-panel rounded-2xl p-3 border border-telemetry/20">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-4 h-4 text-signal shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-xs font-bold uppercase truncate">{entryMode === 'laptop' ? 'HOST LINK // PAIR A PHONE' : 'MOBILE LINK // POCKET COMMAND DECK'}</p>
                <p className="font-mono text-[9px] text-zinc-400 truncate">{mobileNotice}</p>
              </div>
            </div>
            <span className={`font-mono text-[9px] shrink-0 ${agentConnected ? 'text-telemetry' : 'text-amber'}`}>
              {agentConnected ? 'HOST ONLINE' : 'SIMULATOR'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={wakeLockActive ? releaseMobileDeck : armMobileDeck} className="mech-key-signal rounded-xl px-2 py-2 text-left">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><Zap className="w-3.5 h-3.5" />{wakeLockActive ? 'DE-ARM DECK' : 'ARM MOBILE'}</div>
              <p className="font-mono text-[8px] opacity-75 mt-1">GYRO · WAKE · AUDIO</p>
            </button>
            <button onClick={installApp} className="mech-key rounded-xl px-2 py-2 text-left">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><Download className="w-3.5 h-3.5 text-amber" />INSTALL PWA</div>
              <p className="font-mono text-[8px] text-zinc-400 mt-1">HOME-SCREEN MODE</p>
            </button>
            <button onClick={recenterGyro} className="mech-key rounded-xl px-2 py-2 text-left">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><RotateCcw className="w-3.5 h-3.5 text-telemetry" />RECENTER</div>
              <p className="font-mono text-[8px] text-zinc-400 mt-1">GYRO CLUTCH ZERO</p>
            </button>
            <button onClick={() => { transportRef.current?.clearQueue(); setMobileNotice('OFFLINE BUS // QUEUE PURGED'); }} className="mech-key rounded-xl px-2 py-2 text-left">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><WifiOff className="w-3.5 h-3.5 text-signal" />BUS {queuedCommands ? `${queuedCommands} QUEUED` : 'CLEAR'}</div>
              <p className="font-mono text-[8px] text-zinc-400 mt-1">RECONNECT-SAFE COMMANDS</p>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              ['GYRO', motionReady],
              ['WAKE', wakeLockActive],
              ['AUDIO', audioKeepAliveActive],
              ['CAMERA', Boolean(cameraStream) || Boolean(mobileCapabilities?.canCamera)],
              ['HAPTICS', Boolean(mobileCapabilities?.canVibrate)],
              ['PWA', Boolean(mobileCapabilities?.isStandalone)],
            ].map(([label, ready]) => (
              <span key={label as string} className={`font-mono text-[9px] px-2 py-1 rounded-full border ${ready ? 'border-telemetry/40 text-telemetry bg-telemetry/5' : 'border-white/10 text-zinc-500'}`}>
                {ready ? '●' : '○'} {label as string}
              </span>
            ))}
          </div>
        </section>

        {showLiveLaptopSim && (
          <section className="chassis-panel rounded-2xl p-3 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-signal" />
                <span className="font-display text-xs font-bold uppercase tracking-wider">
                  LIVE LAPTOP MONITOR + 3D TWIN SIMULATOR
                </span>
              </div>
              <div className="flex items-center gap-1">
                {(['VS Code', 'PowerPoint', 'Spotify', 'Chrome'] as FocusedApp[]).map((app) => (
                  <button
                    key={app}
                    onClick={() => {
                      tactile.playMechClick(1.1);
                      setFocusedApp(app);
                      setLastLaptopEvent(`CONTEXT MORPH // FOCUSED "${app.toUpperCase()}"`);
                    }}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded transition-all ${
                      focusedApp === app
                        ? 'bg-signal text-black font-bold'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                  tactile.playMechClick(1.3);
                  setCursorPos({ x, y });
                  setLastLaptopEvent(`MIRROR TAP // CLICKED AT (${x}%, ${y}%)`);
                }}
                className="sm:col-span-7 relative h-40 rounded-xl bg-[#07070B] border border-white/15 overflow-hidden cursor-crosshair select-none p-3 flex flex-col justify-between"
              >
                {isVaultLocked ? (
                  <div className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-4 text-center">
                    <Lock className="w-7 h-7 text-signal animate-bounce mb-1" />
                    <p className="font-display text-xs font-bold uppercase text-signal">
                      KARTAVYA VAULT LOCKED
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                      Low-level pywin32 keyboard/mouse hooks active.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKnockTap();
                      }}
                      className="mt-2.5 mech-key-signal px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold"
                    >
                      TAP KNOCK RHYTHM ({4 - knockAttemptCount} TAPS LEFT)
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-white/10 pb-1">
                  <span className="text-alabaster font-bold">{focusedApp}</span>
                  <span>
                    XY: {Math.round(cursorPos.x)}%, {Math.round(cursorPos.y)}%
                  </span>
                </div>

                {focusedApp === 'VS Code' && (
                  <div className="font-mono text-[10px] text-zinc-300 space-y-1 my-auto">
                    <p className="text-amber">// kartavya_agent/main.py</p>
                    <p>
                      <span className="text-signal">async def</span>{' '}
                      <span className="text-telemetry">handle_rtc_datachannel</span>(packet):
                    </p>
                    <p className="pl-3 text-zinc-400">
                      pyautogui.moveTo(packet.x, packet.y, _pause=False)
                    </p>
                    {typedTextOnLaptop && (
                      <p className="text-telemetry bg-telemetry/10 px-1.5 py-0.5 rounded">
                        INPUT STREAM: {typedTextOnLaptop}
                      </p>
                    )}
                  </div>
                )}

                {focusedApp === 'PowerPoint' && (
                  <div className="my-auto">
                    {slideBlackout ? (
                      <div className="text-center font-mono text-[11px] text-zinc-500">
                        [ SLIDE BLACKOUT ACTIVE ]
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-amber/30 rounded-lg p-2">
                        <span className="font-mono text-[9px] text-amber">
                          SLIDE 0{SLIDES[currentSlide].num} / 04
                        </span>
                        <h4 className="font-display text-xs font-bold text-white mt-0.5">
                          {SLIDES[currentSlide].title}
                        </h4>
                        <p className="font-sans text-[10px] text-zinc-300 mt-0.5">
                          {SLIDES[currentSlide].bullet}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {focusedApp === 'Spotify' && (
                  <div className="my-auto flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <div>
                      <p className="font-display text-xs font-bold text-telemetry">
                        MIDNIGHT HARDWARE SYNTH
                      </p>
                      <p className="font-mono text-[10px] text-zinc-400">
                        JOG SCRUB: {crownValue}% // LOSSLESS
                      </p>
                    </div>
                    <Waves className="w-6 h-6 text-telemetry animate-pulse" />
                  </div>
                )}

                {focusedApp === 'Chrome' && (
                  <div className="my-auto font-mono text-[10px] text-zinc-300">
                    <p className="text-alabaster font-bold">chrome://webrtc-internals</p>
                    <p className="text-telemetry">RTCDataChannel: OPEN (Zero Packet Loss)</p>
                    <p className="text-zinc-400">Zoom Level: {crownValue + 50}%</p>
                  </div>
                )}

                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {inkStrokes.map((pt, i) => (
                    <circle key={i} cx={`${pt.x}%`} cy={`${pt.y}%`} r="3" fill={pt.color} />
                  ))}
                </svg>

                <div
                  className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 z-20"
                  style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
                >
                  <div
                    className={`w-full h-full rounded-full ${
                      laserMode !== 'OFF'
                        ? 'bg-signal shadow-[0_0_16px_#FF4F00] scale-125'
                        : 'border-2 border-alabaster bg-signal/60'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1 border-t border-white/10">
                  <span>BEAMED FILES: {beamedFiles.length}</span>
                  <span>LASER: {laserMode}</span>
                </div>
              </div>

              <div className="sm:col-span-5">
                <LaptopDigitalTwin3D
                  focusedApp={focusedApp}
                  isVaultLocked={isVaultLocked}
                  beamActive={portalBeamActive}
                  laserPos={cursorPos}
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'trackpad' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-12 gap-3">
              <div
                onPointerDown={(e) => {
                  trackpadPointerRef.current = e.pointerId;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleTrackpadMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                }}
                onPointerMove={(e) => {
                  if (trackpadPointerRef.current === e.pointerId) {
                    handleTrackpadMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                  }
                }}
                onPointerUp={(e) => {
                  if (trackpadPointerRef.current === e.pointerId) {
                    trackpadPointerRef.current = null;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                }}
                onPointerCancel={() => { trackpadPointerRef.current = null; }}
                onWheel={(e) => {
                  e.preventDefault();
                  tactile.playRotaryDetent();
                  dispatchAction('trackpad.scroll', { delta: Math.round(-e.deltaY) });
                  setLastLaptopEvent(`TRACKPAD.SCROLL // ${Math.round(-e.deltaY)}`);
                }}
                onClick={() => {
                  tactile.playMechClick(1.2);
                  dispatchAction('trackpad.click', { button: 'left' });
                  setLastLaptopEvent(
                    `LEFT CLICK // (${Math.round(cursorPos.x)}%, ${Math.round(cursorPos.y)}%)`
                  );
                }}
                onDoubleClick={() => {
                  tactile.playMechClick(0.8);
                  dispatchAction('trackpad.click', { button: 'right' });
                  setLastLaptopEvent('RIGHT CLICK // CONTEXT MENU OPENED');
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="col-span-12 sm:col-span-8 trackpad-well rounded-2xl h-64 relative overflow-hidden cursor-crosshair flex flex-col justify-between p-3 touch-none"
              >
                <canvas
                  ref={trackpadCanvasRef}
                  width={360}
                  height={250}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                    ONE-EURO 60HZ SURFACE
                  </span>
                  <span className="font-mono text-[10px] text-signal">
                    X:{Math.round(cursorPos.x)} Y:{Math.round(cursorPos.y)}
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <span className="font-mono text-[9px] text-zinc-500">
                    1F: MOVE/CLICK · 2F: RIGHT/SCROLL · 3F: DESKTOP
                  </span>
                </div>
              </div>

              <div className="col-span-12 sm:col-span-4 flex flex-col justify-between gap-2.5">
                <TactileRotaryCrown
                  label={
                    focusedApp === 'VS Code'
                      ? 'FONT ZOOM'
                      : focusedApp === 'PowerPoint'
                      ? 'SLIDE ZOOM'
                      : 'JOG / VOL'
                  }
                  value={crownValue}
                  onChange={(val) => {
                    setCrownValue(val);
                    setLastLaptopEvent(`ROTARY CROWN // ${focusedApp.toUpperCase()} SET TO ${val}%`);
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      tactile.playMechClick(1.1);
                      setLastLaptopEvent('MOUSE // LEFT BUTTON CLICK');
                    }}
                    className="mech-key rounded-xl py-3 font-mono text-xs font-bold text-alabaster"
                  >
                    L-CLK
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick(0.85);
                      setLastLaptopEvent('MOUSE // RIGHT BUTTON CLICK');
                    }}
                    className="mech-key rounded-xl py-3 font-mono text-xs font-bold text-amber"
                  >
                    R-CLK
                  </button>
                </div>
              </div>
            </div>

            <section className="chassis-panel rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-signal" />
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider">
                    CONTEXT-MORPHING 3D MACRO DECK // {focusedApp}
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-zinc-400">AUTO-MORPH ACTIVE</span>
              </div>

              {focusedApp === 'VS Code' && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {[
                    { label: 'RUN BUILD', shortcut: 'Ctrl+Shift+B', icon: Play, signal: true },
                    { label: 'DEBUGGER', shortcut: 'F5', icon: Bug },
                    { label: 'TERMINAL', shortcut: 'Ctrl+`', icon: Terminal },
                    { label: 'GIT SYNC', shortcut: 'Ctrl+Shift+G', icon: GitBranch },
                    { label: 'PALETTE', shortcut: 'Ctrl+Shift+P', icon: Layers },
                    { label: 'COPILOT', shortcut: 'Ctrl+I', icon: Bot },
                  ].map((k) => (
                    <button
                      key={k.label}
                      onClick={() => {
                        tactile.playMechClick();
                        setLastLaptopEvent(`VSCODE MACRO // SENT [${k.shortcut}] (${k.label})`);
                      }}
                      className={`${
                        k.signal ? 'mech-key-signal' : 'mech-key'
                      } rounded-xl p-2.5 flex flex-col items-start justify-between h-20`}
                    >
                      <k.icon className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-mono text-[10px] font-bold leading-tight">{k.label}</p>
                        <p className="font-mono text-[8px] opacity-70">{k.shortcut}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {focusedApp === 'PowerPoint' && (
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setCurrentSlide((s) => Math.max(0, s - 1));
                      setLastLaptopEvent('PPT // PREVIOUS SLIDE');
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                  >
                    <SkipBack className="w-4 h-4 text-amber" />
                    <span className="font-mono text-[10px] font-bold">PREV</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick(1.2);
                      setCurrentSlide((s) => Math.min(SLIDES.length - 1, s + 1));
                      setLastLaptopEvent('PPT // NEXT SLIDE');
                    }}
                    className="mech-key-signal rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span className="font-mono text-[10px] font-bold">NEXT</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setSlideBlackout((b) => !b);
                      setLastLaptopEvent('PPT // TOGGLED BLACKOUT (KEY: B)');
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4 text-zinc-300" />
                    <span className="font-mono text-[10px] font-bold">BLACKOUT</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setActiveTab('stage');
                      setLaserMode('GYRO-60HZ');
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                  >
                    <Crosshair className="w-4 h-4 text-signal" />
                    <span className="font-mono text-[10px] font-bold">AIR LASER</span>
                  </button>
                </div>
              )}

              {(focusedApp === 'Spotify' || focusedApp === 'Chrome') && (
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setLastLaptopEvent(`${focusedApp.toUpperCase()} // PREV TRACK / TAB`);
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span className="font-mono text-[10px]">PREV</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick(1.15);
                      setLastLaptopEvent(`${focusedApp.toUpperCase()} // PLAY / PAUSE TOGGLE`);
                    }}
                    className="mech-key-signal rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    <span className="font-mono text-[10px] font-bold">PLAY/PAUSE</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setLastLaptopEvent(`${focusedApp.toUpperCase()} // NEXT TRACK / TAB`);
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span className="font-mono text-[10px]">NEXT</span>
                  </button>
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setLastLaptopEvent('AUDIO // MASTER MUTE TOGGLED');
                    }}
                    className="mech-key rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <Volume2 className="w-4 h-4 text-telemetry" />
                    <span className="font-mono text-[10px]">MUTE</span>
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="flex flex-col gap-3">
            <section className="chassis-panel rounded-2xl p-4 border border-signal/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-signal" />
                  <h2 className="font-display text-xs font-bold uppercase">
                    SPATIAL &quot;EDGE PORTAL&quot; FILE BEAM
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-amber">FLICK UP TO THROW TO PC</span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Tap or flick any payload below to beam it across the top phone bezel directly into the active Windows desktop window:
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { name: 'Slide_Diagram_3D.png', size: '1.4 MB' },
                  { name: 'Kartavya_Demo.mp4', size: '18.2 MB' },
                  { name: 'Env_Secrets_Vault.json', size: '4 KB' },
                ].map((file) => (
                  <button
                    key={file.name}
                    onClick={() => triggerEdgePortalBeam(file.name)}
                    className="mech-key rounded-xl p-3 text-left flex flex-col justify-between h-20 group"
                  >
                    <span className="font-mono text-[10px] text-signal group-hover:translate-y-[-2px] transition-transform">
                      ↑ FLING
                    </span>
                    <div>
                      <p className="font-mono text-[11px] font-bold text-alabaster truncate">
                        {file.name}
                      </p>
                      <p className="font-mono text-[9px] text-zinc-400">{file.size}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="chassis-panel rounded-2xl p-4 perspective-stage">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-xs font-bold uppercase">
                  RUNNING WINDOWS // 3D TASK DECK ({processes.length})
                </span>
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setProcesses([
                      { id: 'p1', name: 'VS Code', title: 'kartavya-agent — main.py', cpu: '4.2%', ram: '610 MB', accent: '#FF4F00' },
                      { id: 'p2', name: 'PowerPoint', title: 'Kartavya_Pitch_Deck.pptx', cpu: '2.8%', ram: '420 MB', accent: '#FFB000' },
                      { id: 'p3', name: 'Spotify', title: 'Synthwave Focus Mix', cpu: '1.1%', ram: '290 MB', accent: '#00E676' },
                      { id: 'p4', name: 'Chrome', title: 'WebRTC Internals // 60FPS', cpu: '6.4%', ram: '1.2 GB', accent: '#F4F4F6' },
                    ]);
                  }}
                  className="font-mono text-[10px] text-amber flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> RESTORE ALL
                </button>
              </div>

              <div className="space-y-2.5">
                {processes.map((proc) => (
                  <div
                    key={proc.id}
                    className="card-3d bg-[#14141B] border border-white/10 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div
                      onClick={() => {
                        tactile.playMechClick();
                        if (
                          proc.name === 'VS Code' ||
                          proc.name === 'PowerPoint' ||
                          proc.name === 'Spotify' ||
                          proc.name === 'Chrome'
                        ) {
                          setFocusedApp(proc.name);
                        }
                        setLastLaptopEvent(`WINDOW FOCUS // BROUGHT "${proc.name}" TO FRONT`);
                      }}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: proc.accent }}
                        />
                        <span className="font-display text-xs font-bold">{proc.name}</span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          CPU {proc.cpu} · {proc.ram}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-zinc-400 mt-0.5">{proc.title}</p>
                    </div>

                    <button
                      onClick={() => {
                        tactile.vibrate([15, 25]);
                        tactile.playMechClick(0.75);
                        setProcesses((prev) => prev.filter((p) => p.id !== proc.id));
                        setLastLaptopEvent(`PSUTIL KILL // TERMINATED "${proc.name}"`);
                      }}
                      className="mech-key px-2.5 py-2 rounded-lg text-signal flex items-center gap-1 font-mono text-[10px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      KILL
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'stage' && (
          <div className="flex flex-col gap-3">
            <section className="chassis-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-amber uppercase">
                  STAGE DIRECTOR // SLIDE 0{SLIDES[currentSlide].num} OF 04
                </span>
                <span className="font-mono text-[10px] text-telemetry">TIMER 01:42</span>
              </div>

              <div className="bg-[#0B0B0F] border border-white/10 rounded-xl p-3 mb-3">
                <h3 className="font-display text-sm font-bold text-alabaster">
                  {SLIDES[currentSlide].title}
                </h3>
                <p className="font-sans text-xs text-zinc-300 mt-1">
                  {SLIDES[currentSlide].bullet}
                </p>
                <div className="mt-2.5 pt-2 border-t border-white/10">
                  <span className="font-mono text-[9px] text-signal uppercase block">
                    SPEAKER TELEPROMPTER NOTES:
                  </span>
                  <p className="font-sans text-xs text-amber mt-0.5">
                    &ldquo;{SLIDES[currentSlide].notes}&rdquo;
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setCurrentSlide((s) => Math.max(0, s - 1));
                    dispatchAction('ppt.prev');
                    setFocusedApp('PowerPoint');
                  }}
                  className="mech-key rounded-xl py-3 font-mono text-xs font-bold"
                >
                  ← PREV SLIDE
                </button>
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setSlideBlackout((b) => !b);
                    dispatchAction('ppt.blackout');
                    setFocusedApp('PowerPoint');
                  }}
                  className="mech-key rounded-xl py-3 font-mono text-xs font-bold text-amber"
                >
                  {slideBlackout ? 'RESUME' : 'BLACKOUT (B)'}
                </button>
                <button
                  onClick={() => {
                    tactile.playMechClick(1.2);
                    setCurrentSlide((s) => Math.min(SLIDES.length - 1, s + 1));
                    dispatchAction('ppt.next');
                    setFocusedApp('PowerPoint');
                  }}
                  className="mech-key-signal rounded-xl py-3 font-mono text-xs font-bold"
                >
                  NEXT SLIDE →
                </button>
              </div>
            </section>

            <section className="chassis-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-xs font-bold uppercase">
                    DUAL-ENGINE AIR LASER + BEZIER AIR-DRAW
                  </h3>
                  <p className="font-mono text-[10px] text-zinc-400">
                    60Hz IMU Gyro Pointer (1-Handed) + MediaPipe Hand Tracking
                  </p>
                </div>
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setInkStrokes([]);
                    setLastLaptopEvent('AIR-DRAW // CLEARED OVERLAY CANVAS');
                  }}
                  className="mech-key px-2.5 py-1 rounded-lg font-mono text-[10px] text-zinc-300"
                >
                  CLEAR INK
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['OFF', 'GYRO-60HZ', 'CAMERA-HAND'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      tactile.playMechClick();
                      setLaserMode(m);
                      dispatchAction('laser.mode', { mode: m });
                      setLastLaptopEvent(`AIR LASER // MODE SET TO ${m}`);
                    }}
                    className={`rounded-xl py-2.5 font-mono text-[10px] font-bold ${
                      laserMode === m ? 'mech-key-signal' : 'mech-key text-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-[#0C0C10] border border-white/10 rounded-xl p-2.5">
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setAirDrawEnabled((d) => !d);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${
                    airDrawEnabled ? 'bg-signal text-black' : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {airDrawEnabled ? '● AIR-DRAW INK ON' : '○ ENABLE AIR-DRAW INK'}
                </button>

                <div className="flex items-center gap-2">
                  {['#FF4F00', '#FFB000', '#00E676', '#F4F4F6'].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        tactile.playRotaryDetent();
                        setInkColor(c);
                        setAirDrawEnabled(true);
                      }}
                      className={`w-6 h-6 rounded-full border-2 ${
                        inkColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'mirror' && (
          <div className="flex flex-col gap-3">
            <section className="chassis-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-xs font-bold uppercase">
                  REMOTE KEYBOARD + OTP CATCH &amp; POUR
                </span>
                <button
                  onClick={handleOtpPour}
                  className="mech-key-signal px-3 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  POUR OTP (849201)
                </button>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={typedTextOnLaptop}
                  onChange={(e) => {
                    setTypedTextOnLaptop(e.target.value);
                    setLastLaptopEvent(`KEY STREAM // TYPING "${e.target.value}"`);
                  }}
                  placeholder="Type or dictate (en-IN / hi-IN) straight into laptop..."
                  className="flex-1 bg-[#09090C] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-alabaster focus:outline-none focus:border-signal"
                />
                <button
                  onClick={toggleVoiceDictation}
                  className={`mech-key px-3 rounded-xl flex items-center justify-center ${isListening ? 'bg-signal text-black' : 'text-amber'}`}
                  title={`Voice dictation ${speechLocale}`}
                >
                  <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={() => setSpeechLocale((locale) => locale === 'en-IN' ? 'hi-IN' : 'en-IN')}
                  className="mech-key px-2 rounded-xl text-[9px] font-mono text-zinc-300"
                >
                  {speechLocale}
                </button>
              </div>

              <div className="grid grid-cols-6 gap-1.5">
                {['ESC', 'TAB', 'CTRL+C', 'CTRL+V', 'ALT+TAB', 'WIN+D'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      tactile.playMechClick();
                      setLastLaptopEvent(`KEY.SEND // DISPATCHED [${key}]`);
                    }}
                    className="mech-key rounded-lg py-2 font-mono text-[10px] font-bold text-zinc-200"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </section>

            <section className="chassis-panel rounded-2xl p-4 border border-amber/20">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-amber" />
                  <div>
                    <h3 className="font-display text-xs font-bold uppercase">LENS SNIP // SLIDE PASTE</h3>
                    <p className="font-mono text-[9px] text-zinc-400">CAMERA → CONTRAST CROP → ACTIVE LAPTOP DOCUMENT</p>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-telemetry">{cameraStream ? 'CAM LIVE' : 'STANDBY'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={cameraStream ? stopLensCamera : startLensCamera} className="mech-key rounded-xl py-2.5 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5">
                  {cameraStream ? <StopCircle className="w-3.5 h-3.5 text-signal" /> : <Camera className="w-3.5 h-3.5 text-amber" />}
                  {cameraStream ? 'STOP LENS' : 'OPEN CAMERA'}
                </button>
                <button onClick={captureLensFrame} className="mech-key-signal rounded-xl py-2.5 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> SNAP + PASTE
                </button>
              </div>
              <video ref={lensVideoRef} muted playsInline className={`mt-2 w-full max-h-40 rounded-xl border border-white/10 object-cover bg-black ${cameraStream ? 'block' : 'hidden'}`} />
              <canvas ref={lensCanvasRef} className="hidden" />
              {lensCapture && <img src={lensCapture} alt="Captured lens snip" className="mt-2 h-24 w-full rounded-xl object-cover border border-telemetry/30" />}
            </section>

            <section className="chassis-panel rounded-2xl p-4">
              <h3 className="font-display text-xs font-bold uppercase mb-2">
                BIDIRECTIONAL CLIPBOARD TIME-MACHINE
              </h3>
              <div className="space-y-2">
                {clipboardHistory.map((clip, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      tactile.playMechClick();
                      setTypedTextOnLaptop(clip);
                      setLastLaptopEvent(`CLIPBOARD PASTE // "${clip.slice(0, 24)}..."`);
                    }}
                    className="bg-[#121218] border border-white/10 hover:border-signal/50 rounded-xl p-2.5 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-mono text-[11px] text-zinc-300 truncate">{clip}</span>
                    <span className="font-mono text-[9px] text-signal ml-2 shrink-0">
                      TAP TO PASTE
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex flex-col gap-3">
            <section className="chassis-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-signal" />
                  <h2 className="font-display text-xs font-bold uppercase">
                    AUTONOMOUS VOICE AI LAPTOP AGENT
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-telemetry">WHITELIST GUARD ON</span>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 bg-[#09090C] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-alabaster"
                />
                <button
                  onClick={runAiAgent}
                  className="mech-key-signal px-4 rounded-xl font-mono text-xs font-bold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  EXEC
                </button>
              </div>

              {aiSteps.length > 0 && (
                <div className="space-y-1.5 bg-[#0B0B0F] border border-white/10 rounded-xl p-3">
                  {aiSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          step.done ? 'text-telemetry' : 'text-zinc-600 animate-spin'
                        }`}
                      />
                      <span className={step.done ? 'text-alabaster' : 'text-zinc-500'}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="chassis-panel rounded-2xl p-4 border border-signal/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-signal" />
                  <h3 className="font-display text-xs font-bold uppercase">
                    SECURITY // DUAL-LAYER VAULT &amp; PANIC PALM
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-amber">HEARTBEAT: ACTIVE</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    tactile.playMechClick();
                    setIsVaultLocked((l) => !l);
                    setLastLaptopEvent(
                      !isVaultLocked
                        ? 'VAULT LOCKED // TOPMOST OVERLAY ENGAGED'
                        : 'VAULT UNLOCKED'
                    );
                  }}
                  className="mech-key rounded-xl p-3.5 flex flex-col items-center gap-1.5"
                >
                  {isVaultLocked ? (
                    <Unlock className="w-5 h-5 text-telemetry" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber" />
                  )}
                  <span className="font-mono text-xs font-bold">
                    {isVaultLocked ? 'UNLOCK VAULT' : 'LOCK VAULT NOW'}
                  </span>
                </button>

                <button
                  onClick={triggerPanicPalm}
                  className="mech-key-signal rounded-xl p-3.5 flex flex-col items-center gap-1.5"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span className="font-mono text-xs font-bold">PANIC PALM TRAP</span>
                </button>
              </div>

              {panicTriggered && (
                <div className="mt-3 bg-signal/10 border border-signal rounded-xl p-3">
                  <p className="font-mono text-[11px] font-bold text-signal">
                    ⚠ INTRUDER BURST CAPTURED (5 FRAMES VIA OPENCV WEBCAM)
                  </p>
                  <p className="font-mono text-[10px] text-zinc-300 mt-1">
                    Laptop inputs frozen via pywin32 hook. Tap your 4-beat Knock Rhythm on the monitor above to disarm.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {showPairingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="chassis-panel rounded-2xl max-w-md w-full p-4 border border-white/15">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold uppercase text-signal">
                6-MODE ZERO-SETUP PAIRING ENGINE
              </h2>
              <button
                onClick={() => setShowPairingModal(false)}
                className="font-mono text-xs text-zinc-400 hover:text-white"
              >
                [ESC]
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {[
                { id: 'ultrasonic', label: '19kHz CHIRP', icon: Waves },
                { id: 'qr', label: 'QR SCAN', icon: QrCode },
                { id: 'mdns', label: 'mDNS RADAR', icon: Radio },
                { id: 'cloud', label: 'CLOUD TOKEN', icon: Wifi },
                { id: 'pin', label: '6-DIGIT PIN', icon: KeyRound },
                { id: 'knock', label: 'KNOCK 2FA', icon: Fingerprint },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    tactile.playMechClick();
                    setPairingMode(m.id as typeof pairingMode);
                  }}
                  className={`p-2 rounded-lg font-mono text-[10px] flex items-center gap-1.5 ${
                    pairingMode === m.id ? 'mech-key-signal font-bold' : 'mech-key text-zinc-300'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-[#09090D] border border-white/10 rounded-xl p-4 text-center">
              {pairingMode === 'ultrasonic' && (
                <div>
                  <p className="font-mono text-xs text-amber font-bold mb-1">
                    ULTRASONIC 18.5–19.5kHz FSK AUDIO HANDSHAKE
                  </p>
                  <p className="text-xs text-zinc-400 mb-3">
                    Laptop emits an ultrasonic FSK chirp via sounddevice; browser AudioWorklet decodes token automatically.
                  </p>
                  <button
                    onClick={() => {
                      tactile.playUltrasonicChirp();
                      setLastLaptopEvent('ULTRASONIC FFT // PAIRED WITH JAI-LAPTOP IN 1.1s');
                      setTimeout(() => setShowPairingModal(false), 700);
                    }}
                    className="mech-key-signal px-4 py-2.5 rounded-xl font-mono text-xs font-bold"
                  >
                    EMIT &amp; DECODE CHIRP NOW
                  </button>
                </div>
              )}

              {pairingMode === 'qr' && (
                <div className="space-y-3">
                  <div>
                    <p className="font-mono text-xs text-alabaster mb-1">
                      {entryMode === 'laptop' ? 'HOST QR // PHONE SCANS THIS CODE' : 'PHONE QR LINK // SCAN LAPTOP OR ENTER MANUALLY'}
                    </p>
                    <p className="font-mono text-[9px] text-zinc-500">
                      {entryMode === 'laptop' ? 'Open the PWA on the laptop LAN address, then let the phone bind to this agent.' : 'Camera scanning uses BarcodeDetector when supported; manual fields work everywhere.'}
                    </p>
                  </div>
                  <canvas ref={pairingQrCanvasRef} className="mx-auto rounded-xl bg-white p-2" />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={pairingEndpoint}
                      onChange={(event) => setPairingEndpoint(event.target.value)}
                      aria-label="Agent WebSocket URL"
                      className="min-w-0 bg-[#08080A] border border-white/15 rounded-lg px-2.5 py-2 text-[10px] font-mono text-alabaster focus:outline-none focus:border-signal"
                      placeholder="ws://192.168.1.42:8000/ws"
                    />
                    <button
                      onClick={async () => {
                        const copied = await copyToClipboard(pairingEndpoint);
                        setMobileNotice(copied ? 'WS ENDPOINT COPIED // SHARE OR PASTE INTO THE PHONE' : 'COPY BLOCKED // LONG-PRESS THE ENDPOINT TO COPY');
                      }}
                      className="mech-key rounded-lg px-2.5 text-amber"
                      title="Copy endpoint"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={pairingToken}
                      onChange={(event) => setPairingToken(event.target.value.toUpperCase())}
                      aria-label="Pairing token"
                      className="min-w-0 bg-[#08080A] border border-white/15 rounded-lg px-2.5 py-2 text-[10px] font-mono text-alabaster focus:outline-none focus:border-signal"
                      placeholder="KV-902A"
                    />
                    {entryMode === 'phone' && (
                      <button onClick={qrScanning ? stopQrScan : startQrScan} className="mech-key rounded-lg px-2.5 text-telemetry" title="Scan pairing QR">
                        <ScanLine className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {qrScanning && <video ref={pairingVideoRef} muted playsInline className="w-full h-28 rounded-xl object-cover border border-telemetry/30 bg-black" />}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] text-zinc-500">{entryMode === 'laptop' ? 'PHONE STATUS: WAITING FOR BIND' : 'HOST STATUS: READY TO BIND'}</span>
                    <button
                      onClick={entryMode === 'laptop' ? () => setShowPairingModal(false) : connectToPairing}
                      className="mech-key-signal rounded-lg px-3 py-2 font-mono text-[10px] font-bold"
                    >
                      {entryMode === 'laptop' ? 'OPEN HOST COCKPIT' : 'CONNECT PHONE'}
                    </button>
                  </div>
                </div>
              )}

              {pairingMode === 'mdns' && (
                <div>
                  <p className="font-mono text-xs text-telemetry mb-2">
                    ZEROCONF / BONJOUR NEARBY LAPTOPS FOUND (1)
                  </p>
                  <button
                    onClick={() => {
                      tactile.playMechClick();
                      setPairingEndpoint('ws://192.168.1.42:8000/ws');
                      setShowPairingModal(false);
                      setMobileNotice('mDNS RADAR // LAPTOP SELECTED; OPEN QR TO CONNECT');
                    }}
                    className="mech-key w-full py-2.5 rounded-xl font-mono text-xs text-alabaster"
                  >
                    ● JAI-ROG-LAPTOP.local (192.168.1.42:8000) — TAP TO BIND
                  </button>
                </div>
              )}

              {pairingMode === 'cloud' && (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-amber mb-2">
                    4G/5G CLOUD WSS RELAY CODE: <span className="text-white font-bold">{pairingToken}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Bridges encrypted WebSocket traffic when phone and laptop are on separate networks. Paste a deployed relay URL, then bind both devices to the same room.
                  </p>
                  <input
                    value={pairingEndpoint}
                    onChange={(event) => setPairingEndpoint(event.target.value)}
                    className="w-full bg-[#08080A] border border-white/15 rounded-lg px-2.5 py-2 text-[10px] font-mono text-alabaster focus:outline-none focus:border-signal"
                    placeholder="wss://relay.example.com/ws?room=KV-DEMO"
                  />
                  <button onClick={connectToPairing} className="mech-key-signal w-full rounded-lg py-2 font-mono text-[10px] font-bold">CONNECT VIA RELAY</button>
                </div>
              )}

              {pairingMode === 'pin' && (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-zinc-300 mb-2">
                    ENTER 6-DIGIT AGENT FALLBACK PIN: <span className="text-signal">492-810</span>
                  </p>
                  <input
                    value={pairingToken}
                    onChange={(event) => setPairingToken(event.target.value.toUpperCase())}
                    className="w-full text-center tracking-[0.35em] bg-[#08080A] border border-white/15 rounded-lg px-2.5 py-3 text-sm font-mono text-alabaster focus:outline-none focus:border-signal"
                    placeholder="KV-902A"
                  />
                  <button onClick={connectToPairing} className="mech-key-signal w-full rounded-lg py-2 font-mono text-[10px] font-bold">BIND PIN</button>
                </div>
              )}

              {pairingMode === 'knock' && (
                <div>
                  <p className="font-mono text-xs text-signal font-bold mb-1">
                    KNOCK RHYTHM 2FA RECORDER
                  </p>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Current signature intervals: {recordedKnocks.join('ms · ')}ms
                  </p>
                  <button
                    onClick={() => {
                      tactile.playMechClick(1.3);
                      setRecordedKnocks([210, 215, 490]);
                      setLastLaptopEvent('KNOCK 2FA // UPDATED RHYTHM HASH SIGNATURE');
                    }}
                    className="mech-key-signal px-4 py-2 rounded-xl font-mono text-xs font-bold"
                  >
                    TAP RHYTHM PAD
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-carbon/95 backdrop-blur-md border-t border-white/10 px-3 py-2">
        <div className="max-w-6xl mx-auto grid grid-cols-5 gap-2">
          {[
            { id: 'trackpad', label: 'TRACKPAD', icon: Cpu },
            { id: 'apps', label: '3D APPS', icon: Layers },
            { id: 'stage', label: 'STAGE/LASER', icon: Presentation },
            { id: 'mirror', label: 'MIRROR/KEY', icon: Monitor },
            { id: 'ai', label: 'AI & VAULT', icon: Bot },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  tactile.playMechClick(active ? 1.0 : 1.2);
                  setActiveTab(tab.id as TabId);
                }}
                className={`rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  active ? 'mech-key-signal font-bold' : 'mech-key text-zinc-400'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-mono text-[9px] tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
