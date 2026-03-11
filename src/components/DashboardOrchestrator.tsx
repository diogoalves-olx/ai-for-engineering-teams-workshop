'use client';

import React, {
  type FC,
  Suspense,
  useState,
} from 'react';
import { mockCustomers, type Customer } from '../data/mock-customers';
import {
  calculateHealthScore,
  type HealthScoreResult,
  type PaymentInput,
  type EngagementInput,
  type ContractInput,
  type SupportInput,
} from '../lib/healthCalculator';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { SkipLink } from './SkipLink';
import { ExportPanel } from './ExportPanel';

// ---------------------------------------------------------------------------
// Lazy-loaded widgets (code splitting)
// ---------------------------------------------------------------------------

const CustomerSelector = React.lazy(
  () => import('./CustomerSelector'),
);

const CustomerHealthDisplay = React.lazy(
  () => import('./CustomerHealthDisplay'),
);

const AlertsPanel = React.lazy(
  () => import('./AlertsPanel'),
);

const MarketIntelligenceWidget = React.lazy(
  () => import('./MarketIntelligenceWidget'),
);

const PredictiveIntelligencePanel = React.lazy(
  () => import('./PredictiveIntelligencePanel'),
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardOrchestratorProps {
  /** Additional Tailwind classes forwarded to the outermost element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Mock health data derivation
// ---------------------------------------------------------------------------

/**
 * Derives mock PaymentInput, EngagementInput, ContractInput, and SupportInput
 * from a Customer record, then calls calculateHealthScore to produce a
 * HealthScoreResult that the CustomerHealthDisplay widget can consume.
 *
 * Input values are derived deterministically from the customer's healthScore so
 * each customer displays plausibly varied data without requiring an external API.
 *
 * Mapping conventions (all inputs are non-negative):
 *   - High healthScore  → recent payment, active engagement, long renewal runway
 *   - Low healthScore   → late payment, low engagement, imminent renewal risk
 */
function buildHealthData(customer: Customer): HealthScoreResult {
  const s = customer.healthScore; // 0–100

  // Payment: healthier customers pay on time with no overdue balance.
  const payment: PaymentInput = {
    daysSinceLastPayment: Math.round((1 - s / 100) * 25),   // 0–25 days
    avgPaymentDelayDays: Math.round((1 - s / 100) * 10),    // 0–10 days avg delay
    overdueAmount: s < 40 ? Math.round((40 - s) * 50) : 0, // $0–$2000 when at risk
  };

  // Engagement: healthier customers log in frequently and use more features.
  const engagement: EngagementInput = {
    loginFrequencyPerMonth: Math.round((s / 100) * 22),     // 0–22 logins/month
    featureUsageCount: Math.round((s / 100) * 12),          // 0–12 features
    openSupportTickets: s < 50 ? Math.round((50 - s) / 15) : 0, // 0–3 tickets
  };

  // Contract: healthier customers have longer runways and higher-value contracts.
  const contractValue =
    customer.subscriptionTier === 'enterprise'
      ? 60000
      : customer.subscriptionTier === 'premium'
      ? 25000
      : 8000;

  const contract: ContractInput = {
    daysUntilRenewal: Math.round(30 + (s / 100) * 335),   // 30–365 days
    contractValue,
    recentUpgrade:
      customer.subscriptionTier === 'enterprise' && s > 75,
  };

  // Support: healthier customers have faster resolutions and higher satisfaction.
  const support: SupportInput = {
    avgResolutionTimeHours: Math.round(4 + (1 - s / 100) * 68), // 4–72 hours
    satisfactionScore: parseFloat(Math.min(5, 1 + (s / 100) * 4).toFixed(1)), // 1–5
    escalationCount: s < 35 ? 1 : 0,
  };

  // Previous score simulates a slight improvement for healthy customers and
  // a decline for at-risk customers, producing meaningful trend arrows.
  const previousScore =
    s > 70
      ? Math.max(0, s - 6)   // improving
      : s < 40
      ? Math.min(100, s + 6) // declining
      : s;                   // stable

  return calculateHealthScore(payment, engagement, contract, support, previousScore);
}

// ---------------------------------------------------------------------------
// Skeleton fallback (shown while lazy chunks load)
// ---------------------------------------------------------------------------

const WidgetSkeleton: FC<{ label: string }> = ({ label }) => (
  <div
    aria-busy="true"
    aria-label={`Loading ${label}`}
    className={[
      'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
      'min-h-[180px] animate-pulse',
    ].join(' ')}
  >
    <div className="mb-4 h-3 w-1/4 rounded bg-gray-200" />
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-5/6 rounded bg-gray-200" />
      <div className="h-3 w-4/6 rounded bg-gray-200" />
    </div>
  </div>
);

WidgetSkeleton.displayName = 'WidgetSkeleton';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * DashboardOrchestrator
 *
 * Top-level layout shell for the Customer Intelligence Dashboard.
 *
 * Responsibilities:
 *   - Owns the `selectedCustomer` state that drives all widgets
 *   - Provides a SkipLink for keyboard accessibility
 *   - Renders a consistent header bar with the dashboard title and Export button
 *   - Code-splits every widget via React.lazy + Suspense
 *   - Wraps the full page in a DashboardErrorBoundary (catastrophic failures)
 *   - Wraps each widget in a WidgetErrorBoundary (isolated widget failures)
 *   - Opens / closes the ExportPanel slide-over drawer
 *
 * Layout (CSS Grid):
 *   - Full-viewport container with a sticky header
 *   - Main area: two-column grid on desktop (selector | widgets), stacked on mobile
 *   - Widgets grid: 2-column on md+
 */
export const DashboardOrchestrator: FC<DashboardOrchestratorProps> = ({
  className,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [exportPanelOpen, setExportPanelOpen] = useState(false);

  const healthData: HealthScoreResult | null =
    selectedCustomer !== null ? buildHealthData(selectedCustomer) : null;

  return (
    <DashboardErrorBoundary>
      {/* Skip navigation — must be the first focusable element in the DOM */}
      <SkipLink />

      <div
        className={[
          'flex min-h-screen flex-col bg-gray-50',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                              */}
        {/* ------------------------------------------------------------------ */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {/* Dashboard wordmark */}
              <div
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600"
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h1 className="text-base font-semibold text-gray-900 sm:text-lg">
                Customer Intelligence Dashboard
              </h1>
            </div>

            {/* Export action */}
            <button
              type="button"
              aria-label="Open export panel"
              onClick={() => setExportPanelOpen(true)}
              className={[
                'flex items-center gap-2 rounded-lg border border-gray-300 bg-white',
                'px-3 py-1.5 text-sm font-medium text-gray-700',
                'hover:bg-gray-50 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'transition-colors duration-150',
              ].join(' ')}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Main content                                                        */}
        {/* ------------------------------------------------------------------ */}
        <main
          id="main-content"
          tabIndex={-1}
          className={[
            'mx-auto w-full max-w-screen-xl flex-1',
            'px-4 py-6 sm:px-6 lg:px-8',
            'focus:outline-none',
          ].join(' ')}
        >
          {/* Two-column layout: selector (left) + widget grid (right) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

            {/* -------------------------------------------------------------- */}
            {/* Customer selector column                                        */}
            {/* -------------------------------------------------------------- */}
            <section aria-label="Customer list" className="lg:self-start">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Customers
              </h2>
              <WidgetErrorBoundary widgetName="Customer Selector">
                <Suspense fallback={<WidgetSkeleton label="customer list" />}>
                  <CustomerSelector
                    customers={mockCustomers}
                    selectedCustomerId={selectedCustomer?.id}
                    onSelect={setSelectedCustomer}
                  />
                </Suspense>
              </WidgetErrorBoundary>
            </section>

            {/* -------------------------------------------------------------- */}
            {/* Widget grid                                                     */}
            {/* -------------------------------------------------------------- */}
            <section aria-label="Customer detail widgets">
              {/* Selection prompt when no customer is chosen */}
              {selectedCustomer === null ? (
                <div
                  className={[
                    'flex flex-col items-center justify-center rounded-xl',
                    'border border-dashed border-gray-300 bg-white px-8 py-16 text-center',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium text-gray-500">
                    Select a customer to view detailed analytics
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Click any customer card on the left to load their health
                    score, alerts, and predictive insights.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                  {/* Health Score widget */}
                  <WidgetErrorBoundary widgetName="Health Score">
                    <Suspense
                      fallback={<WidgetSkeleton label="health score" />}
                    >
                      <CustomerHealthDisplay
                        customerId={selectedCustomer.id}
                        healthData={healthData}
                        isLoading={false}
                        error={null}
                      />
                    </Suspense>
                  </WidgetErrorBoundary>

                  {/* Market Intelligence widget */}
                  <WidgetErrorBoundary widgetName="Market Intelligence">
                    <Suspense
                      fallback={
                        <WidgetSkeleton label="market intelligence" />
                      }
                    >
                      <MarketIntelligenceWidget
                        company={selectedCustomer.company}
                      />
                    </Suspense>
                  </WidgetErrorBoundary>

                  {/* Active Alerts widget */}
                  <WidgetErrorBoundary widgetName="Active Alerts">
                    <Suspense
                      fallback={<WidgetSkeleton label="active alerts" />}
                    >
                      <AlertsPanel
                        alerts={[]}
                        isLoading={false}
                        error={null}
                        onDismiss={() => undefined}
                        onAction={() => undefined}
                      />
                    </Suspense>
                  </WidgetErrorBoundary>

                  {/* Predictive Intelligence widget */}
                  <WidgetErrorBoundary widgetName="Predictive Intelligence">
                    <Suspense
                      fallback={
                        <WidgetSkeleton label="predictive intelligence" />
                      }
                    >
                      <PredictiveIntelligencePanel
                        customerId={selectedCustomer.id}
                        company={selectedCustomer.company}
                      />
                    </Suspense>
                  </WidgetErrorBoundary>

                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Export panel slide-over                                               */}
      {/* -------------------------------------------------------------------- */}
      <ExportPanel
        isOpen={exportPanelOpen}
        onClose={() => setExportPanelOpen(false)}
      />
    </DashboardErrorBoundary>
  );
};

DashboardOrchestrator.displayName = 'DashboardOrchestrator';

export default DashboardOrchestrator;
