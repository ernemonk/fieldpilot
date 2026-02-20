import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-teal-100 font-medium text-teal-700',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

interface AvatarStackProps {
  names: string[];
  max?: number;
}

export function AvatarStack({ names, max = 3 }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map((name, i) => (
        <Avatar
          key={i}
          name={name}
          size="sm"
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white">
          +{remaining}
        </div>
      )}
    </div>
  );
}
