import type { BodyZoneId } from '../types/survey.ts';
import type { BodyZoneStat } from '../lib/bodymap.ts';

interface BodyMapSvgProps {
  mode: 'select' | 'heatmap';
  selectedZones?: string[];
  heatmapZones?: BodyZoneStat[];
  focusedZoneId?: BodyZoneId | null;
  frontLabel: string;
  backLabel: string;
  sideRightLabel: string;
  sideLeftLabel: string;
  getZoneLabel: (zoneId: BodyZoneId) => string;
  onToggleZone?: (zoneId: BodyZoneId) => void;
}

export function BodyMapSvg({
  mode,
  selectedZones = [],
  heatmapZones = [],
  focusedZoneId = null,
  frontLabel,
  backLabel,
  sideRightLabel,
  sideLeftLabel,
  getZoneLabel,
  onToggleZone,
}: BodyMapSvgProps) {
  const heatMap = new Map(heatmapZones.map((z) => [z.zoneId, z]));

  function getZoneStyle(zoneId: BodyZoneId): { className: string; fill?: string } {
    if (mode === 'select') {
      const isSelected = selectedZones.includes(zoneId);
      return {
        className: `body-zone${isSelected ? ' selected' : ''}`,
      };
    }

    const stat = heatMap.get(zoneId);
    const isFocused = focusedZoneId === zoneId;
    if (!stat || stat.count === 0) {
      return {
        className: `body-zone${isFocused ? ' heat-focused' : ''}`,
      };
    }
    const alpha = Math.max(0.32, Math.min(0.95, 0.28 + stat.intensity * 0.67));
    return {
      className: `body-zone${isFocused ? ' heat-focused' : ''}`,
      fill: `rgba(255, 90, 95, ${alpha.toFixed(2)})`,
    };
  }

  function renderZoneProps(zoneId: BodyZoneId) {
    const { className, fill } = getZoneStyle(zoneId);
    const label = getZoneLabel(zoneId);
    const stat = heatMap.get(zoneId);
    const title = mode === 'heatmap' && stat ? `${label}: ${stat.count}` : label;

    return {
      className,
      style: fill ? { fill } : undefined,
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': title,
      onClick: () => onToggleZone?.(zoneId),
      onKeyDown: (e: React.KeyboardEvent<SVGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleZone?.(zoneId);
        }
      },
    };
  }

  return (
    <div className="bodymap-dual">
      {/* FRONT SILHOUETTE: Viewer's LEFT = Anatomical Right; Viewer's RIGHT = Anatomical Left */}
      <div className="bodymap-panel">
        <div className="bodymap-panel-head">
          <span className="bodymap-side-tag">{sideRightLabel}</span>
          <span>{frontLabel}</span>
          <span className="bodymap-side-tag">{sideLeftLabel}</span>
        </div>

        <svg className="bodymap-svg" viewBox="0 0 180 340" aria-label={frontLabel}>
          {/* Head & Neutral Torso Silhouette */}
          <circle cx="90" cy="30" r="18" fill="#18202F" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
          <path
            d="M66 56 L114 56 L110 142 L70 142 Z"
            fill="#141923"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.2"
          />

          {/* Shoulders / Arms (Right on viewer left, Left on viewer right) */}
          <path
            d="M42 58 Q54 50 66 58 L62 128 L44 132 L38 78 Z"
            {...renderZoneProps('shoulder_r')}
          />
          <path
            d="M114 58 Q126 50 138 58 L142 78 L136 132 L118 128 Z"
            {...renderZoneProps('shoulder_l')}
          />

          {/* Hip / Groin */}
          <path d="M68 136 L90 136 L88 172 L64 166 Z" {...renderZoneProps('hip_r')} />
          <path d="M90 136 L112 136 L116 166 L92 172 Z" {...renderZoneProps('hip_l')} />

          {/* Quads / Thighs */}
          <rect x="61" y="172" width="26" height="58" rx="9" {...renderZoneProps('quad_r')} />
          <rect x="93" y="172" width="26" height="58" rx="9" {...renderZoneProps('quad_l')} />

          {/* Dedicated Rounded Knees */}
          <ellipse cx="74" cy="242" rx="13" ry="12" {...renderZoneProps('knee_r')} />
          <ellipse cx="106" cy="242" rx="13" ry="12" {...renderZoneProps('knee_l')} />

          {/* Shins (neutral lower leg outline on front) */}
          <rect x="63" y="256" width="22" height="44" rx="7" fill="#141923" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
          <rect x="95" y="256" width="22" height="44" rx="7" fill="#141923" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />

          {/* Ankles / Feet */}
          <rect x="60" y="302" width="26" height="24" rx="8" {...renderZoneProps('ankle_r')} />
          <rect x="94" y="302" width="26" height="24" rx="8" {...renderZoneProps('ankle_l')} />
        </svg>
      </div>

      {/* BACK SILHOUETTE: Viewer's LEFT = Anatomical Left; Viewer's RIGHT = Anatomical Right */}
      <div className="bodymap-panel">
        <div className="bodymap-panel-head">
          <span className="bodymap-side-tag">{sideLeftLabel}</span>
          <span>{backLabel}</span>
          <span className="bodymap-side-tag">{sideRightLabel}</span>
        </div>

        <svg className="bodymap-svg" viewBox="0 0 180 340" aria-label={backLabel}>
          {/* Head */}
          <circle cx="90" cy="30" r="18" fill="#18202F" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

          {/* Shoulders / Arms (Left on viewer left, Right on viewer right) */}
          <path
            d="M42 58 Q54 50 66 58 L62 128 L44 132 L38 78 Z"
            {...renderZoneProps('shoulder_l')}
          />
          <path
            d="M114 58 Q126 50 138 58 L142 78 L136 132 L118 128 Z"
            {...renderZoneProps('shoulder_r')}
          />

          {/* Back / Lower Back */}
          <rect x="66" y="56" width="48" height="78" rx="8" {...renderZoneProps('back')} />

          {/* Hip / Glutes */}
          <path d="M68 136 L90 136 L88 172 L64 166 Z" {...renderZoneProps('hip_l')} />
          <path d="M90 136 L112 136 L116 166 L92 172 Z" {...renderZoneProps('hip_r')} />

          {/* Hamstrings */}
          <rect x="61" y="174" width="26" height="68" rx="9" {...renderZoneProps('hamstring_l')} />
          <rect x="93" y="174" width="26" height="68" rx="9" {...renderZoneProps('hamstring_r')} />

          {/* Calves */}
          <rect x="62" y="246" width="24" height="54" rx="10" {...renderZoneProps('calf_l')} />
          <rect x="94" y="246" width="24" height="54" rx="10" {...renderZoneProps('calf_r')} />

          {/* Ankles / Heels */}
          <rect x="60" y="302" width="26" height="24" rx="8" {...renderZoneProps('ankle_l')} />
          <rect x="94" y="302" width="26" height="24" rx="8" {...renderZoneProps('ankle_r')} />
        </svg>
      </div>
    </div>
  );
}
