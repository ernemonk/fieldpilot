import { cn } from '@/lib/utils';
import type { JobStatus } from '@/lib/types';
import { JOB_STATUS_CONFIG } from '@/lib/types';

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = JOB_STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
