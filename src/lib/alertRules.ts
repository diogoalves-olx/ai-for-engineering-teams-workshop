/**
 * alertRules.ts
 *
 * Configurable threshold constants for the alert rules engine.
 * Centralises all tunable values so changes propagate consistently across
 * alertEngine, predictiveIntelligence, and any future rule evaluators.
 *
 * No React imports — safe to use in Server Components, API routes, and tests.
 */

// ---------------------------------------------------------------------------
// Alert trigger thresholds
// ---------------------------------------------------------------------------

/**
 * Numeric thresholds used by the alert rules engine when deciding whether a
 * given CustomerSnapshot condition should fire an alert.
 *
 * All values are inclusive-exclusive unless otherwise noted in the field JSDoc.
 */
export const ALERT_THRESHOLDS = {
  /**
   * Number of calendar days since the last successful payment above which
   * the `payment_overdue` rule triggers.  Strictly greater-than comparison.
   */
  paymentOverdueDays: 30,

  /**
   * Minimum point drop in overall health score (previous − current) required
   * to trigger the `health_drop` rule.  Strictly greater-than comparison.
   */
  healthScoreDrop: 20,

  /**
   * Fractional threshold for login frequency decline.  When current
   * `loginFrequencyPerMonth` is less than `previousLoginFrequency` multiplied
   * by this value the `login_drop` rule triggers.
   * 0.5 means a >50 % drop is required.
   */
  loginDropPercent: 0.5,

  /**
   * Days until contract renewal below which the `contract_expiration` rule
   * is eligible to fire (combined with the health score threshold).
   * Strictly less-than comparison.
   */
  contractExpiryDays: 90,

  /**
   * Maximum overall health score at which the `contract_expiration` rule
   * triggers when `contractExpiryDays` is also met.
   * Strictly less-than comparison.
   */
  contractExpiryHealthScore: 50,

  /**
   * Number of recent support tickets (last 7 days) above which the
   * `support_spike` rule triggers.  Strictly greater-than comparison.
   */
  supportTicketSpike: 3,

  /**
   * Days without any new feature usage above which the `feature_stall` rule
   * triggers (only for growing accounts).  Strictly greater-than comparison.
   */
  featureStallDays: 30,
} as const;

// ---------------------------------------------------------------------------
// Cooldown windows
// ---------------------------------------------------------------------------

/**
 * Minimum hours that must elapse before the same rule can re-fire for the
 * same customer.  These values are informational and used for documentation
 * and UI display; actual deduplication in alertEngine is performed by
 * checking for any undismissed alert with matching customerId + ruleType.
 */
export const COOLDOWN_HOURS = {
  /** Cooldown for HIGH priority rules (e.g. payment_overdue, health_drop). */
  high: 24,
  /** Cooldown for MEDIUM priority rules (e.g. support_spike, feature_stall). */
  medium: 72,
} as const;
