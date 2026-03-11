/**
 * exportUtils.ts
 *
 * Pure utility functions for generating and downloading dashboard export data.
 * Supports CSV and JSON output for customers, health scores, alerts, and
 * market intelligence data types.
 *
 * No React imports — safe for use in event handlers, custom hooks, and tests.
 */

import { mockCustomers } from '@/data/mock-customers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportFilters {
  dateRange: { from: string; to: string };
  segment: 'all' | 'healthy' | 'warning' | 'critical';
  customerId?: string;
  format: 'csv' | 'json';
  dataType: 'customers' | 'health-scores' | 'alerts' | 'market-intelligence';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps a numeric health score (0–100) to a segment tier label using the same
 * thresholds as HealthIndicator.getTier().
 *
 *   71–100 → 'healthy'
 *   31–70  → 'warning'
 *   0–30   → 'critical'
 */
function scoreToSegment(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 71) return 'healthy';
  if (score >= 31) return 'warning';
  return 'critical';
}

/**
 * Escapes a cell value for CSV output. Wraps the value in double quotes when
 * it contains commas, double quotes, or newlines. Any embedded double quotes
 * are doubled per RFC 4180.
 */
function csvCell(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of uniform objects to a CSV string.
 * The first row is a header derived from the keys of the first record.
 */
function objectsToCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const rows = records.map((row) =>
    headers.map((h) => csvCell(row[h] as string | number | boolean | undefined | null)).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Customer data generators
// ---------------------------------------------------------------------------

function buildCustomerRecords(
  segment: ExportFilters['segment'],
  customerId?: string,
): Record<string, unknown>[] {
  let customers = mockCustomers;

  if (customerId !== undefined && customerId.trim().length > 0) {
    customers = customers.filter((c) => c.id === customerId);
  }

  if (segment !== 'all') {
    customers = customers.filter((c) => scoreToSegment(c.healthScore) === segment);
  }

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    healthScore: c.healthScore,
    segment: scoreToSegment(c.healthScore),
    subscriptionTier: c.subscriptionTier ?? '',
    domains: (c.domains ?? []).join('; '),
    createdAt: c.createdAt ?? '',
    updatedAt: c.updatedAt ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * generateExportData
 *
 * Returns a CSV or JSON string representation of the requested data type
 * filtered by the provided ExportFilters.
 *
 * For 'customers', real mock data is used. Other data types return clearly
 * labelled placeholder content suitable for workshop demonstrations.
 *
 * @param filters  The export parameters controlling what data and format to produce.
 * @returns A string ready for download, either CSV or JSON.
 */
export function generateExportData(filters: ExportFilters): string {
  const { dataType, format, segment, customerId } = filters;

  if (dataType === 'customers') {
    const records = buildCustomerRecords(segment, customerId);
    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }
    return objectsToCsv(records);
  }

  // Placeholder records for other data types.
  const placeholder: Record<string, unknown>[] = [
    {
      dataType,
      segment,
      note: `Export for '${dataType}' is a workshop placeholder. Connect your data source here.`,
      generatedAt: new Date().toISOString(),
    },
  ];

  if (format === 'json') {
    return JSON.stringify(placeholder, null, 2);
  }
  return objectsToCsv(placeholder);
}

/**
 * getFilename
 *
 * Produces a safe, human-readable filename for the export file, encoding the
 * data type, segment filter, and today's date (YYYY-MM-DD).
 *
 * Example: `customers_healthy_2026-03-11.csv`
 *
 * @param filters  The export parameters.
 * @returns A filename string including the appropriate extension.
 */
export function getFilename(filters: ExportFilters): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ext = filters.format === 'json' ? 'json' : 'csv';
  return `${filters.dataType}_${filters.segment}_${today}.${ext}`;
}

/**
 * downloadFile
 *
 * Creates a temporary Blob URL from `content`, programmatically clicks a
 * hidden anchor element to trigger the browser's native file download dialog,
 * then immediately revokes the object URL to free memory.
 *
 * Must be called in a browser context (not during SSR).
 *
 * @param content   The string content to write into the downloaded file.
 * @param filename  The suggested filename shown in the browser's save dialog.
 * @param mimeType  The MIME type for the Blob (e.g. 'text/csv', 'application/json').
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke immediately — the browser has already queued the download.
  URL.revokeObjectURL(url);
}
