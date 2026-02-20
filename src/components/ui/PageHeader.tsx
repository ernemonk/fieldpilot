import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8 flex items-start justify-between', className)}>
      <div>
        <h1 className="text-[28px] font-semibold text-[#111827]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
