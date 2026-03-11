'use client';

import React, { useEffect, useReducer, useRef, type FC } from 'react';
import { alertEngine } from '../lib/alerts';
import type { CustomerSnapshot } from '../lib/alerts';
import { synthesizeInsights } from '../lib/predictiveIntelligence';
import type { PredictiveInsight } from '../lib/predictiveIntelligence';
import type { MarketIntelligenceData } from '../lib/marketIntelligenceService';
import { InsightCard } from './InsightCard';
import { AlertHistory } from './AlertHistory';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictiveIntelligencePanelProps {
  /** Identifier for the customer whose insights should be evaluated. */
  customerId: string;
  /**
   * Company name used to fetch market intelligence context.
   * When omitted, the market context block is hidden.
   */
  company?: string;
  /** Additional Tailwind classes forwarded to the root container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

interface PanelState {
  insights: PredictiveInsight[];
  isLoading: boolean;
  error: string | null;
  showHistory: boolean;
}

type PanelAction =
  | { type: 'LOADING_START' }
  | { type: 'LOADING_SUCCESS'; insights: PredictiveInsight[] }
  | { type: 'LOADING_ERROR'; message: string }
  | { type: 'DISMISS'; alertId: string }
  | { type: 'ACTION'; alertId: string }
  | { type: 'SNOOZE'; alertId: string }
  | { type: 'TOGGLE_HISTORY' };

function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };

    case 'LOADING_SUCCESS':
      return { ...state, isLoading: false, error: null, insights: action.insights };

    case 'LOADING_ERROR':
      return { ...state, isLoading: false, error: action.message };

    case 'DISMISS':
      return {
        ...state,
        insights: state.insights.map((i) =>
          i.alert.id === action.alertId
            ? { ...i, alert: { ...i.alert, dismissed: true } }
            : i
        ),
      };

    // ACTION and SNOOZE both remove the insight from active tracking by
    // marking the underlying alert dismissed so it surfaces in history.
    case 'ACTION':
    case 'SNOOZE':
      return {
        ...state,
        insights: state.insights.map((i) =>
          i.alert.id === action.alertId
            ? { ...i, alert: { ...i.alert, dismissed: true } }
            : i
        ),
      };

    case 'TOGGLE_HISTORY':
      return { ...state, showHistory: !state.showHistory };

    default:
      return state;
  }
}

const initialState: PanelState = {
  insights: [],
  isLoading: true,
  error: null,
  showHistory: false,
};

// ---------------------------------------------------------------------------
// Mock snapshot generation
// ---------------------------------------------------------------------------

/**
 * Produces a deterministic CustomerSnapshot from a customerId string using a
 * simple djb2-style hash.  Different customer IDs produce varied scenarios
 * while repeated calls with the same ID return consistent data.
 */
function hashCustomerId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h) ^ id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function buildMockSnapshot(customerId: string): CustomerSnapshot {
  const h = hashCustomerId(customerId);

  // Derive varied scenario values from the hash.
  const scenario = h % 6;

  // Base snapshot — all accounts are current by default.
  const base: CustomerSnapshot = {
    customerId,
    healthScore: 75,
    daysSinceLastPayment: 5,
    overdueAmount: 0,
    loginFrequencyPerMonth: 20,
    openSupportTickets: 1,
    escalatedTickets: 0,
    recentTicketCount: 1,
    daysUntilRenewal: 180,
    noNewFeatureUsageDays: 10,
    isGrowingAccount: false,
  };

  // Overlay scenario-specific conditions to produce diverse alert patterns.
  switch (scenario) {
    case 0:
      // Payment overdue — high priority
      return {
        ...base,
        healthScore: 60,
        daysSinceLastPayment: 35,
        overdueAmount: 2500,
      };

    case 1:
      // Health score drop — high priority
      return {
        ...base,
        healthScore: 40,
        previousHealthScore: 72,
      };

    case 2:
      // Login drop + support spike — mixed
      return {
        ...base,
        healthScore: 55,
        loginFrequencyPerMonth: 4,
        previousLoginFrequency: 18,
        recentTicketCount: 5,
        escalatedTickets: 1,
      };

    case 3:
      // Contract expiration at risk — high priority
      return {
        ...base,
        healthScore: 42,
        daysUntilRenewal: 45,
      };

    case 4:
      // Feature stall on a growing account — medium priority
      return {
        ...base,
        healthScore: 78,
        noNewFeatureUsageDays: 38,
        isGrowingAccount: true,
      };

    case 5:
    default:
      // Healthy account — no alerts expected
      return {
        ...base,
        healthScore: 88,
      };
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const LoadingSkeleton: FC = () => (
  <div aria-busy="true" aria-label="Evaluating predictive intelligence" className="space-y-3">
    {[1, 2].map((n) => (
      <div
        key={n}
        className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-20 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * PredictiveIntelligencePanel
 *
 * Client widget that evaluates a customer's alert conditions and enriches
 * the results with optional market intelligence context.
 *
 * On mount (and whenever customerId changes), the panel generates a mock
 * CustomerSnapshot, runs the alert engine, optionally fetches market data
 * for the company, and calls synthesizeInsights to produce ranked
 * PredictiveInsight objects.
 *
 * UI states:
 *   1. Loading  — animated skeleton during initial evaluation
 *   2. Error    — red alert with a Retry button
 *   3. Empty    — reassuring "no active alerts" message
 *   4. Data     — InsightCard list for active insights; history toggle
 */
const PredictiveIntelligencePanelBase: FC<PredictiveIntelligencePanelProps> = ({
  customerId,
  company,
  className,
}) => {
  const [state, dispatch] = useReducer(panelReducer, initialState);
  // Track the latest evaluation request so stale market data fetches are
  // discarded if customerId changes quickly.
  const evalIdRef = useRef<number>(0);

  // ---- Data evaluation effect -----------------------------------------------

  useEffect(() => {
    if (!customerId || customerId.trim() === '') return;

    const evalId = ++evalIdRef.current;
    dispatch({ type: 'LOADING_START' });

    async function evaluate(): Promise<void> {
      try {
        const snapshot = buildMockSnapshot(customerId);
        const newAlerts = alertEngine({ snapshot, existingAlerts: [] });

        let marketData: MarketIntelligenceData | null = null;

        if (company !== undefined && company.trim().length > 0) {
          try {
            const res = await fetch(
              `/api/market-intelligence/${encodeURIComponent(company.trim())}`
            );
            if (res.ok) {
              marketData = (await res.json()) as MarketIntelligenceData;
            }
            // Non-OK responses: continue without market data rather than
            // failing the whole panel.
          } catch {
            // Network error: degrade gracefully, insights remain valid.
          }
        }

        if (evalId !== evalIdRef.current) return; // stale — discard

        const insights = synthesizeInsights(
          newAlerts,
          marketData,
          snapshot.healthScore
        );

        dispatch({ type: 'LOADING_SUCCESS', insights });
      } catch (err: unknown) {
        if (evalId !== evalIdRef.current) return;
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        dispatch({ type: 'LOADING_ERROR', message });
      }
    }

    void evaluate();
  }, [customerId, company]);

  // ---- Derived view data ----------------------------------------------------

  const activeInsights = state.insights.filter((i) => !i.alert.dismissed);
  const resolvedInsights = state.insights.filter((i) => i.alert.dismissed);

  // ---- Render ---------------------------------------------------------------

  return (
    <div
      aria-label="Predictive Intelligence panel"
      className={[
        'bg-white rounded-lg shadow p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Widget heading */}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Predictive Intelligence
      </h2>

      {/* ---- Loading state ---- */}
      {state.isLoading && <LoadingSkeleton />}

      {/* ---- Error state ---- */}
      {!state.isLoading && state.error !== null && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Unable to evaluate insights</p>
          <p className="mt-1">{state.error}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'LOADING_START' })}
            className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!state.isLoading && state.error === null && activeInsights.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            No active alerts — all customers are on track
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Predictive insights will appear here when conditions require CSM attention.
          </p>
        </div>
      )}

      {/* ---- Active insights list ---- */}
      {!state.isLoading && state.error === null && activeInsights.length > 0 && (
        <ul className="space-y-3" aria-label="Active predictive insights">
          {activeInsights.map((insight) => (
            <li key={insight.alert.id}>
              <InsightCard
                insight={insight}
                onDismiss={(alertId) => dispatch({ type: 'DISMISS', alertId })}
                onAction={(alertId) => dispatch({ type: 'ACTION', alertId })}
                onSnooze={(alertId) => dispatch({ type: 'SNOOZE', alertId })}
              />
            </li>
          ))}
        </ul>
      )}

      {/* ---- History toggle ---- */}
      {!state.isLoading && state.error === null && (
        <div className="mt-5">
          <button
            type="button"
            aria-expanded={state.showHistory}
            aria-controls="insight-history"
            onClick={() => dispatch({ type: 'TOGGLE_HISTORY' })}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
          >
            {state.showHistory
              ? 'Hide history'
              : `View history${resolvedInsights.length > 0 ? ` (${resolvedInsights.length})` : ''}`}
          </button>

          {state.showHistory && (
            <div id="insight-history" className="mt-3">
              <AlertHistory insights={resolvedInsights} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PredictiveIntelligencePanelBase.displayName = 'PredictiveIntelligencePanel';

export const PredictiveIntelligencePanel = React.memo(PredictiveIntelligencePanelBase);

export default PredictiveIntelligencePanel;
