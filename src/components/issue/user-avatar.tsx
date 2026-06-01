import { User } from 'lucide-react';
import type { Member } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

interface UserAvatarProps {
  member: Member | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-7 w-7 text-[11px]',
  lg: 'h-9 w-9 text-sm',
};

export function UserAvatar({ member, size = 'sm', className }: UserAvatarProps) {
  if (!member) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground',
          SIZE[size],
          className,
        )}
        aria-label="Unassigned"
      >
        <User className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold text-white',
        SIZE[size],
        className,
      )}
      style={{ backgroundColor: member.avatarColor }}
      title={member.name}
      aria-label={member.name}
    >
      {initials(member.name)}
    </span>
  );
}
