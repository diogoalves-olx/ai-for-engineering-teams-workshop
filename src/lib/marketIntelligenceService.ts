// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketHeadline {
  title: string;
  source: string;
  publishedAt: string; // ISO 8601
  url?: string;
}

export interface MarketSentiment {
  score: number;      // -1.0 to 1.0
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0.0 to 1.0
}

export interface MarketIntelligenceData {
  company: string;
  sentiment: MarketSentiment;
  articleCount: number;
  headlines: MarketHeadline[];
  lastUpdated: string; // ISO 8601
}

export class MarketIntelligenceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MarketIntelligenceError';
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: MarketIntelligenceData;
  cachedAt: number; // Unix ms
}

// ---------------------------------------------------------------------------
// Deterministic hash helper
// ---------------------------------------------------------------------------

/**
 * Produces a stable 32-bit integer from a string using a simple djb2-style
 * hash. "Stable" here means the same input always produces the same output
 * within a single JS runtime; we only need this for mock data variation, not
 * cryptographic strength.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // Bitwise ops intentionally kept in 32-bit signed integer range.
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash |= 0; // coerce to int32
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------

const HEADLINE_TEMPLATES: ReadonlyArray<(company: string) => { title: string; source: string }> = [
  (c) => ({ title: `${c} Reports Strong Q4 Earnings, Beating Analyst Expectations`, source: 'Financial News Today' }),
  (c) => ({ title: `${c} Announces New Strategic Partnership to Drive Innovation`, source: 'Tech Business Weekly' }),
  (c) => ({ title: `Market Analysis: ${c} Shows Positive Momentum in Latest Quarter`, source: 'Investment Daily' }),
  (c) => ({ title: `${c} Expands Global Operations With New Regional Headquarters`, source: 'Business Wire' }),
  (c) => ({ title: `Investors Bullish on ${c} Following Product Roadmap Reveal`, source: 'MarketWatch' }),
  (c) => ({ title: `${c} Named Industry Leader in Annual Competitive Analysis`, source: 'Gartner Insights' }),
  (c) => ({ title: `${c} Faces Headwinds as Sector Slowdown Weighs on Outlook`, source: 'Reuters' }),
  (c) => ({ title: `Analysts Revise ${c} Price Target Amid Macro Uncertainty`, source: 'Bloomberg' }),
  (c) => ({ title: `${c} Achieves Record Customer Growth for Third Consecutive Quarter`, source: 'Forbes' }),
  (c) => ({ title: `Supply Chain Challenges Continue to Impact ${c} Operations`, source: 'Wall Street Journal' }),
];

const POSITIVE_KEYWORDS = [
  'strong', 'beat', 'growth', 'record', 'bullish', 'leader', 'positive',
  'momentum', 'expansion', 'achievement',
];

const NEGATIVE_KEYWORDS = [
  'headwinds', 'slowdown', 'uncertainty', 'challenges', 'impact', 'revise',
  'concern', 'risk', 'decline', 'struggle',
];

function scoreTitle(title: string): number {
  const lower = title.toLowerCase();
  let score = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) score += 1;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) score -= 1;
  }
  return score;
}

/**
 * Generates deterministic mock market data for the given company name.
 * All randomness is seeded by the company name hash so repeated calls with
 * the same company return consistent content.
 */
function generateMockData(company: string): MarketIntelligenceData {
  const hash = hashString(company.toLowerCase());

  // Select 3 headlines deterministically from the template pool.
  const selected: Array<{ title: string; source: string }> = [];
  const poolSize = HEADLINE_TEMPLATES.length;
  for (let i = 0; i < 3; i++) {
    const idx = (hash + i * 7) % poolSize;
    selected.push(HEADLINE_TEMPLATES[idx](company));
  }

  // Assign stable publishedAt timestamps spread over the last 5 days.
  const now = Date.now();
  const headlines: MarketHeadline[] = selected.map((h, i) => {
    // Use hash + index to produce a deterministic offset in the 0–5 day range.
    const offsetMs = ((hash + i * 13) % (5 * 24 * 60)) * 60 * 1000;
    return {
      title: h.title,
      source: h.source,
      publishedAt: new Date(now - offsetMs).toISOString(),
    };
  });

  // Derive sentiment from the aggregated title scores.
  const totalWordScore = headlines.reduce((acc, h) => acc + scoreTitle(h.title), 0);
  const normalised = Math.max(-1, Math.min(1, totalWordScore / 5));

  // Add a small hash-derived nudge so companies with identical scoring still
  // differ slightly (-0.1 to +0.1 nudge based on hash).
  const nudge = ((hash % 21) - 10) / 100;
  const finalScore = Math.max(-1, Math.min(1, normalised + nudge));

  let label: MarketSentiment['label'];
  let confidence: number;

  if (finalScore > 0.1) {
    label = 'positive';
    confidence = Math.min(0.95, 0.5 + Math.abs(finalScore) * 0.45);
  } else if (finalScore < -0.1) {
    label = 'negative';
    confidence = Math.min(0.95, 0.5 + Math.abs(finalScore) * 0.45);
  } else {
    label = 'neutral';
    confidence = Math.max(0.40, 0.75 - Math.abs(finalScore) * 0.5);
  }

  // Round confidence to two decimal places to avoid floating-point noise.
  confidence = Math.round(confidence * 100) / 100;

  return {
    company,
    sentiment: {
      score: Math.round(finalScore * 100) / 100,
      label,
      confidence,
    },
    articleCount: headlines.length,
    headlines,
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * MarketIntelligenceService
 *
 * Provides market sentiment and headline data for a given company.
 * Results are cached in-memory for 10 minutes. Data generation is
 * deterministic (hash-seeded) so no external API calls are required.
 */
export class MarketIntelligenceService {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Returns market intelligence data for the given company name.
   *
   * @throws {MarketIntelligenceError} with code 'INVALID_INPUT' when the
   *   sanitised company name is empty.
   */
  async getMarketData(company: string): Promise<MarketIntelligenceData> {
    const sanitised = this.sanitise(company);
    if (sanitised.length === 0) {
      throw new MarketIntelligenceError(
        'Company name must contain at least one alphanumeric character.',
        'INVALID_INPUT',
      );
    }

    const cacheKey = sanitised.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    // Simulate network latency: 200–500 ms.
    const delay = Math.random() * 300 + 200;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));

    const data = generateMockData(sanitised);

    this.cache.set(cacheKey, { data, cachedAt: Date.now() });

    return data;
  }

  /**
   * Strips characters that are not alphanumeric, spaces, hyphens, or periods.
   * Truncates to 100 characters.
   */
  private sanitise(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9 \-.]/g, '')
      .trim()
      .slice(0, 100);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const marketIntelligenceService = new MarketIntelligenceService();
