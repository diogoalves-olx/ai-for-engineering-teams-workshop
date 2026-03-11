'use client';

import { useState, useEffect, useRef, type FC, type FormEvent, type KeyboardEvent } from 'react';
import type { MarketIntelligenceData, MarketSentiment } from '../lib/marketIntelligenceService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketIntelligenceWidgetProps {
  /** Pre-populates and auto-fetches market data for this company on mount. */
  company?: string;
  /** Additional Tailwind classes forwarded to the root container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const SENTIMENT_STYLE = {
  positive: 'bg-green-100 text-green-800 border border-green-200',
  neutral:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
  negative: 'bg-red-100 text-red-800 border border-red-200',
} satisfies Record<MarketSentiment['label'], string>;

const SENTIMENT_LABEL = {
  positive: 'Positive',
  neutral:  'Neutral',
  negative: 'Negative',
} satisfies Record<MarketSentiment['label'], string>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO 8601 string as a short locale date (e.g. "Mar 11, 2026").
 * Falls back to the raw string if parsing fails.
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Converts a 0–1 confidence float to an integer percentage string. */
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated skeleton replacing the content area while data is loading. */
const LoadingSkeleton: FC = () => (
  <div aria-busy="true" aria-label="Loading market intelligence data" className="space-y-4">
    {/* Sentiment skeleton */}
    <div className="space-y-2">
      <div className="h-7 w-24 animate-pulse rounded-full bg-gray-200" />
      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
    </div>

    {/* Divider */}
    <div className="border-t border-gray-100" />

    {/* Headlines skeleton */}
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MarketIntelligenceWidget
 *
 * A self-contained client widget that fetches and displays market sentiment
 * and news headlines for a given company.
 *
 * UI states:
 *   1. Empty    — no company prop and blank input field
 *   2. Loading  — animated skeleton while data is in-flight
 *   3. Error    — red alert with a Retry button
 *   4. Data     — sentiment badge, confidence, article count, up to 3 headlines
 *
 * When the `company` prop changes the widget re-fetches without unmounting.
 * The user can also type a company name into the input and submit it manually.
 */
export const MarketIntelligenceWidget: FC<MarketIntelligenceWidgetProps> = ({
  company: companyProp,
  className,
}) => {
  const [inputValue, setInputValue] = useState<string>(companyProp ?? '');
  const [activeCompany, setActiveCompany] = useState<string>(companyProp ?? '');
  const [data, setData] = useState<MarketIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest fetch so stale responses from previous company names are
  // discarded if the prop changes quickly.
  const fetchIdRef = useRef<number>(0);

  // Sync input and activeCompany when the prop changes from the parent.
  useEffect(() => {
    if (companyProp !== undefined) {
      setInputValue(companyProp);
      setActiveCompany(companyProp);
    }
  }, [companyProp]);

  // Fetch whenever activeCompany changes (and is non-empty).
  useEffect(() => {
    const company = activeCompany.trim();
    if (company.length === 0) return;

    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/market-intelligence/${encodeURIComponent(company)}`)
      .then(async (res) => {
        if (fetchId !== fetchIdRef.current) return; // stale — discard
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `Request failed with status ${res.status}`);
        }
        return res.json() as Promise<MarketIntelligenceData>;
      })
      .then((result) => {
        if (fetchId !== fetchIdRef.current) return; // stale — discard
        if (result !== undefined) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (fetchId !== fetchIdRef.current) return; // stale — discard
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [activeCompany]);

  // ---- Event handlers -------------------------------------------------------

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || isLoading) return;
    setActiveCompany(trimmed);
  }

  function handleRetry(): void {
    if (activeCompany.trim().length === 0) return;
    // Re-trigger the effect by resetting and then re-setting the activeCompany.
    // We force a new fetch by incrementing through a local state toggle.
    setError(null);
    setData(null);
    // Re-use the same activeCompany value; we must bump something to re-run the
    // effect. We do so by briefly clearing and restoring via a functional update
    // pattern — simplest: just call setActiveCompany with the same value after
    // clearing data, which won't re-trigger the effect since React bails out of
    // state updates with the same value.
    // Instead, we directly increment fetchId and kick off a new fetch inline.
    const company = activeCompany.trim();
    if (company.length === 0) return;

    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);

    fetch(`/api/market-intelligence/${encodeURIComponent(company)}`)
      .then(async (res) => {
        if (fetchId !== fetchIdRef.current) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `Request failed with status ${res.status}`);
        }
        return res.json() as Promise<MarketIntelligenceData>;
      })
      .then((result) => {
        if (fetchId !== fetchIdRef.current) return;
        if (result !== undefined) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (fetchId !== fetchIdRef.current) return;
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      });
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    // Allow Enter to submit (the form's onSubmit already handles this, but
    // guard in case the input is outside a form context in future).
    if (e.key === 'Escape') {
      setInputValue('');
    }
  }

  // ---- Derived flags --------------------------------------------------------

  const showEmpty = !isLoading && error === null && data === null && activeCompany.trim().length === 0;
  const showLoading = isLoading;
  const showError = !isLoading && error !== null;
  const showData = !isLoading && error === null && data !== null;

  // ---- Render ---------------------------------------------------------------

  return (
    <div
      className={[
        'bg-white rounded-lg shadow p-6 w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Market Intelligence widget"
    >
      {/* Widget heading */}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Market Intelligence
      </h2>

      {/* Company input form */}
      <form
        onSubmit={handleSubmit}
        className="mb-5 flex gap-2"
        aria-label="Analyze company market intelligence"
      >
        <label htmlFor="market-intel-company-input" className="sr-only">
          Company name
        </label>
        <input
          id="market-intel-company-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter company name…"
          autoComplete="organization"
          disabled={isLoading}
          className={[
            'flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2',
            'text-sm text-gray-900 placeholder-gray-400',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        <button
          type="submit"
          disabled={isLoading || inputValue.trim().length === 0}
          className={[
            'shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white',
            'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:bg-blue-300',
            'transition-colors duration-150',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Analyze
        </button>
      </form>

      {/* ---- Empty state ---- */}
      {showEmpty && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            No company selected
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Enter a company name above and click Analyze to view market intelligence.
          </p>
        </div>
      )}

      {/* ---- Loading state ---- */}
      {showLoading && <LoadingSkeleton />}

      {/* ---- Error state ---- */}
      {showError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Unable to load market data</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className={[
              'mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white',
              'hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
              'transition-colors duration-150',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Retry
          </button>
        </div>
      )}

      {/* ---- Data state ---- */}
      {showData && data !== null && (
        <div className="space-y-4">
          {/* Sentiment section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {/* Sentiment badge */}
              <span
                className={[
                  'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                  SENTIMENT_STYLE[data.sentiment.label],
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`Sentiment: ${SENTIMENT_LABEL[data.sentiment.label]}`}
              >
                {SENTIMENT_LABEL[data.sentiment.label]}
              </span>

              {/* Confidence */}
              <span className="text-xs text-gray-500">
                Confidence:{' '}
                <span className="font-medium tabular-nums text-gray-700">
                  {formatConfidence(data.sentiment.confidence)}
                </span>
              </span>
            </div>

            {/* Article count and last updated */}
            <p className="text-xs text-gray-400">
              <span className="tabular-nums">{data.articleCount}</span>
              {data.articleCount === 1 ? ' article' : ' articles'} analysed
              {' · '}
              Updated {formatDate(data.lastUpdated)}
            </p>
          </div>

          {/* Headlines */}
          {data.headlines.length > 0 && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Recent Headlines
              </p>

              <ul
                className="space-y-3"
                aria-label={`Recent headlines for ${data.company}`}
              >
                {data.headlines.slice(0, 3).map((headline, index) => (
                  <li key={index} className="space-y-0.5">
                    {headline.url !== undefined ? (
                      <a
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={[
                          'block text-sm font-medium text-gray-800 line-clamp-2',
                          'hover:text-blue-600 focus:outline-none focus:text-blue-600',
                          'transition-colors duration-100',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {headline.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">
                        {headline.title}
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      <span className="text-gray-500">{headline.source}</span>
                      {' · '}
                      <time dateTime={headline.publishedAt}>
                        {formatDate(headline.publishedAt)}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

MarketIntelligenceWidget.displayName = 'MarketIntelligenceWidget';

export default MarketIntelligenceWidget;
