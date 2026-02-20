'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useState } from 'react';
import { X } from 'lucide-react';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: SlideOverPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex transform flex-col border-l border-[#E5E7EB] bg-white shadow-xl transition-transform duration-300',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}

interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function SlideOverTabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key || '');

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[#E5E7EB]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              active === tab.key
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-[#6B7280] hover:text-[#111827]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
