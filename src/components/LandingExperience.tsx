import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Laptop,
  LockKeyhole,
  MousePointer2,
  Radio,
  Smartphone,
  Sparkles,
  Waves,
  Wifi,
} from 'lucide-react';
import { LaptopDigitalTwin3D } from './LaptopDigitalTwin3D';
import { tactile } from '../utils/soundAndHaptics';

type EntryMode = 'laptop' | 'phone';

interface LandingExperienceProps {
  onSelectMode: (mode: EntryMode) => void;
}

const FLOATING_METRICS = [
  { label: 'P2P BUS', value: '< 5 ms', tone: 'signal' },
  { label: 'MIRROR', value: '60 FPS', tone: 'telemetry' },
  { label: 'PAIRING', value: '6 MODES', tone: 'amber' },
];

export const LandingExperience: React.FC<LandingExperienceProps> = ({ onSelectMode }) => {
  const [pointer, setPointer] = useState({ x: 50, y: 42 });
  const [scrollWave, setScrollWave] = useState(0);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      setPointer({
        x: (event.clientX / Math.max(window.innerWidth, 1)) * 100,
        y: (event.clientY / Math.max(window.innerHeight, 1)) * 100,
      });
    };
    const handleScroll = () => setScrollWave(window.scrollY);
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const choose = (mode: EntryMode) => {
    tactile.playMechClick(mode === 'laptop' ? 1.15 : 1.3);
    tactile.vibrate([10, 24, 10]);
    onSelectMode(mode);
  };

  return (
    <div
      className="landing-shell"
      style={{
        '--pointer-x': `${pointer.x}%`,
        '--pointer-y': `${pointer.y}%`,
        '--scroll-wave': `${scrollWave}px`,
      } as React.CSSProperties}
    >
      <div className="landing-noise" />
      <div className="landing-orbit orbit-one" />
      <div className="landing-orbit orbit-two" />
      <div className="landing-orbit orbit-three" />

      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">K</span>
          <span>
            <strong>KARTAVYA</strong>
            <small>SPATIAL TACTILE OS</small>
          </span>
        </div>
        <div className="landing-nav-status">
          <span className="status-dot" />
          <span>AGENT_MOCK // READY</span>
          <span className="nav-divider" />
          <span>BUILD 2.6</span>
        </div>
      </nav>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="eyebrow-line"
            >
              <Sparkles size={14} />
              <span>THE PHONE BECOMES THE MACHINE</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08 }}
            >
              Touch the <em>space</em><br />
              between devices.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="landing-lede"
            >
              KARTAVYA turns a phone browser into a precision instrument for your laptop — tactile controls,
              live screen mirroring, spatial laser pointing, and a command bus built for the moment.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="landing-metrics"
            >
              {FLOATING_METRICS.map((metric) => (
                <div key={metric.label} className={`landing-metric metric-${metric.tone}`}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="landing-stage"
            initial={{ opacity: 0, scale: 0.86, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="stage-scanline" />
            <div className="stage-caption stage-caption-top">
              <span>SPATIAL LINK</span>
              <b>01</b>
            </div>
            <div className="landing-twin-wrap">
              <LaptopDigitalTwin3D
                focusedApp="VS Code"
                isVaultLocked={false}
                beamActive={true}
                laserPos={{ x: 58, y: 42 }}
              />
            </div>
            <div className="landing-phone-card">
              <div className="phone-card-camera" />
              <div className="phone-card-screen">
                <div className="phone-card-topline"><span>KV / LINK</span><span>04ms</span></div>
                <div className="phone-card-radar"><div className="radar-cross" /><div className="radar-pulse" /></div>
                <div className="phone-card-bottom"><span>GYRO 60HZ</span><b>ARMED</b></div>
              </div>
            </div>
            <div className="landing-beam beam-horizontal" />
            <div className="landing-beam beam-diagonal" />
            <div className="stage-caption stage-caption-bottom">
              <span><Activity size={12} /> LIVE DIGITAL TWIN</span>
              <span>DRAG / TILT / CONNECT</span>
            </div>
          </motion.div>
        </section>

        <section className="landing-entry" id="entry">
          <div className="entry-heading">
            <span className="entry-kicker">CHOOSE YOUR INSTRUMENT</span>
            <h2>Where are you opening KARTAVYA?</h2>
            <p>Your role changes the surface, not the power. Pair a phone to a laptop or run the full tactile cockpit in simulator mode.</p>
          </div>
          <div className="entry-grid">
            <motion.button
              className="entry-card entry-card-laptop"
              whileHover={{ y: -10, rotateX: 4 }}
              whileTap={{ y: 3, scale: 0.98 }}
              onClick={() => choose('laptop')}
            >
              <span className="entry-card-index">01 / HOST STATION</span>
              <div className="entry-card-icon"><Laptop /></div>
              <div className="entry-card-copy">
                <h3>I’m on my laptop</h3>
                <p>Open the desktop pairing station, show a QR or six-character cloud token, and bind a phone as the spatial controller.</p>
              </div>
              <span className="entry-card-action">OPEN PAIRING STATION <ArrowRight size={16} /></span>
              <div className="entry-card-signal" />
            </motion.button>

            <motion.button
              className="entry-card entry-card-phone"
              whileHover={{ y: -10, rotateX: -4 }}
              whileTap={{ y: 3, scale: 0.98 }}
              onClick={() => choose('phone')}
            >
              <span className="entry-card-index">02 / POCKET CONTROLLER</span>
              <div className="entry-card-icon"><Smartphone /></div>
              <div className="entry-card-copy">
                <h3>I’m on my phone</h3>
                <p>Arm gyroscope, wake lock, camera and haptics, then pair to a laptop that is waiting in QR, PIN, mDNS or cloud mode.</p>
              </div>
              <span className="entry-card-action">ENTER MOBILE COCKPIT <ArrowRight size={16} /></span>
              <div className="entry-card-signal" />
            </motion.button>
          </div>
        </section>

        <section className="landing-capabilities">
          <div className="capability-intro">
            <span className="entry-kicker">ONE BUS / MANY SURFACES</span>
            <h2>Made for the live moment.</h2>
          </div>
          <div className="capability-rail">
            <div className="capability-card"><MousePointer2 /><span>60HZ TRACKPAD</span><small>One-Euro motion + touch gestures</small></div>
            <div className="capability-card"><Waves /><span>EDGE PORTAL</span><small>Flick files through the bezel</small></div>
            <div className="capability-card"><Radio /><span>PAIR ANYWHERE</span><small>QR, mDNS, PIN, cloud, chirp</small></div>
            <div className="capability-card"><LockKeyhole /><span>VAULT SECURITY</span><small>Presence lock + Knock Rhythm</small></div>
            <div className="capability-card"><Wifi /><span>WEBSOCKET BUS</span><small>Offline queue + reconnect flush</small></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>KARTAVYA // SPATIAL TACTILE OS CONTROLLER</span>
        <span>SCROLL TO WAVE THE FIELD <span className="footer-arrow">↓</span></span>
      </footer>
    </div>
  );
};
