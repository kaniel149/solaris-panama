import React from 'react';
import { ChevronRight } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  gradient?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
  gradient = false,
  className,
}) => {
  return (
    <div className={cn('pb-6 mb-6 border-b border-white/[0.06]', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-3 text-xs">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-[#555566]" />}
              {crumb.onClick || crumb.href ? (
                <button
                  onClick={crumb.onClick}
                  className="text-[#8888a0] hover:text-[#00ffcc] transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? 'text-[#f0f0f5]' : 'text-[#8888a0]'}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className={cn(
              'text-2xl font-bold',
              gradient
                ? 'bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent'
                : 'text-[#f0f0f5]'
            )}
          >
            {title}
          </h1>
          {description && <p className="text-sm text-[#8888a0] mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
