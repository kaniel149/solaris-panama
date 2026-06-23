import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

/**
 * Marketing Button — premium light-theme primitive ported from bustan-energy.
 *
 * Lives under `components/marketing/` so it stays fully separate from the CRM's
 * dark-theme `components/ui/Button`. Uses the additive `bustan-*` theme tokens
 * (see tailwind.config.ts + index.css). Renders a react-router <Link> for
 * internal routes (`to`), an <a> for external URLs (`href`), or a <button>.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Internal SPA route — renders react-router <Link> (no full page reload). */
  to?: string;
  /** External URLs only (https://, mailto:, tel:, wa.me) — use `to` for internal routes. */
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  target?: string;
  rel?: string;
  /** Optional leading icon. The `whatsapp` variant defaults to MessageCircle — pass `icon={null}` to suppress. */
  icon?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-2.5',
};

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-grove text-bustan-shell font-semibold',
    'hover:bg-canopy hover:shadow-lift',
    'border border-transparent',
  ].join(' '),
  secondary: [
    'bg-transparent text-grove font-medium',
    'border border-grove/30',
    'hover:bg-mist/50',
  ].join(' '),
  ghost: [
    'bg-transparent text-lagoon font-medium',
    'border border-transparent',
    'hover:underline underline-offset-4',
  ].join(' '),
  whatsapp: [
    'bg-[#25D366] text-white font-semibold',
    'border border-transparent',
    'hover:shadow-lift hover:brightness-105',
  ].join(' '),
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  onClick,
  to,
  href,
  disabled = false,
  type = 'button',
  target,
  rel,
  icon,
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-sans cursor-pointer select-none',
    'rounded-button',
    'transition-all duration-200 ease-out-soft',
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2 focus-visible:ring-offset-bustan-paper',
    disabled ? 'opacity-40 pointer-events-none' : '',
    sizeClasses[size],
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedIcon =
    icon !== undefined ? icon : variant === 'whatsapp' ? <MessageCircle className="w-[1.2em] h-[1.2em]" aria-hidden /> : null;

  const content = (
    <>
      {resolvedIcon}
      {children}
    </>
  );

  if (to || href) {
    // Disabled link: no navigation, no click — announced as disabled.
    if (disabled) {
      return (
        <a className={baseClasses} aria-disabled="true" tabIndex={-1}>
          {content}
        </a>
      );
    }

    if (to) {
      return (
        <Link to={to} target={target} rel={rel} className={baseClasses} onClick={onClick}>
          {content}
        </Link>
      );
    }

    return (
      <a href={href} target={target} rel={rel} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={baseClasses} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

export default Button;
