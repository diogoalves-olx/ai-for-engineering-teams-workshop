/**
 * predictiveIntelligence.ts
 *
 * Pure functions for synthesising predictive insights from alert data and
 * market intelligence context.  No React imports — safe to use in Server
 * Components, API routes, and tests.
 *
 * The primary export is `synthesizeInsights`, which combines a list of Alert
 * objects with optional MarketIntelligenceData to produce a ranked array of
 * PredictiveInsight objects ready for display in the dashboard.
 */

import type { Alert } from './alerts';
import type {
  MarketIntelligenceData,
  MarketHeadline,
} from './marketIntelligenceService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single predictive insight that wraps an Alert with additional context
 * derived from market intelligence and confidence scoring.
 */
export interface PredictiveInsight {
  /** The underlying alert that triggered this insight. */
  alert: Alert;

  /**
   * Market intelligence context enriching the insight.
   * null when no market data was available for the customer's company.
   */
  marketContext: {
    /** Derived sentiment label from market data. */
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    /** Human-readable summary of market conditions for display. */
    summary: string;
    /** Up to two most recent headlines for supplemental context. */
    relevantHeadlines: MarketHeadline[];
  } | null;

  /**
   * Confidence level for this insight, factoring in alert priority, market
   * sentiment, and customer health score.
   */
  confidence: 'low' | 'medium' | 'high';

  /**
   * Concrete next step recommended for the CSM, passed through directly from
   * the underlying alert's recommendedAction field.
   */
  recommendedAction: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Thrown by predictiveIntelligence functions when input cannot be processed.
 * Allows callers to distinguish domain-level errors from unexpected failures.
 */
export class PredictiveIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PredictiveIntelligenceError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Confidence sort order — lower number means higher precedence when sorting.
 */
const CONFIDENCE_ORDER: Record<PredictiveInsight['confidence'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Calculates the confidence level for a single alert given optional market
 * data and the current customer health score.
 *
 * Logic:
 *   1. Baseline from alert priority: 'high' → 'high', 'medium' → 'medium'.
 *   2. Upgrade to 'high' when all three conditions hold:
 *      - marketData sentiment is 'negative'
 *      - customerHealthScore is defined and < 60
 *      - alert.priority is 'medium'
 *   3. Downgrade to 'low' when:
 *      - marketData sentiment is 'positive'
 *      - customerHealthScore is defined and > 70
 */
function calculateConfidence(
  alert: Alert,
  marketData: MarketIntelligenceData | null,
  customerHealthScore: number | undefined
): PredictiveInsight['confidence'] {
  // Step 1: baseline from alert priority.
  let confidence: PredictiveInsight['confidence'] =
    alert.priority === 'high' ? 'high' : 'medium';

  // Step 2: upgrade medium → high when negative market + poor health compound risk.
  if (
    confidence === 'medium' &&
    marketData !== null &&
    marketData !== undefined &&
    marketData.sentiment.label === 'negative' &&
    customerHealthScore !== undefined &&
    customerHealthScore < 60
  ) {
    confidence = 'high';
  }

  // Step 3: downgrade to low when positive market conditions + healthy score
  // reduce the likelihood of the concern materialising.
  if (
    marketData !== null &&
    marketData !== undefined &&
    marketData.sentiment.label === 'positive' &&
    customerHealthScore !== undefined &&
    customerHealthScore > 70
  ) {
    confidence = 'low';
  }

  return confidence;
}

// ---------------------------------------------------------------------------
// Primary export
// ---------------------------------------------------------------------------

/**
 * synthesizeInsights
 *
 * Pure, deterministic function — identical inputs always produce identical
 * outputs.  Combines an array of Alert objects with optional market
 * intelligence data to produce a sorted array of PredictiveInsight objects.
 *
 * @param alerts              Active alerts to enrich with predictive context.
 * @param marketData          Market intelligence for the customer's company, or
 *                            null when unavailable.
 * @param customerHealthScore Current overall health score (0–100), used to
 *                            adjust confidence levels.
 * @returns                   PredictiveInsight array sorted high → medium → low
 *                            confidence.
 */
export function synthesizeInsights(
  alerts: Alert[],
  marketData: MarketIntelligenceData | null,
  customerHealthScore?: number
): PredictiveInsight[] {
  const insights: PredictiveInsight[] = alerts.map((alert) => {
    const confidence = calculateConfidence(alert, marketData, customerHealthScore);

    // Build market context block when data is available.
    let marketContext: PredictiveInsight['marketContext'] = null;

    if (marketData !== null && marketData !== undefined) {
      const confidencePct = Math.round(marketData.sentiment.confidence * 100);
      const summary = `Market sentiment for ${marketData.company} is ${marketData.sentiment.label} with ${confidencePct}% confidence`;

      marketContext = {
        sentiment: marketData.sentiment.label,
        summary,
        relevantHeadlines: marketData.headlines.slice(0, 2),
      };
    }

    return {
      alert,
      marketContext,
      confidence,
      recommendedAction: alert.recommendedAction,
    };
  });

  // Sort: high confidence first, then medium, then low.
  return insights.sort(
    (a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]
  );
}
