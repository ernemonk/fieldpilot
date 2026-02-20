'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface ActionItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionDropdownProps {
  actions: ActionItem[];
  className?: string;
}

export function ActionDropdown({ actions, className }: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                action.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-[#111827] hover:bg-gray-50'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
