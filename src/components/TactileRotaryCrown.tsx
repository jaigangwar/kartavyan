import React, { useRef, useState } from 'react';
import { tactile } from '../utils/soundAndHaptics';

interface RotaryCrownProps {
  label: string;
  value: number;
  onChange: (nextVal: number) => void;
}

export const TactileRotaryCrown: React.FC<RotaryCrownProps> = ({ label, value, onChange }) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef<number | null>(null);
  const accumDetentRef = useRef(0);

  const calcAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (lastAngleRef.current === null) return;
    const current = calcAngle(clientX, clientY);
    let delta = current - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    setAngle((prev) => prev + delta);
    accumDetentRef.current += Math.abs(delta);

    if (accumDetentRef.current >= 10) {
      tactile.playRotaryDetent();
      accumDetentRef.current = 0;
      const step = delta > 0 ? 2 : -2;
      onChange(Math.max(0, Math.min(100, value + step)));
    }
    lastAngleRef.current = current;
  };

  return (
    <div className="chassis-panel rounded-2xl p-3 flex flex-col items-center justify-between select-none">
      <div className="w-full flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className="font-mono text-xs font-bold text-amber">{value}%</span>
      </div>

      <div
        ref={wheelRef}
        onMouseDown={(e) => {
          lastAngleRef.current = calcAngle(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleMove(e.clientX, e.clientY);
        }}
        onMouseUp={() => {
          lastAngleRef.current = null;
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          lastAngleRef.current = calcAngle(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handleMove(t.clientX, t.clientY);
        }}
        onTouchEnd={() => {
          lastAngleRef.current = null;
        }}
        className="relative w-24 h-24 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 32% 28%, #2B2B36 0%, #101015 70%, #070709 100%)',
          boxShadow:
            '0 10px 22px rgba(0,0,0,0.9), inset 0 2px 2px rgba(255,255,255,0.18), 0 0 0 2px #1E1E26',
        }}
      >
        <div
          className="w-full h-full rounded-full relative transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1.5 -translate-x-1/2 w-0.5 h-2 rounded-full bg-zinc-500/60"
              style={{ transformOrigin: '50% 42px', transform: `rotate(${i * 30}deg)` }}
            />
          ))}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-signal shadow-[0_0_8px_#FF4F00]" />
        </div>

        <div className="absolute w-11 h-11 rounded-full bg-[#0B0B0E] border border-white/10 flex items-center justify-center shadow-inner pointer-events-none">
          <span className="font-mono text-[9px] text-zinc-400 tracking-tighter">CROWN</span>
        </div>
      </div>

      <span className="font-mono text-[9px] text-zinc-500 mt-1.5">ROTATE TO JOG</span>
    </div>
  );
};
