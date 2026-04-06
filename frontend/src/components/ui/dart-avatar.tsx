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
];

export const DEFAULT_AVATAR: PlayerAvatar = AVATAR_SEEDS[0];

export function hashAvatarFromName(name: string): PlayerAvatar {
  const h = Array.from(name || '').reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7);
  return AVATAR_SEEDS[h % AVATAR_SEEDS.length];
}

export function randomAvatar(): PlayerAvatar {
  return AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
}

/* ── Avatar variant system ───────────────────────────────────────────
   8 rich, colorful gradient identities — one per player (hashed).
   Each variant has a unique personality: depth, glow, ring color.     */
interface AvatarVariant {
  bg:         string;  // face gradient
  innerGlow:  string;  // rgba — bottom depth shadow
  outerAura:  string;  // rgba — ambient outer haze
  ringColor:  string;  // progress arc + border tint
  textGlow:   string;  // initials text-shadow color (rgba)
  highlight:  string;  // css color — top-of-ring highlight stop
}

/* ── Generative variant — unique hue per player ──────────────────
   Uses the golden angle (137.508°) on the hash so consecutive hues
   are maximally spread even for small player counts.
   Produces ~65 000 distinct identities — no two players look alike. */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function generateVariant(seed: string): AvatarVariant {
  const h = idHash(seed);

  // Golden angle spread — maximally distributes hues across the spectrum
  const hue = Math.round((h * 137.508) % 360);

  // Derive secondary properties from different bit regions of the hash
  const sat    = 62 + (h % 23);          // 62–85 % — always vivid
  const darkL  = 6  + ((h >> 4) % 10);   // 6–16 %  — very dark base
  const midL   = 24 + ((h >> 8) % 14);   // 24–38 % — mid tone
  const accL   = 50 + ((h >> 6) % 16);   // 50–66 % — accent/top

  // Accent RGB for rgba() values used in box-shadow
  const [ar, ag, ab] = hslToRgb(hue, sat + 5, accL + 8);

  return {
    bg:        `linear-gradient(145deg, hsl(${hue},${sat}%,${darkL}%) 0%, hsl(${hue},${sat}%,${midL}%) 48%, hsl(${hue},${sat + 5}%,${accL}%) 100%)`,
    innerGlow: `rgba(${ar},${ag},${ab},0.65)`,
    outerAura: `rgba(${ar},${ag},${ab},0.28)`,
    ringColor: `hsl(${hue},${sat + 5}%,${accL + 10}%)`,
    textGlow:  `rgba(${ar},${ag},${ab},0.95)`,
    highlight: `hsl(${(hue + 25) % 360},80%,78%)`,
  };
}

/* ── Rank backgrounds — prestige tier ───────────────────────────── */
const RANK_VARIANT: Record<number, AvatarVariant> = {
  1: { // Gold prestige
    bg:        'linear-gradient(145deg, #2d1500 0%, #7c3800 40%, #b45309 75%, #d97706 100%)',
    innerGlow: 'rgba(217,119,6,0.80)',
    outerAura: 'rgba(251,191,36,0.50)',
    ringColor: '#fbbf24',
    textGlow:  'rgba(253,230,138,1.00)',
    highlight: '#fef08a',
  },
  2: { // Silver prestige
    bg:        'linear-gradient(145deg, #0a0e17 0%, #1e2d40 40%, #334155 75%, #64748b 100%)',
    innerGlow: 'rgba(100,116,139,0.70)',
    outerAura: 'rgba(148,163,184,0.38)',
    ringColor: '#94a3b8',
    textGlow:  'rgba(203,213,225,0.95)',
    highlight: '#e2e8f0',
  },
  3: { // Bronze / copper prestige
    bg:        'linear-gradient(145deg, #1c0800 0%, #5c1a00 40%, #9a3412 75%, #c2410c 100%)',
    innerGlow: 'rgba(194,65,12,0.75)',
    outerAura: 'rgba(249,115,22,0.40)',
    ringColor: '#fb923c',
    textGlow:  'rgba(253,186,116,0.95)',
    highlight: '#fed7aa',
  },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function idHash(seed: string): number {
  return Array.from(seed || '')
    .reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7);
}

function getVariant(seed: string): AvatarVariant {
  return generateVariant(seed);
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
const RING_OVERFLOW = 6; // px per side

function ringRadius(px: number): number { return px / 2 + 3.5; }
function ringCircumference(r: number): number { return 2 * Math.PI * r; }

/* ── Component ───────────────────────────────────────────────────── */
export interface DartAvatarProps {
  name?: string | null;
  id?: string | null;
  avatar?: PlayerAvatar | null;
  rank?: number;
  winRate?: number;
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

  /* Pick variant */
  const isTop3   = rank === 1 || rank === 2 || rank === 3;
  const variant  = isTop3 ? RANK_VARIANT[rank!] : getVariant(hashSeed);

  /* Font size */
  const fs = Math.round(px * (initials.length === 1 ? 0.42 : 0.36));

  /* Box shadow — 5 layers: depth + gloss + tight ring + ambient + dark base */
  const boxShadow = [
    `inset 0 -${Math.round(px * 0.18)}px ${Math.round(px * 0.38)}px ${variant.innerGlow}`,
    `inset 0 ${Math.round(px * 0.06)}px ${Math.round(px * 0.14)}px rgba(255,255,255,0.14)`,
    `0 0 0 1px ${variant.outerAura.replace('0.28', '0.45').replace('0.30', '0.50').replace('0.38', '0.55').replace('0.40', '0.55').replace('0.50', '0.60')}`,
    `0 0 ${Math.round(px * 0.55)}px ${variant.outerAura}`,
    `0 0 ${Math.round(px * 1.1)}px ${variant.outerAura.replace('0.28', '0.10').replace('0.30', '0.12').replace('0.38', '0.14').replace('0.40', '0.14').replace('0.50', '0.18')}`,
    `0 ${Math.round(px * 0.10)}px ${Math.round(px * 0.35)}px rgba(0,0,0,0.55)`,
  ].join(', ');

  /* Badge colors */
  const badgeColor =
    rank === 1 ? '#fbbf24' :
    rank === 2 ? '#94a3b8' :
                 '#f97316';

  /* SVG progress ring */
  const svgSize    = px + RING_OVERFLOW * 2;
  const cx         = svgSize / 2;
  const cy         = svgSize / 2;
  const r          = ringRadius(px);
  const circ       = ringCircumference(r);
  const showRing   = winRate !== undefined;
  const dashOffset = showRing ? circ * (1 - (winRate ?? 0) / 100) : circ;

  /* Motion class per rank */
  const motionClass =
    rank === 1 ? 'avatar-leader' :
    rank === 2 ? 'avatar-silver' :
    rank === 3 ? 'avatar-bronze' :
                 'avatar-ambient';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none avatar-hover ${motionClass} ${className}`}
      style={{ width: px, height: px, flexShrink: 0 }}
    >
      {/* Top 3: outer prestige pulse ring (gold / silver / bronze) */}
      {isTop3 && (
        <div
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{
            backgroundColor:
              rank === 1 ? 'rgba(251,191,36,0.18)' :
              rank === 2 ? 'rgba(148,163,184,0.18)' :
                           'rgba(249,115,22,0.18)',
            animationDuration: rank === 1 ? '2.2s' : rank === 2 ? '2.6s' : '2.4s',
          }}
        />
      )}

      {/* SVG progress ring */}
      {showRing && (
        <svg
          className="absolute pointer-events-none"
          style={{
            top: -RING_OVERFLOW, left: -RING_OVERFLOW,
            width: svgSize, height: svgSize,
            transform: 'rotate(-90deg)',
          }}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          overflow="visible"
        >
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" fill="none" />
          {/* Progress arc */}
          <circle
            className="avatar-ring-progress"
            cx={cx} cy={cy} r={r}
            stroke={variant.ringColor}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ filter: `drop-shadow(0 0 4px ${variant.ringColor}88)` }}
          />
        </svg>
      )}

      {/* Avatar face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: variant.bg,
          boxShadow,
          backdropFilter: 'blur(2px)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glossy top-highlight overlay — creates lens/glass depth */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 10%, ${variant.highlight}30 0%, ${variant.highlight}0a 38%, transparent 62%)`,
          pointerEvents: 'none',
        }} />

        {/* Initials */}
        <span
          className="avatar-initials"
          style={{
            position: 'relative',
            color: '#ffffff',
            fontSize: fs,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: initials.length > 1 ? '0.06em' : '0',
            textShadow: `0 0 ${Math.round(fs * 0.9)}px ${variant.textGlow}, 0 1px 4px rgba(0,0,0,0.60)`,
            userSelect: 'none',
            fontFamily: 'inherit',
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
            width: BADGE_PX[size],
            height: BADGE_PX[size],
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${badgeColor}44, #0b0f17 80%)`,
            border: `1.5px solid ${badgeColor}`,
            boxShadow: `0 0 8px ${badgeColor}66`,
            bottom: BADGE_OFFSET[size],
            right: BADGE_OFFSET[size],
            zIndex: 1,
          }}
        >
          <span style={{
            fontSize: Math.round(BADGE_PX[size] * 0.52),
            fontWeight: 900,
            lineHeight: 1,
            color: badgeColor,
            textShadow: `0 0 6px ${badgeColor}`,
          }}>
            {rank}
          </span>
        </div>
      )}
    </div>
  );
}
