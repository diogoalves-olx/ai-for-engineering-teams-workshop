'use client';

import type { FC } from 'react';
import type { Alert } from '../lib/alerts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertsPanelProps {
  /** The full list of alerts to evaluate for display (dismissed ones are filtered out). */
  alerts: Alert[];
  /** When true, renders animated skeleton placeholders instead of content. */
  isLoading: boolean;
  /** When non-null, renders a red error message with the provided text. */
  error: string | null;
  /** Called with the alert id when the user clicks "Dismiss". */
  onDismiss: (alertId: string) => void;
  /** Called with the alert id when the user clicks "Mark Actioned". */
  onAction: (alertId: string) => void;
}

// ---------------------------------------------------------------------------
// Internal constants
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

/** Priority badge colour classes. */
const PRIORITY_STYLES = {
  high:   { badge: 'bg-red-100 text-red-800',    border: 'border-red-200',   bg: 'bg-red-50'    },
  medium: { badge: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200', bg: 'bg-yellow-50' },
} satisfies Record<Alert['priority'], { badge: string; border: string; bg: string }>;

/** Priority sort order: high before medium. */
const PRIORITY_ORDER: Record<Alert['priority'], number> = {
  high:   0,
  medium: 1,
} satisfies Record<Alert['priority'], number>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a ruleType string to a readable label, falling back to title-casing the raw value. */
function formatRuleType(ruleType: string): string {
  return RULE_TYPE_LABELS[ruleType] ?? ruleType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
// Sub-components
// ---------------------------------------------------------------------------

/** Animated skeleton rendered while alert data is loading. */
const LoadingSkeleton: FC = () => (
  <div aria-busy="true" aria-label="Loading alerts" className="space-y-3">
    {[1, 2, 3].map((n) => (
      <div
        key={n}
        className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-2 pt-1">
          <div className="h-7 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-7 w-28 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * AlertsPanel
 *
 * Renders the Active Alerts widget for the Customer Health Monitoring system.
 * Handles four UI states:
 *
 *   1. Loading  — animated skeleton placeholders
 *   2. Error    — red error banner with the provided message
 *   3. Empty    — reassuring "all customers on track" message
 *   4. Data     — list of undismissed alerts sorted high → medium priority
 *
 * Each alert card is colour-coded by priority and provides "Dismiss" and
 * "Mark Actioned" buttons that delegate to the parent via callbacks.
 */
export const AlertsPanel: FC<AlertsPanelProps> = ({
  alerts,
  isLoading,
  error,
  onDismiss,
  onAction,
}) => {
  // Filter dismissed alerts and sort by priority order.
  const activeAlerts = alerts
    .filter((a) => !a.dismissed)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div
      aria-label="Active alerts panel"
      className="bg-white rounded-lg shadow p-6"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Active Alerts
      </h2>

      {/* ---- Loading state ---- */}
      {isLoading && <LoadingSkeleton />}

      {/* ---- Error state ---- */}
      {!isLoading && error !== null && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Unable to load alerts</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-500">
            Please refresh the page or try again later.
          </p>
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!isLoading && error === null && activeAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            No active alerts — all customers are on track
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Alerts will appear here when customer health conditions require CSM attention.
          </p>
        </div>
      )}

      {/* ---- Data state ---- */}
      {!isLoading && error === null && activeAlerts.length > 0 && (
        <ul className="space-y-3" aria-label="Alert list">
          {activeAlerts.map((alert) => {
            const styles = PRIORITY_STYLES[alert.priority];
            return (
              <li
                key={alert.id}
                className={[
                  'rounded-lg border p-4',
                  styles.border,
                  styles.bg,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* Header row: rule type label + priority badge */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatRuleType(alert.ruleType)}
                  </p>
                  <span
                    aria-label={`Priority: ${alert.priority}`}
                    className={[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                      styles.badge,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {alert.priority}
                  </span>
                </div>

                {/* Alert message */}
                <p className="mt-2 text-sm text-gray-700">{alert.message}</p>

                {/* Recommended action */}
                <p className="mt-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Recommended: </span>
                  {alert.recommendedAction}
                </p>

                {/* Triggered timestamp */}
                <p className="mt-2 text-xs text-gray-400">
                  Triggered{' '}
                  <time dateTime={alert.triggeredAt}>
                    {formatTriggeredAt(alert.triggeredAt)}
                  </time>
                </p>

                {/* Action buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label={`Dismiss alert: ${formatRuleType(alert.ruleType)}`}
                    onClick={() => onDismiss(alert.id)}
                    className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    aria-label={`Mark actioned: ${formatRuleType(alert.ruleType)}`}
                    onClick={() => onAction(alert.id)}
                    className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
                  >
                    Mark Actioned
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

AlertsPanel.displayName = 'AlertsPanel';

export default AlertsPanel;
