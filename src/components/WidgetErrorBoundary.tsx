'use client';

import React from 'react';
import { reportError } from '../lib/errorReporter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  /** Human-readable name of the widget, shown in the error card heading. */
  widgetName: string;
  /**
   * Optional callback that is invoked when the user clicks "Retry".
   * Useful for external state resets (e.g. clearing a stale fetch cache).
   * If omitted, only the internal hasError state is reset.
   */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Maximum number of user-initiated retries before the error becomes permanent. */
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WidgetErrorBoundary
 *
 * Per-widget error boundary for the Customer Intelligence Dashboard. Wraps an
 * individual dashboard widget so that a rendering failure in one panel does not
 * bring down the entire page.
 *
 * Behaviour:
 *   - On error: renders a compact error card inside the widget's normal area.
 *   - Retry button (up to MAX_RETRIES attempts): resets hasError so React
 *     re-mounts the child. Also calls the optional `onRetry` prop.
 *   - After MAX_RETRIES: the Retry button is hidden and a permanent error state
 *     with a "Contact support" message is shown.
 *
 * Usage:
 *   <WidgetErrorBoundary widgetName="Active Alerts">
 *     <AlertsPanel ... />
 *   </WidgetErrorBoundary>
 */
export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  State
> {
  static displayName = 'WidgetErrorBoundary';

  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, {
      widgetName: this.props.widgetName,
      retryCount: this.state.retryCount,
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleRetry(): void {
    if (this.props.onRetry !== undefined) {
      this.props.onRetry();
    }
    this.setState((prev) => ({
      hasError: false,
      retryCount: prev.retryCount + 1,
    }));
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isPermanent = this.state.retryCount >= MAX_RETRIES;

    return (
      <div
        role="alert"
        aria-live="polite"
        className={[
          'rounded-xl border border-red-200 bg-red-50',
          'p-5 shadow-sm',
        ].join(' ')}
      >
        {/* Widget name badge */}
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">
          {this.props.widgetName}
        </p>

        {/* Primary message */}
        <p className="text-sm font-medium text-red-700">
          Something went wrong
        </p>

        {/* Secondary message */}
        <p className="mt-1 text-xs text-red-500">
          {isPermanent
            ? 'This widget is unable to recover. Please contact support if the issue persists.'
            : 'This widget encountered an error and could not render.'}
        </p>

        {/* Actions */}
        {!isPermanent && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className={[
                'rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white',
                'hover:bg-red-700 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1',
                'transition-colors duration-150',
              ].join(' ')}
            >
              Retry
            </button>
            <span className="text-xs text-red-400">
              {MAX_RETRIES - this.state.retryCount} attempt
              {MAX_RETRIES - this.state.retryCount === 1 ? '' : 's'} remaining
            </span>
          </div>
        )}

        {isPermanent && (
          <p className="mt-3 text-xs font-medium text-red-600">
            Contact support
          </p>
        )}
      </div>
    );
  }
}

export default WidgetErrorBoundary;
