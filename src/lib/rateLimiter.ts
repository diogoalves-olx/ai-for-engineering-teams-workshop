/**
 * rateLimiter.ts
 *
 * Client-side rate limiter backed by sessionStorage. Each call attempt is
 * recorded as a timestamp; entries older than 60 seconds are pruned before
 * every check so the window is always a rolling 60-second period.
 *
 * This module must only be imported in client-side code (browser environment)
 * because it relies on the sessionStorage Web API.
 *
 * No React imports — safe to call from event handlers, custom hooks, or
 * utility modules that run exclusively in the browser.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Storage key prefix to namespace rate-limit entries. */
const STORAGE_PREFIX = 'rl_';

/** Rolling window size in milliseconds. */
const WINDOW_MS = 60_000;

/**
 * Reads the array of call timestamps for `action` from sessionStorage.
 * Returns an empty array if nothing is stored or the value is malformed.
 */
function readTimestamps(action: string): number[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + action);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only numeric entries to guard against corrupted storage values.
    return parsed.filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

/**
 * Persists the array of timestamps for `action` to sessionStorage.
 * Silently ignores write errors (e.g. private-browsing quota exhaustion).
 */
function writeTimestamps(action: string, timestamps: number[]): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + action, JSON.stringify(timestamps));
  } catch {
    // Storage unavailable — fail open so the action is not blocked.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * checkRateLimit
 *
 * Determines whether the caller is allowed to perform `action` given the
 * `maxPerMinute` budget.
 *
 * The function:
 *   1. Reads existing timestamps for this action from sessionStorage.
 *   2. Prunes entries older than 60 seconds (rolling window).
 *   3. If the remaining count is below `maxPerMinute`, records the current
 *      timestamp, persists the updated list, and returns `true`.
 *   4. Otherwise returns `false` — the caller should show a rate-limit error.
 *
 * @param action        Identifier for the rate-limited operation (e.g. 'export').
 * @param maxPerMinute  Maximum number of calls allowed within any 60-second window.
 * @returns `true` if the action is within the allowed rate; `false` if exceeded.
 */
export function checkRateLimit(action: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Load and prune stale timestamps.
  const recent = readTimestamps(action).filter((ts) => ts > cutoff);

  if (recent.length >= maxPerMinute) {
    // Persist pruned list (removes stale entries) but do not add new timestamp.
    writeTimestamps(action, recent);
    return false;
  }

  // Under the limit — record this attempt and allow the action.
  recent.push(now);
  writeTimestamps(action, recent);
  return true;
}
