'use client';

import React from 'react';
import { reportError } from '../lib/errorReporter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional callback invoked after the error is reported. Useful for
   * integrating custom monitoring or triggering parent-level state resets.
   */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DashboardErrorBoundary
 *
 * Full-page error boundary for the Customer Intelligence Dashboard. Catches
 * any unhandled error thrown during rendering inside its subtree and replaces
 * the entire page body with a friendly error screen.
 *
 * In development, the raw error message is shown beneath the heading to aid
 * debugging. In production, technical details are suppressed so end users
 * see only the support message.
 *
 * Usage:
 *   Wrap the root <DashboardOrchestrator> (or the entire page body) with this
 *   boundary so that a catastrophic render failure presents a recoverable UI
 *   rather than a blank screen.
 */
export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  State
> {
  static displayName = 'DashboardErrorBoundary';

  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, {
      componentStack: info.componentStack ?? undefined,
    });

    if (this.props.onError !== undefined) {
      this.props.onError(error, info);
    }
  }

  handleRefresh(): void {
    window.location.reload();
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={[
          'flex min-h-screen flex-col items-center justify-center',
          'bg-gray-50 px-4 py-16 text-center',
        ].join(' ')}
      >
        {/* Icon */}
        <div
          aria-hidden="true"
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
        >
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Something went wrong
        </h1>

        {/* Support message */}
        <p className="mb-6 max-w-md text-sm text-gray-500">
          An unexpected error occurred in the Customer Intelligence Dashboard.
          Please refresh the page to try again. If the problem persists, contact
          your support team.
        </p>

        {/* Development-only error detail */}
        {isDev && this.state.error !== null && (
          <pre
            aria-label="Error details (development only)"
            className={[
              'mb-6 max-w-lg overflow-auto rounded-lg border border-red-200',
              'bg-red-50 px-4 py-3 text-left text-xs text-red-700',
            ].join(' ')}
          >
            {this.state.error.message}
          </pre>
        )}

        {/* Recovery action */}
        <button
          type="button"
          onClick={this.handleRefresh}
          className={[
            'rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white',
            'hover:bg-blue-700 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'transition-colors duration-150',
          ].join(' ')}
        >
          Refresh Page
        </button>
      </div>
    );
  }
}

export default DashboardErrorBoundary;
