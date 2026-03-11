/**
 * errorReporter.ts
 *
 * Centralised error reporting utility. In development, logs full error details
 * to the console. In production, this is the integration point for a monitoring
 * service (e.g. Sentry, Datadog). For this workshop, it falls back to
 * console.error so no external network calls are made.
 *
 * No React imports — safe for Server Components, API routes, and tests.
 */

// ---------------------------------------------------------------------------
// Sensitive field scrubbing
// ---------------------------------------------------------------------------

/** Top-level keys that should never appear in logged context objects. */
const SENSITIVE_KEYS = new Set([
  'email',
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'creditCard',
  'credit_card',
  'ssn',
  'authorization',
]);

/**
 * Returns a shallow copy of `context` with sensitive fields removed.
 * Only strips top-level keys — nested objects are kept as-is because the
 * calling site should not pass deeply-nested PII into error context.
 */
function stripSensitiveFields(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * reportError
 *
 * Records an application error together with optional diagnostic context.
 * Sensitive fields are stripped from the context before any logging occurs.
 *
 * In development  — logs to console.error with full context for rapid debugging.
 * In production   — would forward to a monitoring service; currently logs only
 *                   the error message to avoid leaking stack traces to log
 *                   aggregators that may be publicly accessible.
 *
 * @param error   The Error (or Error subclass) to report.
 * @param context Optional key/value pairs providing debugging context.
 *                Any key matching SENSITIVE_KEYS is automatically removed.
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  const safeContext =
    context !== undefined ? stripSensitiveFields(context) : undefined;

  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorReporter]', error, safeContext ?? '');
    return;
  }

  // Production: in a real application, forward to monitoring service here.
  // e.g. Sentry.captureException(error, { extra: safeContext });
  // For the workshop we emit only the message so stack traces stay server-side.
  console.error('[ErrorReporter]', error.message, safeContext ?? '');
}
