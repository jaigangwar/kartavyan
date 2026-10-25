export interface MobileCapabilities {
  isMobile: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  canVibrate: boolean;
  canWakeLock: boolean;
  canOrientation: boolean;
  needsOrientationPermission: boolean;
  canCamera: boolean;
  canSpeech: boolean;
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

type OrientationPermissionEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function detectMobileCapabilities(): MobileCapabilities {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isStandalone: false,
      canInstall: false,
      canVibrate: false,
      canWakeLock: false,
      canOrientation: false,
      needsOrientationPermission: false,
      canCamera: false,
      canSpeech: false,
    };
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  const orientation = window.DeviceOrientationEvent as OrientationPermissionEvent | undefined;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || window.matchMedia('(pointer: coarse)').matches;

  return {
    isMobile,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    canInstall: 'serviceWorker' in navigator,
    canVibrate: typeof navigator.vibrate === 'function',
    canWakeLock: 'wakeLock' in navigator,
    canOrientation: 'DeviceOrientationEvent' in window,
    needsOrientationPermission: typeof orientation?.requestPermission === 'function',
    canCamera: Boolean(navigator.mediaDevices?.getUserMedia),
    canSpeech: Boolean(getSpeechRecognitionConstructor()),
  };
}

export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
  const orientation = window.DeviceOrientationEvent as OrientationPermissionEvent;
  if (typeof orientation.requestPermission === 'function') {
    try {
      return (await orientation.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export async function acquireScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === 'undefined') return null;
  const wakeLock = (navigator as WakeLockNavigator).wakeLock;
  if (!wakeLock) return null;
  try {
    return await wakeLock.request('screen');
  } catch {
    return null;
  }
}

export function startSilentAudioKeepAlive(): (() => void) | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 20;
    gain.gain.value = 0.00001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    void context.resume();
    return () => {
      try {
        oscillator.stop();
        void context.close();
      } catch {
        // The browser may have already disposed the context.
      }
    };
  } catch {
    return null;
  }
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition || candidate.webkitSpeechRecognition || null;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
