'use client';

import type { FC } from 'react';
import type { PredictiveInsight } from '../lib/predictiveIntelligence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertHistoryProps {
  /**
   * Insights that have been resolved — dismissed, actioned, or snoozed.
   * Only these resolved insights are shown in the history list.
   */
  insights: PredictiveInsight[];
  /**
   * Optional callback invoked with the alert id when the user wants to
   * restore a resolved insight back to the active list.
   */
  onRestore?: (alertId: string) => void;
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

/** Formats an ISO 8601 timestamp to a short date + time string. */
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

/**
 * Derives a display status label from an insight's alert.
 * The Alert interface exposes only `dismissed: boolean`; resolved insights
 * passed to this component are those removed from the active list.
 */
function resolveStatusLabel(insight: PredictiveInsight): string {
  if (insight.alert.dismissed) {
    return 'Dismissed';
  }
  return 'Resolved';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * AlertHistory
 *
 * Renders a simple list of resolved (dismissed / actioned / snoozed)
 * PredictiveInsights.  Each row shows the rule type label, a confidence
 * badge, the trigger timestamp, and a derived status label.
 *
 * When `onRestore` is provided, a "Restore" button appears on each row
 * allowing a CSM to reinstate a previously resolved insight.
 *
 * Displays an empty state when no history is available.
 */
export const AlertHistory: FC<AlertHistoryProps> = ({
  insights,
  onRestore,
}) => {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-sm font-medium text-gray-500">No alert history</p>
        <p className="mt-1 text-xs text-gray-400">
          Dismissed, actioned, and snoozed alerts will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul
      aria-label="Alert history"
      className="divide-y divide-gray-100"
    >
      {insights.map((insight) => {
        const { alert, confidence } = insight;
        const ruleLabel = formatRuleType(alert.ruleType);
        const statusLabel = resolveStatusLabel(insight);

        return (
          <li
            key={alert.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3"
          >
            {/* Rule type label */}
            <span className="text-sm font-medium text-gray-700 min-w-0">
              {ruleLabel}
            </span>

            {/* Confidence badge */}
            <span
              aria-label={`Confidence: ${confidence}`}
              className={[
                'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                CONFIDENCE_BADGE[confidence],
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {confidence}
            </span>

            {/* Triggered timestamp */}
            <span className="text-xs text-gray-400 tabular-nums">
              <time dateTime={alert.triggeredAt}>
                {formatTriggeredAt(alert.triggeredAt)}
              </time>
            </span>

            {/* Status label */}
            <span className="text-xs font-medium text-gray-500 italic ml-auto shrink-0">
              {statusLabel}
            </span>

            {/* Optional restore button */}
            {onRestore !== undefined && (
              <button
                type="button"
                aria-label={`Restore insight: ${ruleLabel}`}
                onClick={() => onRestore(alert.id)}
                className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
              >
                Restore
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

AlertHistory.displayName = 'AlertHistory';

export default AlertHistory;
