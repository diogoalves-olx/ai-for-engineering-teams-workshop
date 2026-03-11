/**
 * alerts.ts
 *
 * Pure alert rules engine for the Customer Health Monitoring system.
 * Evaluates a customer snapshot against a set of defined alert rules and
 * returns zero or more Alert objects describing conditions that require
 * CSM attention.
 *
 * No React imports — safe to use in Server Components, API routes, and tests.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A rule definition describing the type, priority, and deduplication window. */
export interface AlertRule {
  /** Unique identifier for the rule. Matches the ruleType field on Alert. */
  id: string;
  /** Human-readable rule category used for display and deduplication. */
  type: string;
  /** Urgency level; high alerts require immediate CSM action. */
  priority: 'high' | 'medium';
  /**
   * Hours before the same rule can fire again for the same customer.
   * Used conceptually for documentation; deduplication in alertEngine is
   * performed by checking for any undismissed alert with matching
   * customerId + ruleType.
   */
  cooldownHours: number;
}

/** A generated alert representing a single health risk condition for a customer. */
export interface Alert {
  /** Unique alert identifier: `${customerId}_${ruleType}_${Date.now()}`. */
  id: string;
  /** The customer this alert belongs to. */
  customerId: string;
  /** Urgency level; mirrors the triggering rule's priority. */
  priority: 'high' | 'medium';
  /** Identifies which alert rule triggered this alert. */
  ruleType: string;
  /** Human-readable description of the detected condition. */
  message: string;
  /** Concrete next step recommended for the CSM to take. */
  recommendedAction: string;
  /** ISO 8601 timestamp of when the alert was generated. */
  triggeredAt: string;
  /** Whether the CSM has dismissed this alert. Defaults to false on creation. */
  dismissed: boolean;
}

/**
 * A point-in-time snapshot of signals used to evaluate alert conditions for a
 * single customer.  All fields represent the current measurement window unless
 * a "previous" prefix is used, which indicates the prior 30-day average.
 */
export interface CustomerSnapshot {
  /** Identifier of the customer being evaluated. */
  customerId: string;
  /** Current overall health score (0–100). */
  healthScore: number;
  /**
   * Overall health score from the previous evaluation cycle.
   * When provided, enables the health_drop rule.
   */
  previousHealthScore?: number;
  /** Number of calendar days since the last successful payment was recorded. */
  daysSinceLastPayment: number;
  /** Dollar amount currently past due. Zero if the account is current. */
  overdueAmount: number;
  /** Average number of logins per calendar month in the current window. */
  loginFrequencyPerMonth: number;
  /**
   * 30-day average login frequency from the prior measurement window.
   * When provided, enables the login_drop rule.
   */
  previousLoginFrequency?: number;
  /** Count of support tickets that are currently open and unresolved. */
  openSupportTickets: number;
  /** Count of support tickets that have been escalated to a higher tier. */
  escalatedTickets: number;
  /** Number of new support tickets created in the last 7 days. */
  recentTicketCount: number;
  /** Calendar days remaining until the current contract renewal date. */
  daysUntilRenewal: number;
  /**
   * Number of days since the customer last used any new product feature.
   * A high value combined with an actively growing account signals stagnation.
   */
  noNewFeatureUsageDays: number;
  /**
   * Whether the account is considered actively growing (e.g. recent seat
   * expansion, upgrade, or high upsell potential).
   */
  isGrowingAccount: boolean;
}

/** Input bundle passed to alertEngine. */
export interface AlertEngineInput {
  /** The current snapshot of customer signals to evaluate. */
  snapshot: CustomerSnapshot;
  /**
   * Alerts that have already been generated for this customer.
   * Used to suppress duplicate alerts for active (undismissed) conditions.
   */
  existingAlerts: Alert[];
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Thrown by alertEngine when the caller-supplied input fails validation.
 * Catching this type lets callers distinguish input errors from unexpected
 * runtime failures.
 */
export class AlertEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertEngineError';
  }
}

// ---------------------------------------------------------------------------
// Rule catalogue
// ---------------------------------------------------------------------------

/**
 * Static catalogue of all alert rules.  Exported so UI layers can reference
 * rule metadata (e.g. to render priority badges) without duplicating strings.
 */
export const ALERT_RULES = {
  payment_overdue: {
    id: 'payment_overdue',
    type: 'payment_overdue',
    priority: 'high',
    cooldownHours: 24,
  },
  health_drop: {
    id: 'health_drop',
    type: 'health_drop',
    priority: 'high',
    cooldownHours: 24,
  },
  login_drop: {
    id: 'login_drop',
    type: 'login_drop',
    priority: 'high',
    cooldownHours: 48,
  },
  contract_expiration: {
    id: 'contract_expiration',
    type: 'contract_expiration',
    priority: 'high',
    cooldownHours: 72,
  },
  support_spike: {
    id: 'support_spike',
    type: 'support_spike',
    priority: 'medium',
    cooldownHours: 24,
  },
  feature_stall: {
    id: 'feature_stall',
    type: 'feature_stall',
    priority: 'medium',
    cooldownHours: 72,
  },
} satisfies Record<string, AlertRule>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when existingAlerts already contains an undismissed alert for
 * the given customerId and ruleType.  Used to prevent re-alerting on a
 * condition that has already been surfaced and not yet resolved.
 */
function isDuplicate(
  existingAlerts: Alert[],
  customerId: string,
  ruleType: string
): boolean {
  return existingAlerts.some(
    (a) => a.customerId === customerId && a.ruleType === ruleType && !a.dismissed
  );
}

/**
 * Builds an Alert object.  The `id` is constructed from customerId, ruleType,
 * and the current epoch timestamp to ensure uniqueness across invocations.
 */
function buildAlert(
  customerId: string,
  rule: AlertRule,
  message: string,
  recommendedAction: string
): Alert {
  return {
    id: `${customerId}_${rule.type}_${Date.now()}`,
    customerId,
    priority: rule.priority,
    ruleType: rule.type,
    message,
    recommendedAction,
    triggeredAt: new Date().toISOString(),
    dismissed: false,
  };
}

// ---------------------------------------------------------------------------
// Alert engine
// ---------------------------------------------------------------------------

/**
 * alertEngine
 *
 * Evaluates a CustomerSnapshot against all defined alert rules and returns an
 * array of newly generated Alert objects.  Rules that are already covered by
 * an undismissed existing alert are skipped to avoid flooding the CSM UI.
 *
 * HIGH priority rules:
 *   1. payment_overdue      — daysSinceLastPayment > 30, OR overdueAmount > 0 with daysSinceLastPayment > 0
 *   2. health_drop          — previousHealthScore known AND score dropped > 20 pts since last evaluation
 *   3. login_drop           — previousLoginFrequency known AND current logins fell > 50 % vs prior period
 *   4. contract_expiration  — renewal < 90 days away AND current health score < 50
 *
 * MEDIUM priority rules:
 *   5. support_spike        — recentTicketCount > 3 OR any escalated tickets exist
 *   6. feature_stall        — no new feature used in > 30 days AND account is flagged as growing
 *
 * @param input The snapshot and existing alert context to evaluate.
 * @returns     An array of newly triggered Alert objects (may be empty).
 * @throws      {AlertEngineError} if the snapshot is missing required fields or
 *              contains values that cannot be logically evaluated.
 */
export function alertEngine(input: AlertEngineInput): Alert[] {
  const { snapshot, existingAlerts } = input;

  // --- Input validation ---
  if (!snapshot.customerId || snapshot.customerId.trim() === '') {
    throw new AlertEngineError('snapshot.customerId must be a non-empty string');
  }
  if (snapshot.healthScore < 0 || snapshot.healthScore > 100) {
    throw new AlertEngineError('snapshot.healthScore must be between 0 and 100');
  }
  if (snapshot.previousHealthScore !== undefined) {
    if (snapshot.previousHealthScore < 0 || snapshot.previousHealthScore > 100) {
      throw new AlertEngineError(
        'snapshot.previousHealthScore must be between 0 and 100 when provided'
      );
    }
  }
  if (snapshot.daysSinceLastPayment < 0) {
    throw new AlertEngineError('snapshot.daysSinceLastPayment must be >= 0');
  }
  if (snapshot.overdueAmount < 0) {
    throw new AlertEngineError('snapshot.overdueAmount must be >= 0');
  }
  if (snapshot.loginFrequencyPerMonth < 0) {
    throw new AlertEngineError('snapshot.loginFrequencyPerMonth must be >= 0');
  }
  if (snapshot.openSupportTickets < 0) {
    throw new AlertEngineError('snapshot.openSupportTickets must be >= 0');
  }
  if (snapshot.escalatedTickets < 0) {
    throw new AlertEngineError('snapshot.escalatedTickets must be >= 0');
  }
  if (snapshot.recentTicketCount < 0) {
    throw new AlertEngineError('snapshot.recentTicketCount must be >= 0');
  }
  if (snapshot.daysUntilRenewal < 0) {
    throw new AlertEngineError('snapshot.daysUntilRenewal must be >= 0');
  }
  if (snapshot.noNewFeatureUsageDays < 0) {
    throw new AlertEngineError('snapshot.noNewFeatureUsageDays must be >= 0');
  }

  const {
    customerId,
    healthScore,
    previousHealthScore,
    daysSinceLastPayment,
    overdueAmount,
    loginFrequencyPerMonth,
    previousLoginFrequency,
    escalatedTickets,
    recentTicketCount,
    daysUntilRenewal,
    noNewFeatureUsageDays,
    isGrowingAccount,
  } = snapshot;

  const generated: Alert[] = [];

  // -------------------------------------------------------------------------
  // Rule 1 — payment_overdue (HIGH)
  // Triggers when payment is significantly overdue by time or dollar amount.
  // -------------------------------------------------------------------------
  const paymentOverdueTriggered =
    daysSinceLastPayment > 30 ||
    (overdueAmount > 0 && daysSinceLastPayment > 0);

  if (
    paymentOverdueTriggered &&
    !isDuplicate(existingAlerts, customerId, 'payment_overdue')
  ) {
    const overdueParts: string[] = [];
    if (daysSinceLastPayment > 30) {
      overdueParts.push(`no payment recorded in ${daysSinceLastPayment} days`);
    }
    if (overdueAmount > 0) {
      overdueParts.push(`$${overdueAmount.toLocaleString()} currently overdue`);
    }
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.payment_overdue,
        `Payment issue detected: ${overdueParts.join(' and ')}.`,
        'Contact the customer\'s billing contact immediately to confirm payment status and resolve any outstanding balance before the account is flagged for suspension.'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 2 — health_drop (HIGH)
  // Triggers when the overall health score has dropped by more than 20 points
  // since the previous evaluation cycle (approximates a 7-day window).
  // -------------------------------------------------------------------------
  if (
    previousHealthScore !== undefined &&
    previousHealthScore - healthScore > 20 &&
    !isDuplicate(existingAlerts, customerId, 'health_drop')
  ) {
    const delta = previousHealthScore - healthScore;
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.health_drop,
        `Health score dropped ${delta} points (from ${previousHealthScore} to ${healthScore}) in the last 7 days.`,
        'Schedule an urgent check-in call to identify the root cause of the score decline and agree on a remediation plan with the customer.'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 3 — login_drop (HIGH)
  // Triggers when current login frequency is less than half of the prior
  // 30-day average, indicating a significant disengagement signal.
  // -------------------------------------------------------------------------
  if (
    previousLoginFrequency !== undefined &&
    loginFrequencyPerMonth < previousLoginFrequency * 0.5 &&
    !isDuplicate(existingAlerts, customerId, 'login_drop')
  ) {
    const dropPct = Math.round(
      ((previousLoginFrequency - loginFrequencyPerMonth) / previousLoginFrequency) * 100
    );
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.login_drop,
        `Login frequency dropped ${dropPct}% — from ${previousLoginFrequency} to ${loginFrequencyPerMonth} logins per month.`,
        'Reach out to understand barriers to adoption, share relevant product resources, and offer a product walkthrough to re-engage the team.'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 4 — contract_expiration (HIGH)
  // Triggers when renewal is within 90 days AND the health score is below 50,
  // combining time pressure with a risk signal that makes churn more likely.
  // -------------------------------------------------------------------------
  if (
    daysUntilRenewal < 90 &&
    healthScore < 50 &&
    !isDuplicate(existingAlerts, customerId, 'contract_expiration')
  ) {
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.contract_expiration,
        `Contract renews in ${daysUntilRenewal} days with a low health score of ${healthScore} — elevated churn risk.`,
        'Initiate renewal conversation immediately. Address outstanding health issues, present a success plan, and involve a senior CSM or AE if needed to secure the renewal.'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 5 — support_spike (MEDIUM)
  // Triggers when recent ticket volume is abnormally high or any ticket has
  // been escalated, both of which indicate unresolved customer pain.
  // -------------------------------------------------------------------------
  const supportSpikeTriggered = recentTicketCount > 3 || escalatedTickets > 0;

  if (
    supportSpikeTriggered &&
    !isDuplicate(existingAlerts, customerId, 'support_spike')
  ) {
    const supportParts: string[] = [];
    if (recentTicketCount > 3) {
      supportParts.push(`${recentTicketCount} tickets opened in the last 7 days`);
    }
    if (escalatedTickets > 0) {
      supportParts.push(
        `${escalatedTickets} escalated ticket${escalatedTickets > 1 ? 's' : ''}`
      );
    }
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.support_spike,
        `Support spike detected: ${supportParts.join(' and ')}.`,
        'Review all open and escalated tickets, coordinate with the support team to expedite resolution, and proactively update the customer on progress.'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 6 — feature_stall (MEDIUM)
  // Triggers when a growing account has not adopted any new feature in over
  // 30 days — stagnation in a growth-oriented account may signal a blocked
  // expansion or a future churn risk.
  // -------------------------------------------------------------------------
  if (
    noNewFeatureUsageDays > 30 &&
    isGrowingAccount &&
    !isDuplicate(existingAlerts, customerId, 'feature_stall')
  ) {
    generated.push(
      buildAlert(
        customerId,
        ALERT_RULES.feature_stall,
        `No new product features used in ${noNewFeatureUsageDays} days despite this being a growing account.`,
        'Schedule a feature discovery session to introduce relevant capabilities aligned with the customer\'s stated growth goals and unblock further adoption.'
      )
    );
  }

  return generated;
}
