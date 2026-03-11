'use client';

import type { FC } from 'react';
import { HealthIndicator } from './HealthIndicator';
import type { HealthScoreResult } from '../lib/healthCalculator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerHealthDisplayProps {
  /** Identifier of the customer whose health is being displayed. */
  customerId: string;
  /**
   * Computed health score result from calculateHealthScore.
   * Pass null when no score has been calculated yet.
   */
  healthData: HealthScoreResult | null;
  /** When true, renders animated skeleton placeholders instead of content. */
  isLoading: boolean;
  /** When non-null, renders a red error message with the provided text. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Display metadata for each breakdown factor. */
const FACTOR_META = [
  { key: 'payment',    label: 'Payment',    weight: '40%' },
  { key: 'engagement', label: 'Engagement', weight: '30%' },
  { key: 'contract',   label: 'Contract',   weight: '20%' },
  { key: 'support',    label: 'Support',    weight: '10%' },
] as const satisfies ReadonlyArray<{
  key: keyof HealthScoreResult['breakdown'];
  label: string;
  weight: string;
}>;

/** Arrow character and colour class for each trend value. */
const TREND_DISPLAY = {
  improving: { arrow: '↑', label: 'Improving', colorClass: 'text-green-600' },
  stable:    { arrow: '→', label: 'Stable',    colorClass: 'text-gray-500'  },
  declining: { arrow: '↓', label: 'Declining', colorClass: 'text-red-600'   },
} satisfies Record<HealthScoreResult['trend'], { arrow: string; label: string; colorClass: string }>;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated skeleton placeholder rendered while data is loading. */
const LoadingSkeleton: FC = () => (
  <div aria-busy="true" aria-label="Loading health data" className="space-y-4">
    {/* Overall score bar skeleton */}
    <div className="space-y-2">
      <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-200" />
    </div>

    {/* Trend skeleton */}
    <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />

    {/* Factor rows skeleton */}
    <div className="space-y-3 border-t border-gray-100 pt-4">
      {FACTOR_META.map((f) => (
        <div key={f.key} className="space-y-1">
          <div className="flex justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-6 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * CustomerHealthDisplay
 *
 * Renders a self-contained health score widget for a single customer.
 * The widget handles four UI states:
 *
 *   1. Loading  — animated skeleton placeholders
 *   2. Error    — red error message with static retry guidance
 *   3. Empty    — "No health data available" prompt
 *   4. Data     — overall bar, trend indicator, per-factor breakdown
 *
 * Health colour thresholds are delegated entirely to HealthIndicator so this
 * component stays in sync with the rest of the dashboard automatically.
 */
export const CustomerHealthDisplay: FC<CustomerHealthDisplayProps> = ({
  customerId,
  healthData,
  isLoading,
  error,
}) => {
  return (
    <div
      aria-label={`Health score for customer ${customerId}`}
      className="bg-white rounded-lg shadow p-6"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Health Score
      </h2>

      {/* ---- Loading state ---- */}
      {isLoading && <LoadingSkeleton />}

      {/* ---- Error state ---- */}
      {!isLoading && error !== null && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Unable to load health data</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-500">
            Please refresh the page or try again later.
          </p>
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!isLoading && error === null && healthData === null && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            No health data available
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Health data will appear once the first score has been calculated.
          </p>
        </div>
      )}

      {/* ---- Data state ---- */}
      {!isLoading && error === null && healthData !== null && (
        <div className="space-y-4">
          {/* Overall health score bar */}
          <HealthIndicator
            score={healthData.overallScore}
            variant="bar"
            size="md"
            showLabel
            showScore
          />

          {/* Trend indicator */}
          <div
            className={[
              'flex items-center gap-1 text-sm font-medium',
              TREND_DISPLAY[healthData.trend].colorClass,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`Trend: ${TREND_DISPLAY[healthData.trend].label}`}
          >
            <span aria-hidden="true">{TREND_DISPLAY[healthData.trend].arrow}</span>
            <span>{TREND_DISPLAY[healthData.trend].label}</span>
            {healthData.previousScore !== undefined && (
              <span className="ml-1 text-xs font-normal text-gray-400">
                (prev. {healthData.previousScore})
              </span>
            )}
          </div>

          {/* Per-factor breakdown */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Factor Breakdown
            </p>
            {FACTOR_META.map((factor) => (
              <div key={factor.key} className="space-y-1">
                {/* Factor label row */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">{factor.label}</span>
                  <span className="tabular-nums text-gray-400">{factor.weight}</span>
                </div>

                {/* Factor health bar — delegates colour logic to HealthIndicator */}
                <HealthIndicator
                  score={healthData.breakdown[factor.key]}
                  variant="bar"
                  size="sm"
                  showScore
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

CustomerHealthDisplay.displayName = 'CustomerHealthDisplay';

export default CustomerHealthDisplay;
