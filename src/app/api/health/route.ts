import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  dependencies: Record<string, 'ok' | 'error'>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Dependency checks
// ---------------------------------------------------------------------------

/**
 * Returns the status of each declared dependency. In this workshop all
 * dependencies are mocked and always return 'ok'. In production, replace
 * each entry with a real probe (e.g. a lightweight DB ping or cache GET).
 */
function checkDependencies(): Record<string, 'ok' | 'error'> {
  return {
    database: 'ok',
    cache: 'ok',
    marketIntelligenceService: 'ok',
  };
}

/**
 * Derives the top-level status from the dependency map.
 *
 *   All 'ok'            → 'ok'
 *   Any 'error'         → 'degraded'
 *   All 'error'         → 'down'
 */
function deriveStatus(
  dependencies: Record<string, 'ok' | 'error'>,
): HealthResponse['status'] {
  const values = Object.values(dependencies);
  if (values.every((v) => v === 'ok')) return 'ok';
  if (values.every((v) => v === 'error')) return 'down';
  return 'degraded';
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/health
 *
 * Liveness / readiness endpoint for the Customer Intelligence Dashboard.
 *
 * Response body: { status, dependencies, timestamp }
 *
 * Always returns HTTP 200 so load balancers and uptime monitors can parse
 * the JSON body to distinguish healthy vs degraded states without relying
 * on HTTP status codes alone.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const dependencies = checkDependencies();
  const status = deriveStatus(dependencies);

  const body: HealthResponse = {
    status,
    dependencies,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: 200 });
}
