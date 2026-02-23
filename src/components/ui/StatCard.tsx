import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBg?: string;   // e.g. 'bg-teal-50'
  iconColor?: string; // e.g. 'text-teal-600'
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, iconBg, iconColor, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              iconBg || 'bg-gray-100',
              iconColor || 'text-[#6B7280]'
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight text-[#111827]">{value}</p>
        {trend && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            )}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
