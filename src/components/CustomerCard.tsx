'use client';

import type { FC, KeyboardEvent } from 'react';
import type { Customer } from '../data/mock-customers';
import HealthIndicator from './HealthIndicator';

/** Props accepted by CustomerCard. */
export interface CustomerCardProps {
  /**
   * Customer data object matching the Customer interface from mock-customers.ts.
   * Only the fields used for display are required; all optional Customer fields
   * are preserved so the caller can pass a full Customer record directly.
   */
  customer: Pick<Customer, 'name' | 'company' | 'healthScore'> &
    Partial<Pick<Customer, 'email' | 'subscriptionTier' | 'domains'>>;
  /**
   * Optional click handler. When provided the card becomes an interactive
   * button element with keyboard (Enter) support and a hover shadow lift.
   */
  onClick?: () => void;
  /** Additional Tailwind classes forwarded to the root element. */
  className?: string;
}

/** Map subscription tier to a human-readable label and badge colours. */
const TIER_META = {
  basic: { label: 'Basic', className: 'bg-gray-100 text-gray-600' },
  premium: { label: 'Premium', className: 'bg-blue-100 text-blue-700' },
  enterprise: { label: 'Enterprise', className: 'bg-purple-100 text-purple-700' },
} satisfies Record<
  NonNullable<Customer['subscriptionTier']>,
  { label: string; className: string }
>;

/**
 * CustomerCard
 *
 * Displays a summary card for a single customer including their name, company,
 * optional email, subscription tier, health score badge, and monitored domains.
 *
 * Health score colour thresholds (delegated to HealthIndicator):
 *   - Red   (0–30)   Critical
 *   - Yellow (31–70) Warning
 *   - Green (71–100) Healthy
 */
export const CustomerCard: FC<CustomerCardProps> = ({
  customer,
  onClick,
  className = '',
}) => {
  const { name, email, company, healthScore, subscriptionTier, domains } = customer;
  const domainCount = domains?.length ?? 0;
  const tierMeta = subscriptionTier ? TIER_META[subscriptionTier] : null;

  const isInteractive = typeof onClick === 'function';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (isInteractive && e.key === 'Enter') {
      e.preventDefault();
      onClick!();
    }
  }

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `View details for ${name}` : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={[
        // Base layout
        'relative flex flex-col max-w-[400px] min-h-[120px] w-full',
        // Visual style
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
        // Transition
        'transition-shadow duration-150',
        // Interactive states
        isInteractive
          ? 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top row: identity + health badge */}
      <div className="flex items-start justify-between gap-3">
        {/* Customer identity */}
        <div className="min-w-0 flex-1">
          {/* Name — sanitised via React's text rendering (no dangerouslySetInnerHTML) */}
          <p className="truncate text-base font-semibold text-gray-900">{name}</p>

          {/* Company */}
          <p className="truncate text-sm font-medium text-gray-600">{company}</p>

          {/* Email */}
          {email && (
            <p className="truncate text-xs text-gray-400 mt-0.5">{email}</p>
          )}

          {/* Subscription tier badge */}
          {tierMeta && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tierMeta.className}`}
            >
              {tierMeta.label}
            </span>
          )}
        </div>

        {/* Health score */}
        <HealthIndicator
          score={healthScore}
          variant="badge"
          size="md"
          showLabel
        />
      </div>

      {/* Domains section */}
      {domainCount > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {domainCount === 1 ? (
            /* Single domain — show inline */
            <p className="truncate text-xs text-gray-500">{domains![0]}</p>
          ) : (
            /* Multiple domains — show count header + list */
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {domainCount} domains
              </p>
              <ul className="space-y-0.5" aria-label={`Domains for ${name}`}>
                {domains!.map((domain) => (
                  <li key={domain} className="truncate text-xs text-gray-400">
                    {domain}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty domains state — only shown when domains array is explicitly empty */}
      {domains !== undefined && domainCount === 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs italic text-gray-400">No domains configured</p>
        </div>
      )}
    </div>
  );
};

CustomerCard.displayName = 'CustomerCard';

export default CustomerCard;
