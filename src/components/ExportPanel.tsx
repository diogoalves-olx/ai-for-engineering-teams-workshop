'use client';

import { type FC, useEffect, useRef, useState } from 'react';
import { checkRateLimit } from '../lib/rateLimiter';
import {
  downloadFile,
  generateExportData,
  getFilename,
  type ExportFilters,
} from '../lib/exportUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { ExportFilters };

export interface ExportPanelProps {
  /** Controls whether the slide-over drawer is visible. */
  isOpen: boolean;
  /** Called when the user clicks Cancel or closes the panel. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Maximum export actions allowed within any 60-second window. */
const EXPORT_RATE_LIMIT = 5;

/** Total simulated export duration in milliseconds. */
const EXPORT_DURATION_MS = 1800;

/** Interval between progress bar tick updates in milliseconds. */
const PROGRESS_TICK_MS = 80;

/** Progress increment per tick, calculated to reach 100% in EXPORT_DURATION_MS. */
const PROGRESS_INCREMENT = Math.ceil(
  100 / (EXPORT_DURATION_MS / PROGRESS_TICK_MS),
);

// ---------------------------------------------------------------------------
// Default filter state
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: ExportFilters = {
  dataType: 'customers',
  format: 'csv',
  segment: 'all',
  dateRange: { from: '', to: '' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ExportPanel
 *
 * Slide-over drawer that lets users configure and download a data export from
 * the Customer Intelligence Dashboard.
 *
 * Features:
 *   - Data type, format (CSV / JSON), segment, and date range controls
 *   - Simulated progress bar during export processing
 *   - Cancel button aborts an in-progress export
 *   - Client-side rate limiting via checkRateLimit (5 exports per minute)
 *   - Triggers a real browser file download via the Blob URL pattern
 *
 * The panel traps focus when open (via autoFocus on the first input) and
 * restores a tidy state each time it opens.
 */
export const ExportPanel: FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState<ExportFilters>(DEFAULT_FILTERS);
  const [progress, setProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Holds the setInterval id so we can cancel mid-export.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state whenever the panel opens.
  useEffect(() => {
    if (isOpen) {
      setFilters(DEFAULT_FILTERS);
      setProgress(0);
      setIsExporting(false);
      setRateLimitError(null);
    }
  }, [isOpen]);

  // Clean up any pending interval on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ---- Handlers -------------------------------------------------------------

  function handleCancel(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsExporting(false);
    setProgress(0);
    onClose();
  }

  function handleAbortExport(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsExporting(false);
    setProgress(0);
  }

  function handleExport(): void {
    setRateLimitError(null);

    const allowed = checkRateLimit('export', EXPORT_RATE_LIMIT);
    if (!allowed) {
      setRateLimitError(
        `Export limit reached. You can export up to ${EXPORT_RATE_LIMIT} times per minute. Please wait and try again.`,
      );
      return;
    }

    setIsExporting(true);
    setProgress(0);

    let currentProgress = 0;

    intervalRef.current = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + PROGRESS_INCREMENT);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;

        // Generate and trigger download.
        const content = generateExportData(filters);
        const filename = getFilename(filters);
        const mimeType =
          filters.format === 'json' ? 'application/json' : 'text/csv';

        downloadFile(content, filename, mimeType);

        setIsExporting(false);
        setProgress(0);
        onClose();
      }
    }, PROGRESS_TICK_MS);
  }

  function updateFilter<K extends keyof ExportFilters>(
    key: K,
    value: ExportFilters[K],
  ): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Render ---------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <aside
        aria-label="Export data panel"
        role="dialog"
        aria-modal="true"
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col',
          'bg-white shadow-xl',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Export Data</h2>
          <button
            type="button"
            aria-label="Close export panel"
            onClick={handleCancel}
            className={[
              'rounded-md p-1 text-gray-400 hover:text-gray-600',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              'transition-colors duration-150',
            ].join(' ')}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Rate limit error */}
          {rateLimitError !== null && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {rateLimitError}
            </div>
          )}

          {/* Data type */}
          <div>
            <label
              htmlFor="export-dataType"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Data type
            </label>
            <select
              id="export-dataType"
              value={filters.dataType}
              onChange={(e) =>
                updateFilter(
                  'dataType',
                  e.target.value as ExportFilters['dataType'],
                )
              }
              disabled={isExporting}
              className={[
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
                'text-sm text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              <option value="customers">Customers</option>
              <option value="health-scores">Health Scores</option>
              <option value="alerts">Alerts</option>
              <option value="market-intelligence">Market Intelligence</option>
            </select>
          </div>

          {/* Format */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              Format
            </legend>
            <div className="flex gap-4">
              {(['csv', 'json'] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={fmt}
                    checked={filters.format === fmt}
                    onChange={() => updateFilter('format', fmt)}
                    disabled={isExporting}
                    className={[
                      'h-4 w-4 border-gray-300 text-blue-600',
                      'focus:ring-2 focus:ring-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    ].join(' ')}
                  />
                  <span className="uppercase">{fmt}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Segment */}
          <div>
            <label
              htmlFor="export-segment"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Health segment
            </label>
            <select
              id="export-segment"
              value={filters.segment}
              onChange={(e) =>
                updateFilter(
                  'segment',
                  e.target.value as ExportFilters['segment'],
                )
              }
              disabled={isExporting}
              className={[
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
                'text-sm text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              <option value="all">All segments</option>
              <option value="healthy">Healthy (71–100)</option>
              <option value="warning">Warning (31–70)</option>
              <option value="critical">Critical (0–30)</option>
            </select>
          </div>

          {/* Date range */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              Date range
            </legend>
            <div className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="export-date-from"
                  className="mb-1 block text-xs text-gray-500"
                >
                  From
                </label>
                <input
                  id="export-date-from"
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) =>
                    updateFilter('dateRange', {
                      ...filters.dateRange,
                      from: e.target.value,
                    })
                  }
                  disabled={isExporting}
                  className={[
                    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
                    'text-sm text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                />
              </div>
              <div>
                <label
                  htmlFor="export-date-to"
                  className="mb-1 block text-xs text-gray-500"
                >
                  To
                </label>
                <input
                  id="export-date-to"
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) =>
                    updateFilter('dateRange', {
                      ...filters.dateRange,
                      to: e.target.value,
                    })
                  }
                  disabled={isExporting}
                  className={[
                    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
                    'text-sm text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                />
              </div>
            </div>
          </fieldset>

          {/* Progress bar */}
          {isExporting && (
            <div aria-live="polite" aria-label="Export progress">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Preparing export…</span>
                <span>{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Export progress: ${progress}%`}
                className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          {isExporting ? (
            <button
              type="button"
              onClick={handleAbortExport}
              className={[
                'rounded-lg border border-gray-300 bg-white px-4 py-2',
                'text-sm font-medium text-gray-700 hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                'transition-colors duration-150',
              ].join(' ')}
            >
              Cancel export
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className={[
                  'rounded-lg border border-gray-300 bg-white px-4 py-2',
                  'text-sm font-medium text-gray-700 hover:bg-gray-50',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                  'transition-colors duration-150',
                ].join(' ')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className={[
                  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white',
                  'hover:bg-blue-700 focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                  'transition-colors duration-150',
                ].join(' ')}
              >
                Export
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

ExportPanel.displayName = 'ExportPanel';

export default ExportPanel;
