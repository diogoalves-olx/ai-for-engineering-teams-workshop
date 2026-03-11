import type { FC } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthTier = 'critical' | 'warning' | 'healthy';

export interface HealthIndicatorProps {
  /** Numeric health score, clamped internally to 0–100. */
  score: number;
  /** Visual rendering mode. Defaults to "badge". */
  variant?: 'badge' | 'dot' | 'bar';
  /** Size token controlling padding and font size. Defaults to "md". */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to render the numeric score inside the indicator.
   * Defaults to true for "badge", false for "dot" and "bar".
   */
  showScore?: boolean;
  /** Whether to render the human-readable tier label (Critical / Warning / Healthy). Defaults to false. */
  showLabel?: boolean;
  /** Additional Tailwind classes forwarded to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const TIER_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  healthy: 'Healthy',
} satisfies Record<HealthTier, string>;

/** Background color for the filled indicator surface (dot, badge, bar fill). */
const TIER_BG = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-400',
  healthy: 'bg-green-500',
} satisfies Record<HealthTier, string>;

/**
 * Text color used when the label is rendered outside a colored surface
 * (i.e. in the badge variant the text is white; these are used for dot/bar
 * label text that sits on a neutral background).
 */
const TIER_TEXT = {
  critical: 'text-red-700',
  warning: 'text-yellow-700',
  healthy: 'text-green-700',
} satisfies Record<HealthTier, string>;

const BADGE_SIZE = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2',
} satisfies Record<NonNullable<HealthIndicatorProps['size']>, string>;

// Dot diameters: 8 px (sm) → w-2/h-2, 12 px (md) → w-3/h-3, 16 px (lg) → w-4/h-4
const DOT_SIZE = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
} satisfies Record<NonNullable<HealthIndicatorProps['size']>, string>;

const BAR_HEIGHT = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
} satisfies Record<NonNullable<HealthIndicatorProps['size']>, string>;

const LABEL_TEXT_SIZE = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} satisfies Record<NonNullable<HealthIndicatorProps['size']>, string>;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getTier(score: number): HealthTier {
  if (score <= 30) return 'critical';
  if (score <= 70) return 'warning';
  return 'healthy';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * HealthIndicator
 *
 * A purely presentational component that renders a colour-coded visual
 * indicator for a numeric health score (0–100).
 *
 * Colour thresholds:
 *   0–30   Critical  red
 *   31–70  Warning   yellow
 *   71–100 Healthy   green
 *
 * Three visual variants are supported: badge (default), dot, and bar.
 * This component centralises all health colour logic for the dashboard so
 * every consumer stays visually consistent.
 */
export const HealthIndicator: FC<HealthIndicatorProps> = ({
  score,
  variant = 'badge',
  size = 'md',
  showScore,
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, score));
  const tier = getTier(clamped);
  const label = TIER_LABEL[tier];
  const ariaLabel = `Health: ${label} (${clamped})`;

  // ---- dot ----------------------------------------------------------------
  if (variant === 'dot') {
    const displayScore = showScore ?? false;
    const hasText = displayScore || showLabel;

    if (!hasText) {
      return (
        <span
          role="img"
          aria-label={ariaLabel}
          className={[
            'inline-block rounded-full transition-colors',
            TIER_BG[tier],
            DOT_SIZE[size],
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      );
    }

    // dot + optional label/score shown inline beside the dot
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        className={[
          'inline-flex items-center gap-1.5',
          LABEL_TEXT_SIZE[size],
          TIER_TEXT[tier],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          aria-hidden="true"
          className={['inline-block shrink-0 rounded-full', TIER_BG[tier], DOT_SIZE[size]].join(' ')}
        />
        {displayScore && <span className="tabular-nums">{clamped}</span>}
        {showLabel && <span>{label}</span>}
      </span>
    );
  }

  // ---- bar ----------------------------------------------------------------
  if (variant === 'bar') {
    const displayScore = showScore ?? false;
    const hasText = displayScore || showLabel;

    return (
      <div
        className={['w-full', className].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
      >
        {hasText && (
          <div
            className={[
              'mb-1 flex items-center justify-between font-semibold',
              LABEL_TEXT_SIZE[size],
              TIER_TEXT[tier],
            ].join(' ')}
          >
            {showLabel && <span>{label}</span>}
            {displayScore && <span className="tabular-nums">{clamped}</span>}
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel}
          className={[
            'w-full overflow-hidden rounded-full bg-gray-200',
            BAR_HEIGHT[size],
          ].join(' ')}
        >
          <div
            className={['h-full rounded-full transition-all duration-300', TIER_BG[tier]].join(' ')}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    );
  }

  // ---- badge (default) ----------------------------------------------------
  const displayScore = showScore ?? true;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center rounded-full font-semibold text-white transition-colors duration-150',
        TIER_BG[tier],
        BADGE_SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {displayScore && <span className="tabular-nums">{clamped}</span>}
      {showLabel && <span>{label}</span>}
    </span>
  );
};

HealthIndicator.displayName = 'HealthIndicator';

export default HealthIndicator;
