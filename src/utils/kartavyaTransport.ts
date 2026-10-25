export interface KartavyaFrame {
  action: string;
  payload: Record<string, unknown>;
  id?: string;
  ts?: number;
  token?: string;
}

type FrameListener = (frame: KartavyaFrame) => void;
type StatusListener = (connected: boolean) => void;
type QueueListener = (count: number) => void;

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const QUEUE_KEY = 'kartavya:offline-command-queue';
const COALESCE_ACTIONS = new Set(['trackpad.move', 'laser.move', 'presence.ping']);

/**
 * Framed browser transport shared by the simulator, local FastAPI agent, and
 * remote relay. Commands are queued while a phone is offline and coalesced for
 * high-frequency pointer packets so a reconnect never floods the host.
 */
export class KartavyaTransport {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<FrameListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private readonly queueListeners = new Set<QueueListener>();
  private url: string;
  private token: string;
  private offlineQueue: KartavyaFrame[] = [];
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;

  constructor(
    url = viteEnv.VITE_AGENT_WS_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws`
        : 'ws://127.0.0.1:8000/ws'),
    token = viteEnv.VITE_KARTAVYA_TOKEN || 'KV-902A',
  ) {
    this.url = url;
    this.token = token;
    this.offlineQueue = this.readQueue();
  }

  configure(url: string, token = this.token) {
    this.url = url.trim();
    this.token = token.trim() || this.token;
    this.close();
    this.manuallyClosed = false;
    this.connect();
  }

  connect() {
    if (typeof WebSocket === 'undefined' || this.socket || !this.url || this.manuallyClosed) return;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener('open', () => {
        this.emitStatus(true);
        this.flushQueue();
        this.send('presence.ping');
      });
      this.socket.addEventListener('message', (event) => {
        try {
          const frame = JSON.parse(event.data) as KartavyaFrame;
          this.listeners.forEach((listener) => listener(frame));
        } catch {
          // A malformed host frame should not break the PWA simulator.
        }
      });
      this.socket.addEventListener('close', () => {
        this.socket = null;
        this.emitStatus(false);
        this.scheduleReconnect();
      });
      this.socket.addEventListener('error', () => {
        this.emitStatus(false);
      });
    } catch {
      this.socket = null;
      this.emitStatus(false);
      this.scheduleReconnect();
    }
  }

  send(action: string, payload: Record<string, unknown> = {}) {
    const frame: KartavyaFrame = {
      action,
      payload,
      id: this.createId(),
      ts: Date.now(),
      token: this.token,
    };
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(frame));
    } else if (action !== 'presence.ping') {
      this.enqueue(frame);
    }
    return frame;
  }

  onMessage(listener: FrameListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onQueue(listener: QueueListener) {
    this.queueListeners.add(listener);
    listener(this.offlineQueue.length);
    return () => this.queueListeners.delete(listener);
  }

  get queuedCount() {
    return this.offlineQueue.length;
  }

  get endpoint() {
    return this.url;
  }

  close() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.emitStatus(false);
  }

  clearQueue() {
    this.offlineQueue = [];
    this.persistQueue();
    this.emitQueue();
  }

  private scheduleReconnect() {
    if (this.manuallyClosed || this.reconnectTimer || typeof window === 'undefined') return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1800);
  }

  private flushQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const pending = [...this.offlineQueue];
    this.offlineQueue = [];
    this.persistQueue();
    this.emitQueue();
    pending.forEach((frame) => this.socket?.send(JSON.stringify(frame)));
  }

  private enqueue(frame: KartavyaFrame) {
    if (COALESCE_ACTIONS.has(frame.action)) {
      this.offlineQueue = this.offlineQueue.filter((queued) => queued.action !== frame.action);
    }
    this.offlineQueue = [...this.offlineQueue, frame].slice(-40);
    this.persistQueue();
    this.emitQueue();
  }

  private readQueue(): KartavyaFrame[] {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistQueue() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch {
      // Private browsing can disable localStorage; in-memory queue still works.
    }
  }

  private emitStatus(connected: boolean) {
    this.statusListeners.forEach((listener) => listener(connected));
  }

  private emitQueue() {
    this.queueListeners.forEach((listener) => listener(this.offlineQueue.length));
  }

  private createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
