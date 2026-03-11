'use client';

import { type ChangeEvent, type FC, useState } from 'react';
import type { Customer } from '../data/mock-customers';
import { CustomerCard } from './CustomerCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerSelectorProps {
  /** Full list of customers to display and filter. */
  customers: Customer[];
  /** ID of the currently selected customer. Controls the highlight ring. */
  selectedCustomerId?: string;
  /** Called with the full Customer object when the user clicks a card. */
  onSelect: (customer: Customer) => void;
  /** When true, renders skeleton placeholder cards instead of real data. */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of skeleton cards to render while loading. */
const SKELETON_COUNT = 6;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single gray placeholder card shown during loading state. */
const SkeletonCard: FC = () => (
  <div
    aria-hidden="true"
    className={[
      'rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
      'min-h-[120px] w-full max-w-[400px] animate-pulse',
    ].join(' ')}
  >
    {/* Top row */}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
      {/* Health badge placeholder */}
      <div className="h-7 w-14 shrink-0 rounded-full bg-gray-200" />
    </div>
    {/* Domain row */}
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="h-3 w-1/2 rounded bg-gray-200" />
    </div>
  </div>
);

SkeletonCard.displayName = 'SkeletonCard';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CustomerSelector
 *
 * Renders a searchable, responsive grid of CustomerCard components. The
 * caller controls which card is selected via `selectedCustomerId`; the
 * component calls `onSelect` with the full Customer when a card is clicked.
 *
 * Filtering is synchronous and case-insensitive, matching against both the
 * customer `name` and `company` fields.
 */
export const CustomerSelector: FC<CustomerSelectorProps> = ({
  customers,
  selectedCustomerId,
  onSelect,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCustomers = normalizedQuery
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(normalizedQuery) ||
          c.company.toLowerCase().includes(normalizedQuery),
      )
    : customers;

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <input
        type="search"
        value={query}
        onChange={handleSearchChange}
        placeholder="Search by name or company…"
        aria-label="Search customers by name or company"
        className={[
          'w-full rounded-lg border border-gray-300 bg-white px-4 py-2',
          'text-sm text-gray-900 placeholder-gray-400',
          'transition-shadow duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        ].join(' ')}
      />

      {/* Loading state */}
      {isLoading && (
        <div
          role="status"
          aria-label="Loading customers"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Customer grid */}
      {!isLoading && filteredCustomers.length > 0 && (
        <ul
          className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Customer list"
        >
          {filteredCustomers.map((customer) => {
            const isSelected = customer.id === selectedCustomerId;
            return (
              <li key={customer.id}>
                <CustomerCard
                  customer={customer}
                  onClick={() => onSelect(customer)}
                  className={[
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty state */}
      {!isLoading && filteredCustomers.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'flex flex-col items-center justify-center rounded-xl',
            'border border-dashed border-gray-300 bg-white px-6 py-12',
            'text-center',
          ].join(' ')}
        >
          <p className="text-sm font-medium text-gray-500">No results found</p>
          {normalizedQuery && (
            <p className="mt-1 text-xs text-gray-400">
              No customers match &ldquo;{query.trim()}&rdquo;. Try a different name or company.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

CustomerSelector.displayName = 'CustomerSelector';

export default CustomerSelector;
