/**
 * healthCalculator.ts
 *
 * Pure functions for computing weighted customer health scores from four
 * independent input domains: payment behaviour, product engagement, contract
 * signals, and support quality.
 *
 * No React imports — safe to use in Server Components, API routes, and tests.
 */

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

/** Payment-history signals used to score the payment factor. */
export interface PaymentInput {
  /** Number of calendar days since the last successful payment. */
  daysSinceLastPayment: number;
  /** Average number of days a payment has been delayed historically. */
  avgPaymentDelayDays: number;
  /** Dollar amount currently overdue (0 if nothing is outstanding). */
  overdueAmount: number;
}

/** Product-usage signals used to score the engagement factor. */
export interface EngagementInput {
  /** How many times the customer logs in per calendar month on average. */
  loginFrequencyPerMonth: number;
  /** Total number of distinct product features used in the scoring window. */
  featureUsageCount: number;
  /** Number of support tickets currently open (unresolved). */
  openSupportTickets: number;
}

/** Contract-related signals used to score the contract factor. */
export interface ContractInput {
  /** Calendar days remaining until the current contract renewal date. */
  daysUntilRenewal: number;
  /** Total contract value in dollars for the current term. */
  contractValue: number;
  /** Whether the customer has upgraded their plan in the recent billing period. */
  recentUpgrade: boolean;
}

/** Support-quality signals used to score the support factor. */
export interface SupportInput {
  /** Mean hours taken to resolve a support ticket. */
  avgResolutionTimeHours: number;
  /** Customer satisfaction score on a 0–5 scale. */
  satisfactionScore: number;
  /** Number of tickets that have been escalated to a higher support tier. */
  escalationCount: number;
}

// ---------------------------------------------------------------------------
// Output interfaces
// ---------------------------------------------------------------------------

/** Per-factor numeric breakdown, each value in the 0–100 range. */
export interface FactorBreakdown {
  /** Payment-history factor score (0–100). Weight: 40 %. */
  payment: number;
  /** Product-engagement factor score (0–100). Weight: 30 %. */
  engagement: number;
  /** Contract-signals factor score (0–100). Weight: 20 %. */
  contract: number;
  /** Support-quality factor score (0–100). Weight: 10 %. */
  support: number;
}

/** Composite health score result returned by calculateHealthScore. */
export interface HealthScoreResult {
  /** Weighted composite score, 0–100, rounded to nearest integer. */
  overallScore: number;
  /**
   * Risk tier derived from overallScore:
   *   71–100 → healthy
   *   31–70  → warning
   *   0–30   → critical
   */
  riskLevel: 'healthy' | 'warning' | 'critical';
  /** Individual factor scores that contributed to the overall score. */
  breakdown: FactorBreakdown;
  /**
   * Score trajectory compared to the previous period:
   *   +5 or more  → improving
   *   -5 or less  → declining
   *   otherwise   → stable
   */
  trend: 'improving' | 'stable' | 'declining';
  /** The previous-period score, if one was provided. */
  previousScore?: number;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Thrown by calculator functions when caller-supplied inputs fail validation.
 * Catching this error type lets callers distinguish input errors from
 * unexpected runtime failures.
 */
export class HealthCalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthCalculatorError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Clamps a numeric value to the inclusive [min, max] range and rounds to the
 * nearest integer.  Used to keep every factor score within 0–100.
 */
function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

// ---------------------------------------------------------------------------
// Factor-scoring functions
// ---------------------------------------------------------------------------

/**
 * scorePayment
 *
 * Evaluates the customer's payment behaviour and returns a score from 0–100.
 * Payment history carries a 40 % weight in the composite score.
 *
 * Scoring logic:
 * - Start at 100.
 * - If daysSinceLastPayment is 0 and overdueAmount is 0, return 100 immediately
 *   (perfect payment record with a very recent payment).
 * - Deduct points for each day elapsed since last payment (stale payment signal).
 * - Deduct points for average delay days (chronic lateness pattern).
 * - Deduct points proportional to the overdue dollar amount (financial risk).
 *
 * @throws {HealthCalculatorError} if any numeric input is negative.
 */
export function scorePayment(input: PaymentInput): number {
  const { daysSinceLastPayment, avgPaymentDelayDays, overdueAmount } = input;

  if (daysSinceLastPayment < 0) {
    throw new HealthCalculatorError(
      'daysSinceLastPayment must be >= 0'
    );
  }
  if (avgPaymentDelayDays < 0) {
    throw new HealthCalculatorError(
      'avgPaymentDelayDays must be >= 0'
    );
  }
  if (overdueAmount < 0) {
    throw new HealthCalculatorError('overdueAmount must be >= 0');
  }

  // Perfect edge-case: paid today with nothing outstanding.
  if (daysSinceLastPayment === 0 && overdueAmount === 0) {
    return 100;
  }

  let score = 100;

  // Penalise for payment staleness: -1 point per day, up to -30 points.
  // Payments older than 30 days are increasingly concerning.
  score -= Math.min(30, daysSinceLastPayment);

  // Penalise for chronic payment delay: -2 points per average delay day, up to -30 points.
  score -= Math.min(30, avgPaymentDelayDays * 2);

  // Penalise for outstanding overdue balance.
  // Scale: every $500 overdue costs 1 point, capped at -40 points.
  if (overdueAmount > 0) {
    score -= Math.min(40, Math.floor(overdueAmount / 500));
  }

  return clamp(score);
}

/**
 * scoreEngagement
 *
 * Evaluates how actively the customer is using the product and returns a
 * score from 0–100. Engagement carries a 30 % weight in the composite score.
 *
 * Scoring logic:
 * - Base score starts at 50.
 * - Login frequency > 20/month signals heavy usage; scale up to +30 points.
 * - Feature breadth > 10 distinct features used signals sticky adoption; up to +30 points.
 * - Each open (unresolved) support ticket deducts 5 points — open tickets
 *   indicate friction or blocked work.
 *
 * @throws {HealthCalculatorError} if any numeric input is negative.
 */
export function scoreEngagement(input: EngagementInput): number {
  const { loginFrequencyPerMonth, featureUsageCount, openSupportTickets } = input;

  if (loginFrequencyPerMonth < 0) {
    throw new HealthCalculatorError(
      'loginFrequencyPerMonth must be >= 0'
    );
  }
  if (featureUsageCount < 0) {
    throw new HealthCalculatorError('featureUsageCount must be >= 0');
  }
  if (openSupportTickets < 0) {
    throw new HealthCalculatorError('openSupportTickets must be >= 0');
  }

  let score = 50;

  // Login frequency: full +30 points at 20+ logins/month, linear below that.
  score += Math.min(30, (loginFrequencyPerMonth / 20) * 30);

  // Feature breadth: full +20 points at 10+ features used, linear below that.
  score += Math.min(20, (featureUsageCount / 10) * 20);

  // Open tickets create friction — each one costs 5 points.
  score -= openSupportTickets * 5;

  return clamp(score);
}

/**
 * scoreContract
 *
 * Evaluates contract-health signals and returns a score from 0–100.
 * Contract signals carry a 20 % weight in the composite score.
 *
 * Scoring logic:
 * - Start at 70 (neutral-positive baseline; having a contract at all is good).
 * - Renewal imminence risk: < 30 days to renewal is a churn risk signal.
 *   The closer to expiry, the steeper the deduction (up to -30 points at day 0).
 * - Contract value: large contracts correlate with committed customers; +15 points
 *   for contracts >= $50 000.
 * - Recent upgrade: customer expanded their plan, a strong retention signal; +15 points.
 *
 * @throws {HealthCalculatorError} if daysUntilRenewal or contractValue is negative.
 */
export function scoreContract(input: ContractInput): number {
  const { daysUntilRenewal, contractValue, recentUpgrade } = input;

  if (daysUntilRenewal < 0) {
    throw new HealthCalculatorError('daysUntilRenewal must be >= 0');
  }
  if (contractValue < 0) {
    throw new HealthCalculatorError('contractValue must be >= 0');
  }

  let score = 70;

  // Renewal risk: ramp the penalty from 0 (at 30+ days) to -30 (at 0 days).
  if (daysUntilRenewal < 30) {
    const renewalRiskPenalty = Math.round(((30 - daysUntilRenewal) / 30) * 30);
    score -= renewalRiskPenalty;
  }

  // High-value contract bonus: enterprises with large ARR are more invested.
  if (contractValue >= 50000) {
    score += 15;
  }

  // Recent upgrade bonus: expanding customers rarely churn.
  if (recentUpgrade) {
    score += 15;
  }

  return clamp(score);
}

/**
 * scoreSupport
 *
 * Evaluates the quality of the support experience and returns a score from
 * 0–100. Support quality carries a 10 % weight in the composite score.
 *
 * Scoring logic:
 * - Start at 60 (neutral baseline).
 * - Fast resolution (< 24 h average): +20 points. Slow resolution (> 72 h): -20 points.
 * - High satisfaction (> 4 / 5): +20 points.
 * - Each escalation deducts 15 points — escalations signal unresolved pain.
 *
 * @throws {HealthCalculatorError} if avgResolutionTimeHours is negative, or if
 *   satisfactionScore is outside the 0–5 range.
 */
export function scoreSupport(input: SupportInput): number {
  const { avgResolutionTimeHours, satisfactionScore, escalationCount } = input;

  if (avgResolutionTimeHours < 0) {
    throw new HealthCalculatorError(
      'avgResolutionTimeHours must be >= 0'
    );
  }
  if (satisfactionScore < 0 || satisfactionScore > 5) {
    throw new HealthCalculatorError(
      'satisfactionScore must be between 0 and 5'
    );
  }
  if (escalationCount < 0) {
    throw new HealthCalculatorError('escalationCount must be >= 0');
  }

  let score = 60;

  // Resolution speed: sub-24h is excellent; over 72h degrades the experience.
  if (avgResolutionTimeHours < 24) {
    score += 20;
  } else if (avgResolutionTimeHours > 72) {
    score -= 20;
  }

  // Customer satisfaction: above 4/5 is a strong positive signal.
  if (satisfactionScore > 4) {
    score += 20;
  }

  // Escalations indicate the standard support process failed the customer.
  score -= escalationCount * 15;

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Composite calculation
// ---------------------------------------------------------------------------

/**
 * calculateHealthScore
 *
 * Computes a weighted composite health score from the four factor domains and
 * derives the risk tier and trend direction.
 *
 * Weights:
 *   Payment    40 %
 *   Engagement 30 %
 *   Contract   20 %
 *   Support    10 %
 *
 * Risk tiers (align with HealthIndicator thresholds):
 *   71–100 → healthy
 *   31–70  → warning
 *   0–30   → critical
 *
 * Trend (requires a previousScore to be meaningful):
 *   overallScore >= previousScore + 5 → improving
 *   overallScore <= previousScore - 5 → declining
 *   otherwise                         → stable
 *
 * All inputs are validated by the individual factor-scoring functions, which
 * throw HealthCalculatorError on invalid values.
 *
 * @param payment    Payment-history inputs.
 * @param engagement Product-engagement inputs.
 * @param contract   Contract-signal inputs.
 * @param support    Support-quality inputs.
 * @param previousScore  Optional prior-period overall score for trend comparison.
 * @returns {HealthScoreResult} The composite result with breakdown and trend.
 * @throws {HealthCalculatorError} if any individual factor input is invalid.
 */
export function calculateHealthScore(
  payment: PaymentInput,
  engagement: EngagementInput,
  contract: ContractInput,
  support: SupportInput,
  previousScore?: number
): HealthScoreResult {
  // Validate previousScore separately — the factor functions cover their own domains.
  if (previousScore !== undefined && (previousScore < 0 || previousScore > 100)) {
    throw new HealthCalculatorError(
      'previousScore must be between 0 and 100'
    );
  }

  const paymentScore = scorePayment(payment);
  const engagementScore = scoreEngagement(engagement);
  const contractScore = scoreContract(contract);
  const supportScore = scoreSupport(support);

  const overallScore = clamp(
    paymentScore * 0.4 +
      engagementScore * 0.3 +
      contractScore * 0.2 +
      supportScore * 0.1
  );

  // Derive risk tier — thresholds intentionally match HealthIndicator's getTier().
  let riskLevel: HealthScoreResult['riskLevel'];
  if (overallScore >= 71) {
    riskLevel = 'healthy';
  } else if (overallScore >= 31) {
    riskLevel = 'warning';
  } else {
    riskLevel = 'critical';
  }

  // Derive trend from comparison with previous period.
  let trend: HealthScoreResult['trend'] = 'stable';
  if (previousScore !== undefined) {
    if (overallScore >= previousScore + 5) {
      trend = 'improving';
    } else if (overallScore <= previousScore - 5) {
      trend = 'declining';
    }
  }

  return {
    overallScore,
    riskLevel,
    breakdown: {
      payment: paymentScore,
      engagement: engagementScore,
      contract: contractScore,
      support: supportScore,
    },
    trend,
    ...(previousScore !== undefined ? { previousScore } : {}),
  };
}
