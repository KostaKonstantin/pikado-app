'use client';
import React from 'react';

/* ── Backward-compat exports ─────────────────────────────────────── */
export type DartType    = 'classic' | 'slim' | 'grip' | 'pro' | 'heavy';
export type TipType     = 'classic' | 'needle' | 'heavy';
export type FlightType  = 'standard' | 'slim' | 'kite' | 'fantasy' | 'pro';
export type PatternType = 'solid' | 'stripe' | 'split' | 'diamond' | 'flame' | 'carbon';

export interface PlayerAvatar {
  dartType: DartType;
  tipType: TipType;
  flightType: FlightType;
  primaryColor: string;
  secondaryColor: string;
  pattern: PatternType;
}

export const AVATAR_SEEDS: PlayerAvatar[] = [
  { dartType: 'classic', tipType: 'classic', flightType: 'standard', primaryColor: '#FF4D4D', secondaryColor: '#1A1A1A', pattern: 'solid'   },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'slim',     primaryColor: '#4DA6FF', secondaryColor: '#0A0A23', pattern: 'stripe'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'kite',     primaryColor: '#4DFF88', secondaryColor: '#003322', pattern: 'split'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'pro',      primaryColor: '#FFD24D', secondaryColor: '#332200', pattern: 'diamond' },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'fantasy',  primaryColor: '#B84DFF', secondaryColor: '#220033', pattern: 'flame'   },
  { dartType: 'classic', tipType: 'classic', flightType: 'kite',     primaryColor: '#FF8C42', secondaryColor: '#331A00', pattern: 'stripe'  },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'standard', primaryColor: '#2ED3B7', secondaryColor: '#003333', pattern: 'carbon'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'fantasy',  primaryColor: '#FF4D4D', secondaryColor: '#000000', pattern: 'flame'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'slim',     primaryColor: '#4DA6FF', secondaryColor: '#111111', pattern: 'split'   },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'pro',      primaryColor: '#FFD24D', secondaryColor: '#1A1A1A', pattern: 'carbon'  },
  { dartType: 'classic', tipType: 'classic', flightType: 'fantasy',  primaryColor: '#B84DFF', secondaryColor: '#0D001A', pattern: 'diamond' },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'kite',     primaryColor: '#2ED3B7', secondaryColor: '#001A1A', pattern: 'stripe'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'standard', primaryColor: '#FF8C42', secondaryColor: '#1A0F00', pattern: 'solid'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'fantasy',  primaryColor: '#4DFF88', secondaryColor: '#001A0D', pattern: 'flame'   },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'kite',     primaryColor: '#FF4D4D', secondaryColor: '#330000', pattern: 'split'   },
];

export const DEFAULT_AVATAR: PlayerAvatar = AVATAR_SEEDS[0];

export function hashAvatarFromName(name: string): PlayerAvatar {
  const h = Array.from(name || '').reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7);
  return AVATAR_SEEDS[h % AVATAR_SEEDS.length];
}

export function randomAvatar(): PlayerAvatar {
  return AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
}

/* ── Dark background gradients (regular players) ─────────────────
   All look "dark grey" at a glance — subtle hue variation per player
   so they're distinguishable up close without being loud.          */
const DARK_GRADIENTS: [string, string][] = [
  ['#1a2840', '#0b1220'], // ocean blue
  ['#1e2a1e', '#0d150d'], // forest green
  ['#2a1a2e', '#14091a'], // violet
  ['#2a2214', '#17130a'], // amber-grey
  ['#2a1a1a', '#170909'], // crimson-grey
  ['#141e2a', '#080d14'], // midnight
  ['#1e1a2a', '#100c17'], // purple-grey
  ['#1a2626', '#0d1414'], // teal-grey
];

/* ── Rank backgrounds (gold / silver / bronze) ───────────────────── */
const RANK_BG: Record<number, string> = {
  1: 'linear-gradient(135deg, #7a6010, #3a2c04)',
  2: 'linear-gradient(135deg, #3e3e4e, #1c1c28)',
  3: 'linear-gradient(135deg, #6b3c18, #2e1508)',
};

/* ── Rank glow colors ────────────────────────────────────────────── */
const RANK_GLOW: Record<number, string> = {
  1: 'rgba(255, 215,  0, 0.55)',
  2: 'rgba(192, 192, 192, 0.40)',
  3: 'rgba(205, 127,  50, 0.40)',
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function idHash(seed: string): number {
  return Array.from(seed || '')
    .reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7);
}

function getDarkGradient(seed: string): string {
  const [c1, c2] = DARK_GRADIENTS[idHash(seed) % DARK_GRADIENTS.length];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Sizes ───────────────────────────────────────────────────────── */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
const SIZE_PX: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 72, xl: 96 };

const BADGE_PX: Record<AvatarSize, number>     = { sm: 14, md: 18, lg: 22, xl: 26 };
const BADGE_OFFSET: Record<AvatarSize, number> = { sm: -2, md: -2, lg: -2, xl: -1 };

/* ── SVG ring constants ──────────────────────────────────────────── */
// The SVG overflows the avatar div by RING_OVERFLOW px on each side.
const RING_OVERFLOW = 5; // px per side → SVG is px+10 × px+10

function ringRadius(px: number): number {
  // Center of the 3px stroke sits just outside the avatar circle edge
  return px / 2 + 3.5;
}

function ringCircumference(r: number): number {
  return 2 * Math.PI * r;
}

/* ── Component ───────────────────────────────────────────────────── */
export interface DartAvatarProps {
  name?: string | null;
  id?: string | null;
  avatar?: PlayerAvatar | null; // kept for API compat, ignored visually
  rank?: number;
  winRate?: number;             // 0–100, drives the SVG progress ring
  size?: AvatarSize;
  className?: string;
}

export function DartAvatar({
  name,
  id,
  rank,
  winRate,
  size = 'md',
  className = '',
}: DartAvatarProps) {
  const px       = SIZE_PX[size];
  const display  = name?.trim() || '?';
  const initials = getInitials(display);
  const hashSeed = id || display;

  /* Background gradient */
  const isTop3 = rank === 1 || rank === 2 || rank === 3;
  const bgGradient = isTop3 ? RANK_BG[rank!] : getDarkGradient(hashSeed);

  /* Font size */
  const fs = Math.round(px * (initials.length === 1 ? 0.42 : 0.36));

  /* Box shadow: inner glow + optional outer rank glow */
  const innerGlow = 'inset 0 2px 4px rgba(255,255,255,0.18)';
  const outerGlow = isTop3
    ? `0 0 18px ${RANK_GLOW[rank!]}, 0 0 36px ${RANK_GLOW[rank!].replace('0.55', '0.20').replace('0.40', '0.15')}`
    : '0 2px 8px rgba(0,0,0,0.45)';
  const boxShadow = `${innerGlow}, ${outerGlow}`;

  /* Badge */
  const bpx      = BADGE_PX[size];
  const boff     = BADGE_OFFSET[size];
  const badgeColor =
    rank === 1 ? '#FFD700' :
    rank === 2 ? '#C0C0C0' :
                  '#CD7F32';

  /* SVG ring */
  const svgSize = px + RING_OVERFLOW * 2;
  const cx      = svgSize / 2;
  const cy      = svgSize / 2;
  const r       = ringRadius(px);
  const circ    = ringCircumference(r);
  const showRing = winRate !== undefined;
  const ringColor = (winRate ?? 0) >= 60 ? '#f59e0b' : '#2dd4bf';
  const dashOffset = showRing ? circ * (1 - (winRate ?? 0) / 100) : circ;

  return (
    /* Outer wrapper — hover target, leader-glow animation for rank 1 */
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none avatar-hover ${rank === 1 ? 'avatar-leader' : ''} ${className}`}
      style={{ width: px, height: px, flexShrink: 0 }}
    >
      {/* Rank 1: ping pulse behind avatar */}
      {rank === 1 && (
        <div
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{ backgroundColor: 'rgba(255, 215, 0, 0.18)', animationDuration: '2s' }}
        />
      )}

      {/* SVG progress ring (overflows by RING_OVERFLOW px each side) */}
      {showRing && (
        <svg
          className="absolute pointer-events-none"
          style={{
            top:    -RING_OVERFLOW,
            left:   -RING_OVERFLOW,
            width:   svgSize,
            height:  svgSize,
            transform: 'rotate(-90deg)',
          }}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          overflow="visible"
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
            fill="none"
          />
          {/* Progress arc */}
          <circle
            className="avatar-ring-progress"
            cx={cx} cy={cy} r={r}
            stroke={ringColor}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
          />
        </svg>
      )}

      {/* Avatar circle — glassmorphism dark gradient */}
      <div
        style={{
          position:       'absolute',
          inset:           0,
          borderRadius:   '50%',
          background:      bgGradient,
          border:         '1px solid rgba(255,255,255,0.12)',
          boxShadow,
          backdropFilter: 'blur(4px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="avatar-initials"
          style={{
            color:        '#fff',
            fontSize:      fs,
            fontWeight:    800,
            lineHeight:    1,
            letterSpacing: initials.length > 1 ? '0.04em' : '0',
            textShadow:   '0 1px 3px rgba(0,0,0,0.40)',
            userSelect:   'none',
            fontFamily:   'inherit',
          }}
        >
          {initials}
        </span>
      </div>

      {/* Rank badge (top 3 only) */}
      {isTop3 && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            width:        bpx,
            height:       bpx,
            borderRadius: '50%',
            background:   '#0b0f17',
            border:       `1.5px solid ${badgeColor}`,
            bottom:        boff,
            right:         boff,
            zIndex:        1,
          }}
        >
          <span style={{ fontSize: Math.round(bpx * 0.52), fontWeight: 900, lineHeight: 1, color: badgeColor }}>
            {rank}
          </span>
        </div>
      )}
    </div>
  );
}
