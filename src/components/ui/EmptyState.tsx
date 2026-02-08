import React from 'react';
import { Inbox } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="mb-4 text-[#555566]">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-base font-medium text-[#8888a0] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#555566] max-w-sm mb-5">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
