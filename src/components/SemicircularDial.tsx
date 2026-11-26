import { useId, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
  getDialLevelKey,
  getNormalizedRatio,
  getPolarityColor,
  getPolarityGradientStops,
} from '../lib/dial.ts';
import type { Polarity } from '../types/survey.ts';

interface SemicircularDialProps {
  min: number;
  max: number;
  value: number | undefined;
  polarity?: Polarity;
  minLabel?: string;
  maxLabel?: string;
  hintText: string;
  translateLevel: (key: 'dial.level1' | 'dial.level2' | 'dial.level3' | 'dial.level4') => string;
  onChange: (nextValue: number) => void;
}

const CX = 140;
const CY = 136;
const R = 104;

function polarPoint(angleRad: number): { x: number; y: number } {
  return {
    x: CX + R * Math.cos(angleRad),
    y: CY - R * Math.sin(angleRad),
  };
}

export function SemicircularDial({
  min,
  max,
  value,
  polarity = 'positive',
  minLabel,
  maxLabel,
  hintText,
  translateLevel,
  onChange,
}: SemicircularDialProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const displayVal = hasValue ? value : Math.round((min + max) / 2);
  const ratio = getNormalizedRatio(displayVal, min, max);
  const activeColor = hasValue ? getPolarityColor(ratio, polarity) : '#707C91';
  const [stopStart, stopMid, stopEnd] = getPolarityGradientStops(polarity);

  // Angle runs from PI (left, min) down to 0 (right, max)
  const thumbAngle = Math.PI * (1 - ratio);
  const thumb = polarPoint(thumbAngle);

  function computeValueFromPointer(clientX: number, clientY: number): number {
    const svg = svgRef.current;
    if (!svg) return displayVal;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 280;
    const y = ((clientY - rect.top) / rect.height) * 165;

    const dx = x - CX;
    const dy = CY - y;

    let angle = Math.atan2(dy, dx);
    if (dy < 0) {
      angle = dx < 0 ? Math.PI : 0;
    }
    angle = Math.max(0, Math.min(Math.PI, angle));
    const nextRatio = 1 - angle / Math.PI;
    const stepped = Math.round(min + nextRatio * (max - min));
    return Math.max(min, Math.min(max, stepped));
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(computeValueFromPointer(e.clientX, e.clientY));
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    onChange(computeValueFromPointer(e.clientX, e.clientY));
  }

  function handlePointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const levelText = hasValue ? translateLevel(getDialLevelKey(displayVal, min, max)) : hintText;

  return (
    <div className="dial-wrapper">
      <svg
        ref={svgRef}
        className="dial-svg"
        viewBox="0 0 280 165"
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={hasValue ? value : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stopStart} />
            <stop offset="50%" stopColor={stopMid} />
            <stop offset="100%" stopColor={stopEnd} />
          </linearGradient>
        </defs>

        {/* Base track */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="22"
          strokeLinecap="round"
        />

        {/* Gradient arc */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="16"
          strokeLinecap="round"
          opacity={hasValue ? 1 : 0.45}
        />

        {/* Thumb handle */}
        <circle
          cx={thumb.x}
          cy={thumb.y}
          r="15"
          fill="#0B0E14"
          stroke={activeColor}
          strokeWidth="5"
        />
      </svg>

      <div className="dial-center-readout">
        <span className="dial-number" style={{ color: activeColor }}>
          {hasValue ? value : '—'}
        </span>
        <span
          className="dial-level-pill"
          style={{
            color: hasValue ? activeColor : 'var(--text-muted)',
            borderColor: hasValue ? `${activeColor}55` : 'var(--border)',
          }}
        >
          {levelText}
        </span>
      </div>

      <div className="dial-endpoints">
        <span>{minLabel || min}</span>
        <span>{maxLabel || max}</span>
      </div>

      <div className="dial-stepper-row">
        <button
          type="button"
          className="dial-step-btn"
          onClick={() => onChange(Math.max(min, (hasValue ? displayVal : min + 1) - 1))}
          aria-label="-1"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={displayVal}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: activeColor, height: 32 }}
        />
        <button
          type="button"
          className="dial-step-btn"
          onClick={() => onChange(Math.min(max, (hasValue ? displayVal : min) + 1))}
          aria-label="+1"
        >
          +
        </button>
      </div>
    </div>
  );
}
