'use client';

import { useState, type FC } from 'react';
import type { PredictiveInsight } from '../lib/predictiveIntelligence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsightCardProps {
  /** The predictive insight to display. */
  insight: PredictiveInsight;
  /** Called with the alert id when the user dismisses the insight. */
  onDismiss: (alertId: string) => void;
  /** Called with the alert id when the user takes action on the insight. */
  onAction: (alertId: string) => void;
  /**
   * Called with the alert id and a snooze duration when the user selects a
   * snooze option.  Duration is either 4 hours or 24 hours.
   */
  onSnooze: (alertId: string, hours: 4 | 24) => void;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

/** Maps ruleType identifiers to human-readable display labels. */
const RULE_TYPE_LABELS: Record<string, string> = {
  payment_overdue:     'Payment Overdue',
  health_drop:         'Health Score Drop',
  login_drop:          'Login Drop',
  contract_expiration: 'Contract Expiration',
  support_spike:       'Support Spike',
  feature_stall:       'Feature Stall',
};

/** Left border accent colour class keyed by alert priority. */
const PRIORITY_BORDER: Record<'high' | 'medium', string> = {
  high:   'border-l-4 border-red-500',
  medium: 'border-l-4 border-yellow-500',
};

/** Confidence badge colour classes. */
const CONFIDENCE_BADGE: Record<PredictiveInsight['confidence'], string> = {
  high:   'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low:    'bg-blue-100 text-blue-800',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a ruleType string to a readable label. */
function formatRuleType(ruleType: string): string {
  return (
    RULE_TYPE_LABELS[ruleType] ??
    ruleType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Formats an ISO 8601 timestamp to a localised date + time string. */
function formatTriggeredAt(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString(undefined, {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * InsightCard
 *
 * Collapsible card that surfaces a single PredictiveInsight for CSM review.
 * Provides dismiss, action, and snooze (4 h / 24 h) controls in the expanded
 * state.  The card is colour-coded by alert priority on its left border and
 * displays a confidence badge regardless of expansion state.
 *
 * UI states:
 *   Collapsed — rule type label, confidence badge, brief alert message, expand
 *               button.
 *   Expanded  — full message, reasoning, optional market context with top 2
 *               headlines, recommended action, and action controls.
 */
export const InsightCard: FC<InsightCardProps> = ({
  insight,
  onDismiss,
  onAction,
  onSnooze,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [snoozeOpen, setSnoozeOpen] = useState<boolean>(false);

  const { alert, marketContext, confidence, recommendedAction } = insight;
  const ruleLabel = formatRuleType(alert.ruleType);

  function handleSnoozeSelect(hours: 4 | 24): void {
    setSnoozeOpen(false);
    onSnooze(alert.id, hours);
  }

  return (
    <article
      aria-label={`Insight: ${ruleLabel}`}
      className={[
        'rounded-lg border border-gray-200 bg-white overflow-hidden',
        PRIORITY_BORDER[alert.priority],
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ---- Collapsed header (always visible) ---- */}
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* Left: rule type + confidence badge */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{ruleLabel}</p>
            <span
              aria-label={`Confidence: ${confidence}`}
              className={[
                'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                CONFIDENCE_BADGE[confidence],
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {confidence} confidence
            </span>
          </div>

          {/* Right: expand/collapse toggle */}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`insight-body-${alert.id}`}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Brief message — always visible */}
        <p
          className={[
            'mt-2 text-sm text-gray-700',
            !isExpanded ? 'line-clamp-2' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {alert.message}
        </p>
      </div>

      {/* ---- Expanded body ---- */}
      {isExpanded && (
        <div
          id={`insight-body-${alert.id}`}
          className="border-t border-gray-100 p-4 space-y-4"
        >
          {/* Full alert reasoning */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Alert detail
            </p>
            <p className="text-sm text-gray-700">{alert.message}</p>
            <p className="text-xs text-gray-400">
              Triggered{' '}
              <time dateTime={alert.triggeredAt}>
                {formatTriggeredAt(alert.triggeredAt)}
              </time>
            </p>
          </div>

          {/* Market context — only rendered when available */}
          {marketContext !== null && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Market context
              </p>
              <p className="text-sm text-gray-700">{marketContext.summary}</p>

              {marketContext.relevantHeadlines.length > 0 && (
                <ul className="space-y-1.5" aria-label="Relevant market headlines">
                  {marketContext.relevantHeadlines.map((headline, idx) => (
                    <li key={idx} className="text-sm text-gray-600 line-clamp-1">
                      {headline.title}
                      <span className="ml-1.5 text-xs text-gray-400">
                        — {headline.source}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Recommended action */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Recommended action
            </p>
            <p className="text-sm text-gray-700">{recommendedAction}</p>
          </div>

          {/* Action controls */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Dismiss */}
            <button
              type="button"
              aria-label={`Dismiss insight: ${ruleLabel}`}
              onClick={() => onDismiss(alert.id)}
              className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
            >
              Dismiss
            </button>

            {/* Take action */}
            <button
              type="button"
              aria-label={`Mark actioned: ${ruleLabel}`}
              onClick={() => onAction(alert.id)}
              className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
            >
              Mark Actioned
            </button>

            {/* Snooze dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label="Snooze insight"
                aria-haspopup="true"
                aria-expanded={snoozeOpen}
                onClick={() => setSnoozeOpen((prev) => !prev)}
                className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
              >
                Snooze ▾
              </button>

              {snoozeOpen && (
                <div
                  role="menu"
                  aria-label="Snooze duration options"
                  className="absolute left-0 top-full mt-1 z-10 min-w-[8rem] rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSnoozeSelect(4)}
                    className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
                  >
                    Snooze 4 hours
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSnoozeSelect(24)}
                    className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
                  >
                    Snooze 24 hours
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

InsightCard.displayName = 'InsightCard';

export default InsightCard;
