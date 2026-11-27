import { useId } from 'react';
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

const FRONT_BODY_PATH = `
  M 120 14
  C 132 14 139 23 139 38
  C 141 40 141 48 138 51
  C 137 61 131 69 127 72
  C 126 78 128 84 133 88
  C 143 92 158 94 168 102
  C 176 109 180 121 182 135
  C 184 153 188 172 191 189
  C 196 207 199 226 201 244
  C 205 253 207 265 204 277
  C 202 284 198 286 195 282
  L 192 270
  C 191 278 188 282 185 278
  C 183 274 184 264 185 257
  C 182 261 179 261 178 257
  C 178 251 183 245 186 241
  C 182 223 177 204 173 189
  C 169 172 164 150 160 137
  C 158 155 154 174 152 192
  C 157 207 162 223 163 243
  C 165 268 162 299 156 333
  C 154 348 153 360 154 373
  C 159 393 158 419 150 447
  C 147 458 147 466 148 474
  C 155 484 166 492 166 499
  C 166 506 154 509 140 507
  C 130 506 126 500 127 489
  L 128 472
  C 125 448 122 420 124 394
  C 126 378 127 364 126 348
  C 125 318 124 284 122 254
  L 120 248
  L 118 254
  C 116 284 115 318 114 348
  C 113 364 114 378 116 394
  C 118 420 115 448 112 472
  L 113 489
  C 114 500 110 506 100 507
  C 86 509 74 506 74 499
  C 74 492 85 484 92 474
  C 93 466 93 458 90 447
  C 82 419 81 393 86 373
  C 87 360 86 348 84 333
  C 78 299 75 268 77 243
  C 78 223 83 207 88 192
  C 86 174 82 155 80 137
  C 76 150 71 172 67 189
  C 63 204 58 223 54 241
  C 57 245 62 251 62 257
  C 61 261 58 261 55 257
  C 56 264 57 274 55 278
  C 52 282 49 278 48 270
  L 45 282
  C 42 286 38 284 36 277
  C 33 265 35 253 39 244
  C 41 226 44 207 49 189
  C 52 172 56 153 58 135
  C 60 121 64 109 72 102
  C 82 94 97 92 107 88
  C 112 84 114 78 113 72
  C 109 69 103 61 102 51
  C 99 48 99 40 101 38
  C 101 23 108 14 120 14 Z
`;

const BACK_BODY_PATH = `
  M 120 14
  C 132 14 139 23 139 38
  C 141 40 141 48 138 51
  C 137 61 131 69 127 72
  C 126 78 128 84 133 88
  C 143 92 158 94 168 102
  C 176 109 180 121 182 135
  C 184 153 188 172 191 189
  C 196 207 199 226 201 244
  C 205 253 207 265 204 277
  C 202 284 198 286 195 282
  L 192 270
  C 191 278 188 282 185 278
  C 183 274 184 264 185 257
  C 182 261 179 261 178 257
  C 178 251 183 245 186 241
  C 182 223 177 204 173 189
  C 169 172 164 150 160 137
  C 158 155 154 174 152 192
  C 157 207 162 223 163 243
  C 165 268 162 299 156 333
  C 154 348 153 360 154 373
  C 159 393 158 419 150 447
  C 147 458 147 466 148 474
  C 151 484 153 494 151 501
  C 149 507 142 509 135 507
  C 128 506 126 500 127 489
  L 128 472
  C 125 448 122 420 124 394
  C 126 378 127 364 126 348
  C 125 318 124 284 122 254
  L 120 248
  L 118 254
  C 116 284 115 318 114 348
  C 113 364 114 378 116 394
  C 118 420 115 448 112 472
  L 113 489
  C 114 500 112 506 105 507
  C 98 509 91 507 89 501
  C 87 494 89 484 92 474
  C 93 466 93 458 90 447
  C 82 419 81 393 86 373
  C 87 360 86 348 84 333
  C 78 299 75 268 77 243
  C 78 223 83 207 88 192
  C 86 174 82 155 80 137
  C 76 150 71 172 67 189
  C 63 204 58 223 54 241
  C 57 245 62 251 62 257
  C 61 261 58 261 55 257
  C 56 264 57 274 55 278
  C 52 282 49 278 48 270
  L 45 282
  C 42 286 38 284 36 277
  C 33 265 35 253 39 244
  C 41 226 44 207 49 189
  C 52 172 56 153 58 135
  C 60 121 64 109 72 102
  C 82 94 97 92 107 88
  C 112 84 114 78 113 72
  C 109 69 103 61 102 51
  C 99 48 99 40 101 38
  C 101 23 108 14 120 14 Z
`;

const FRONT_ZONES: { id: BodyZoneId; d: string }[] = [
  { id: 'shoulder_r', d: 'M 86 92 L 80 140 L 54 246 L 26 246 L 26 92 Z' },
  { id: 'shoulder_l', d: 'M 154 92 L 160 140 L 186 246 L 214 246 L 214 92 Z' },
  { id: 'hip_r', d: 'M 70 202 L 120 206 L 120 250 L 70 248 Z' },
  { id: 'hip_l', d: 'M 120 206 L 170 202 L 170 248 L 120 250 Z' },
  { id: 'quad_r', d: 'M 70 248 L 120 250 L 118 345 L 76 345 Z' },
  { id: 'quad_l', d: 'M 120 250 L 170 248 L 164 345 L 122 345 Z' },
  { id: 'knee_r', d: 'M 76 345 L 118 345 L 118 380 L 76 380 Z' },
  { id: 'knee_l', d: 'M 122 345 L 164 345 L 164 380 L 122 380 Z' },
  { id: 'calf_r', d: 'M 76 380 L 118 380 L 118 462 L 76 462 Z' },
  { id: 'calf_l', d: 'M 122 380 L 164 380 L 164 462 L 122 462 Z' },
  { id: 'ankle_r', d: 'M 68 462 L 118 462 L 118 514 L 68 514 Z' },
  { id: 'ankle_l', d: 'M 122 462 L 172 462 L 172 514 L 122 514 Z' },
];

const BACK_ZONES: { id: BodyZoneId; d: string }[] = [
  { id: 'back', d: 'M 84 86 L 156 86 L 160 138 L 154 204 L 86 204 L 80 138 Z' },
  { id: 'shoulder_l', d: 'M 84 88 L 80 140 L 54 246 L 26 246 L 26 88 Z' },
  { id: 'shoulder_r', d: 'M 156 88 L 160 140 L 186 246 L 214 246 L 214 88 Z' },
  { id: 'hip_l', d: 'M 70 204 L 120 204 L 120 256 L 70 256 Z' },
  { id: 'hip_r', d: 'M 120 204 L 170 204 L 170 256 L 120 256 Z' },
  { id: 'hamstring_l', d: 'M 70 256 L 120 256 L 118 345 L 76 345 Z' },
  { id: 'hamstring_r', d: 'M 120 256 L 170 256 L 164 345 L 122 345 Z' },
  { id: 'knee_l', d: 'M 76 345 L 118 345 L 118 380 L 76 380 Z' },
  { id: 'knee_r', d: 'M 122 345 L 164 345 L 164 380 L 122 380 Z' },
  { id: 'calf_l', d: 'M 76 380 L 118 380 L 118 462 L 76 462 Z' },
  { id: 'calf_r', d: 'M 122 380 L 164 380 L 164 462 L 122 462 Z' },
  { id: 'ankle_l', d: 'M 76 462 L 118 462 L 118 514 L 76 514 Z' },
  { id: 'ankle_r', d: 'M 122 462 L 164 462 L 164 514 L 122 514 Z' },
];

function getHeatTierClass(intensity: number): string {
  if (intensity > 0.75) return 'heat-4';
  if (intensity > 0.5) return 'heat-3';
  if (intensity > 0.25) return 'heat-2';
  return 'heat-1';
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
  const uid = useId();
  const bodyBaseGradFrontId = `bodyBaseGrad-front-${uid}`;
  const bodyBaseGradBackId = `bodyBaseGrad-back-${uid}`;
  const clipFrontId = `clipFront-${uid}`;
  const clipBackId = `clipBack-${uid}`;

  const heatMap = new Map(heatmapZones.map((z) => [z.zoneId, z]));

  function getZoneClassName(zoneId: BodyZoneId): string {
    if (mode === 'select') {
      return `body-zone${selectedZones.includes(zoneId) ? ' selected' : ''}`;
    }

    const stat = heatMap.get(zoneId);
    const isInspected = focusedZoneId === zoneId;
    const classes = ['body-zone'];
    if (stat && stat.count > 0) {
      classes.push(getHeatTierClass(stat.intensity));
    }
    if (isInspected) {
      classes.push('inspected');
    }
    return classes.join(' ');
  }

  function renderInteractiveZone(zone: { id: BodyZoneId; d: string }) {
    const label = getZoneLabel(zone.id);
    const stat = heatMap.get(zone.id);
    const title = mode === 'heatmap' && stat ? `${label}: ${stat.count}` : label;
    const isSelected = mode === 'select' && selectedZones.includes(zone.id);

    return (
      <path
        key={zone.id}
        d={zone.d}
        data-zone={zone.id}
        className={getZoneClassName(zone.id)}
        role="button"
        tabIndex={0}
        aria-label={title}
        aria-pressed={mode === 'select' ? isSelected : undefined}
        onClick={() => onToggleZone?.(zone.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleZone?.(zone.id);
          }
        }}
      >
        <title>{title}</title>
      </path>
    );
  }

  return (
    <div className="bodymap-dual">
      {/* FRONT SILHOUETTE: Viewer LEFT = Anatomical Right (_r); Viewer RIGHT = Anatomical Left (_l) */}
      <div className="bodymap-panel">
        <div className="bodymap-panel-head">
          <span className="bodymap-side-tag">{sideRightLabel}</span>
          <span>{frontLabel}</span>
          <span className="bodymap-side-tag">{sideLeftLabel}</span>
        </div>

        <svg className="bodymap-svg" viewBox="0 0 240 520" aria-label={frontLabel}>
          <defs>
            <linearGradient id={bodyBaseGradFrontId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#222D42" />
              <stop offset="50%" stopColor="#172030" />
              <stop offset="100%" stopColor="#101724" />
            </linearGradient>
            <clipPath id={clipFrontId}>
              <path d={FRONT_BODY_PATH} />
            </clipPath>
          </defs>

          <path fill={`url(#${bodyBaseGradFrontId})`} pointerEvents="none" d={FRONT_BODY_PATH} />

          <g clipPath={`url(#${clipFrontId})`}>
            {FRONT_ZONES.map(renderInteractiveZone)}

            {/* Subtle 3D shadows (chin & pectorals) */}
            <path className="anatomy-shadow" d="M 112 72 Q 120 79 128 72 L 127 83 Q 120 87 113 83 Z" />
            <path className="anatomy-shadow" d="M 86 135 Q 102 145 117 137 L 117 142 Q 102 150 86 140 Z" />
            <path className="anatomy-shadow" d="M 154 135 Q 138 145 123 137 L 123 142 Q 138 150 154 140 Z" />
          </g>

          {/* Front anatomical guide lines */}
          <g className="anatomy-line">
            <path d="M 116 96 Q 101 92 85 99" />
            <path d="M 124 96 Q 139 92 155 99" />
            <path d="M 120 102 L 120 184" />
            <path d="M 85 130 Q 101 141 117 134" />
            <path d="M 155 130 Q 139 141 123 134" />
            <path d="M 105 152 Q 112 155 118 154" />
            <path d="M 135 152 Q 128 155 122 154" />
            <path d="M 106 170 Q 113 173 118 172" />
            <path d="M 134 170 Q 127 173 122 172" />
            <circle cx="120" cy="190" r="1.6" />
            <path d="M 89 198 Q 98 214 114 226" />
            <path d="M 151 198 Q 142 214 126 226" />
            <path d="M 94 268 Q 97 308 106 334" />
            <path d="M 146 268 Q 143 308 134 334" />
            <path d="M 94 358 Q 100 351 106 358 Q 107 368 100 372 Q 93 368 94 358 Z" />
            <path d="M 134 358 Q 140 351 146 358 Q 147 368 140 372 Q 133 368 134 358 Z" />
            <path d="M 100 384 L 98 456" />
            <path d="M 140 384 L 142 456" />
            <path d="M 82 496 Q 94 491 108 495" />
            <path d="M 158 496 Q 146 491 132 495" />
          </g>

          <path className="body-outer-rim" d={FRONT_BODY_PATH} />
        </svg>
      </div>

      {/* BACK SILHOUETTE: Viewer LEFT = Anatomical Left (_l); Viewer RIGHT = Anatomical Right (_r) */}
      <div className="bodymap-panel">
        <div className="bodymap-panel-head">
          <span className="bodymap-side-tag">{sideLeftLabel}</span>
          <span>{backLabel}</span>
          <span className="bodymap-side-tag">{sideRightLabel}</span>
        </div>

        <svg className="bodymap-svg" viewBox="0 0 240 520" aria-label={backLabel}>
          <defs>
            <linearGradient id={bodyBaseGradBackId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#222D42" />
              <stop offset="50%" stopColor="#172030" />
              <stop offset="100%" stopColor="#101724" />
            </linearGradient>
            <clipPath id={clipBackId}>
              <path d={BACK_BODY_PATH} />
            </clipPath>
          </defs>

          <path fill={`url(#${bodyBaseGradBackId})`} pointerEvents="none" d={BACK_BODY_PATH} />

          <g clipPath={`url(#${clipBackId})`}>
            {BACK_ZONES.map(renderInteractiveZone)}

            {/* Subtle hair/nape shadow to visually distinguish back view */}
            <path
              className="anatomy-shadow"
              d="M 101 38 C 101 20 109 14 120 14 C 131 14 139 20 139 38 C 137 52 132 60 120 62 C 108 60 103 52 101 38 Z"
            />
          </g>

          {/* Back anatomical guide lines */}
          <g className="anatomy-line">
            <path d="M 105 56 Q 120 64 135 56" />
            <path d="M 111 84 Q 98 94 86 102" />
            <path d="M 129 84 Q 142 94 154 102" />
            <path d="M 91 112 Q 106 116 111 142 Q 98 148 89 132" />
            <path d="M 149 112 Q 134 116 129 142 Q 142 148 151 132" />
            <path d="M 120 88 L 120 218" />
            <path d="M 82 246 Q 99 258 117 248" />
            <path d="M 158 246 Q 141 258 123 248" />
            <path d="M 100 264 L 100 338" />
            <path d="M 140 264 L 140 338" />
            <path d="M 88 362 Q 100 357 112 362" />
            <path d="M 152 362 Q 140 357 128 362" />
            <path d="M 88 408 Q 100 422 111 408" />
            <path d="M 152 408 Q 140 422 129 408" />
            <path d="M 100 426 L 100 492" />
            <path d="M 140 426 L 140 492" />
          </g>

          <path className="body-outer-rim" d={BACK_BODY_PATH} />
        </svg>
      </div>
    </div>
  );
}
