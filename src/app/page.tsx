'use client';

import { Suspense } from 'react';

// Dynamic component imports with error boundaries
const CustomerCardDemo = () => {
  try {
    // Try to import CustomerCard - this will work after Exercise 3
    const CustomerCard = require('../components/CustomerCard')?.default;
    const mockCustomers = require('../data/mock-customers')?.mockCustomers;
    
    if (CustomerCard && mockCustomers?.length) {
      return (
        <div className="space-y-4">
          <p className="text-green-600 text-sm font-medium">✅ CustomerCard implemented!</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockCustomers.map((customer: { id: string }) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>
        </div>
      );
    }
  } catch (error) {
    // Component doesn't exist yet
  }
  
  return (
    <div className="text-gray-500 text-sm">
      After Exercise 3, your CustomerCard components will appear here showing customer information with health scores.
    </div>
  );
};

const DomainHealthWidget = () => {
  try {
    const HealthIndicator = require('../components/HealthIndicator')?.default;
    const mockCustomers = require('../data/mock-customers')?.mockCustomers;
    if (HealthIndicator && mockCustomers?.length) {
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-gray-700 mb-3">Domain Health Widget</p>
          <div className="space-y-2">
            {mockCustomers.slice(0, 4).map((c: { id: string; name: string; healthScore: number; domains?: string[] }) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-gray-600 truncate">{c.domains?.[0] ?? c.name}</span>
                <HealthIndicator score={c.healthScore} size="sm" showLabel />
              </div>
            ))}
          </div>
          <p className="text-xs text-green-600 mt-3">✅ Exercise 5</p>
        </div>
      );
    }
  } catch (error) {
    // Component doesn't exist yet
  }
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
      Domain Health Widget
      <br />
      <span className="text-xs">Exercise 5</span>
    </div>
  );
};

const MarketIntelligenceWidgetDemo = () => {
  try {
    const MarketIntelligenceWidget = require('../components/MarketIntelligenceWidget')?.MarketIntelligenceWidget;
    const mockCustomers = require('../data/mock-customers')?.mockCustomers;
    if (MarketIntelligenceWidget && mockCustomers?.length) {
      return (
        <div className="space-y-1">
          <p className="text-green-600 text-xs font-medium">✅ Exercise 6</p>
          <MarketIntelligenceWidget company={mockCustomers[0].company} />
        </div>
      );
    }
  } catch (error) {
    // Component doesn't exist yet
  }
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
      Market Intelligence
      <br />
      <span className="text-xs">Exercise 6</span>
    </div>
  );
};

const PredictiveAlertsDemo = () => {
  try {
    const PredictiveIntelligencePanel = require('../components/PredictiveIntelligencePanel')?.PredictiveIntelligencePanel;
    const mockCustomers = require('../data/mock-customers')?.mockCustomers;
    if (PredictiveIntelligencePanel && mockCustomers?.length) {
      return (
        <div className="space-y-1">
          <p className="text-green-600 text-xs font-medium">✅ Exercise 8</p>
          <PredictiveIntelligencePanel
            customerId={mockCustomers[0].id}
            company={mockCustomers[0].company}
          />
        </div>
      );
    }
  } catch (error) {
    // Component doesn't exist yet
  }
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
      Predictive Alerts
      <br />
      <span className="text-xs">Exercise 8</span>
    </div>
  );
};


export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Customer Intelligence Dashboard
        </h1>
        <p className="text-gray-600">
          AI for Engineering Teams Workshop - Your Progress
        </p>
      </header>

      {/* Progress Indicator */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Workshop Progress</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Setup Complete - Next.js app is running</p>
          <p className="text-gray-400">⏳ Exercise 3: CustomerCard component (implement to see here)</p>
          <p className="text-gray-400">⏳ Exercise 4: CustomerSelector integration</p>
          <p className="text-gray-400">⏳ Exercise 5: Domain Health widget</p>
          <p className="text-gray-400">⏳ Exercise 9: Production-ready features</p>
        </div>
      </div>

      {/* Component Showcase Area */}
      <div className="space-y-8">
        {/* CustomerCard Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CustomerCard Component</h3>
          <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
            <CustomerCardDemo />
          </Suspense>
        </section>

        {/* Dashboard Widgets Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Dashboard Widgets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DomainHealthWidget />
            <MarketIntelligenceWidgetDemo />
            <PredictiveAlertsDemo />
          </div>
        </section>

        {/* Getting Started */}
        <section className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to Start Building?</h3>
          <p className="text-blue-800 mb-4">
            Follow along with the workshop exercises to see this dashboard come to life with AI-generated components.
          </p>
          <div className="text-sm text-blue-700">
            <p className="mb-1"><strong>Next:</strong> Exercise 1 - Create your first specification</p>
            <p className="mb-1"><strong>Then:</strong> Exercise 3 - Generate your first component</p>
            <p className="text-xs text-blue-600">💡 Tip: Refresh this page after completing exercises to see your progress!</p>
          </div>
        </section>
      </div>
    </div>
  );
}
