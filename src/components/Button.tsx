'use client';

import type { FC } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ButtonProps {
  /** Visible button text. Always rendered as a text node; never via dangerouslySetInnerHTML. */
  label: string;
  /** Called when the button is clicked, provided it is neither loading nor disabled. */
  onClick: () => void;
  /** Visual style variant. Defaults to "primary". */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * When true the label is visually replaced by a spinner, the button is
   * non-interactive, and aria-busy / aria-disabled are set to "true".
   */
  loading?: boolean;
  /** Prevents interaction independently of the loading state. */
  disabled?: boolean;
  /** Overrides the accessible name when the label alone is insufficient. */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

/** Base classes shared by all variants (layout, sizing, typography, transitions). */
const BASE_CLASSES =
  'relative inline-flex items-center justify-center w-full max-w-[200px] h-9 px-4 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none';

const VARIANT_CLASSES = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500',
  secondary:
    'bg-transparent text-gray-600 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>;

/**
 * Classes applied when the button is non-interactive (loading OR disabled).
 * Overrides hover/active effects and changes the cursor.
 */
const DISABLED_CLASSES =
  'opacity-50 cursor-not-allowed pointer-events-none';

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

/**
 * A 16 × 16 px SVG spinner that inherits `currentColor` so it automatically
 * matches the button's text colour for all variants.
 */
const Spinner: FC = () => (
  <svg
    aria-hidden="true"
    className="w-4 h-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 16 16"
  >
    {/* Track — low-opacity full circle */}
    <circle
      className="opacity-25"
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    {/* Arc — the visible spinning segment */}
    <path
      className="opacity-75"
      fill="currentColor"
      d="M8 2a6 6 0 0 1 6 6h-2.5A3.5 3.5 0 0 0 8 4.5V2z"
    />
  </svg>
);

Spinner.displayName = 'Spinner';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Button
 *
 * A controlled, stateless button with three visual variants (primary,
 * secondary, danger) and a loading state.
 *
 * Loading behaviour:
 *   - A spinner replaces the visible label while `loading` is true.
 *   - The label is kept in the DOM as invisible text so the button retains
 *     its natural width and there is no layout shift.
 *   - Click events are suppressed and aria-busy / aria-disabled are set.
 *
 * The `disabled` prop works independently: it prevents clicks and applies
 * reduced-opacity / not-allowed styling regardless of `loading`.
 */
export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  ariaLabel,
}) => {
  const isInert = loading || disabled;

  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    isInert ? DISABLED_CLASSES : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={isInert ? 'true' : undefined}
      disabled={isInert}
      onClick={isInert ? undefined : onClick}
      className={classes}
    >
      {/* Spinner — visible only during loading, centred absolutely so it
          does not affect the layout of the invisible label beneath it. */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}

      {/* Label — always rendered so the button keeps a stable intrinsic
          width. Hidden from sight (but NOT from the layout) when loading
          so there is no size change between states. */}
      <span className={loading ? 'invisible' : undefined}>{label}</span>
    </button>
  );
};

Button.displayName = 'Button';

export default Button;
