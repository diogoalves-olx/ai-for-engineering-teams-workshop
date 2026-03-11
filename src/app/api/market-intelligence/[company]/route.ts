import { NextRequest, NextResponse } from 'next/server';
import {
  marketIntelligenceService,
  MarketIntelligenceError,
} from '../../../../lib/marketIntelligenceService';

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/market-intelligence/[company]
 *
 * Returns market intelligence data (sentiment + headlines) for the given
 * company name.
 *
 * Responses:
 *   200 — MarketIntelligenceData JSON with Cache-Control: max-age=600
 *   400 — Invalid or empty company name
 *   500 — Unexpected server error
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ company: string }> },
): Promise<NextResponse> {
  const { company } = await params;

  // Validate that the route segment is present and non-empty after decoding.
  const decoded = decodeURIComponent(company ?? '').trim();
  if (decoded.length === 0) {
    return NextResponse.json(
      { error: 'Company name is required.' },
      { status: 400 },
    );
  }

  try {
    const data = await marketIntelligenceService.getMarketData(decoded);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=600',
      },
    });
  } catch (err) {
    if (err instanceof MarketIntelligenceError && err.code === 'INVALID_INPUT') {
      return NextResponse.json(
        { error: err.message },
        { status: 400 },
      );
    }

    // Unexpected errors — log server-side only (never expose internals to client).
    console.error('[market-intelligence] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
