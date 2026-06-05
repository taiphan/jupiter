'use client';

import { Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIssuesStore } from '@/lib/issues-store';
import { isWatching } from '@/lib/derive/watchers';
import type { Member } from '@/lib/types';
import { UserAvatar } from './user-avatar';

interface IssueWatchersProps {
  issueId: string;
  watcherIds: string[];
  projectMembers: Member[];
  currentUserId: string;
  canEdit: boolean;
}

export function IssueWatchers({
  issueId,
  watcherIds,
  projectMembers,
  currentUserId,
  canEdit,
}: IssueWatchersProps) {
  const toggleWatch = useIssuesStore((s) => s.toggleWatch);
  const addWatcher = useIssuesStore((s) => s.addWatcher);
  const removeWatcher = useIssuesStore((s) => s.removeWatcher);

  const watching = isWatching({ watcherIds }, currentUserId);
  const watchers = watcherIds
    .map((id) => projectMembers.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m));
  const available = projectMembers.filter((m) => !watcherIds.includes(m.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Watchers</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer gap-1.5 px-2 text-xs"
          onClick={() => toggleWatch(issueId, currentUserId)}
        >
          {watching ? (
            <>
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Unwatch
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Watch
            </>
          )}
        </Button>
      </div>

      {watchers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No watchers yet</p>
      ) : (
        <ul className="space-y-1">
          {watchers.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <UserAvatar member={member} size="sm" />
              <span className="min-w-0 flex-1 truncate text-xs">{member.name}</span>
              {canEdit && member.id !== currentUserId && (
                <button
                  type="button"
                  className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${member.name} from watchers`}
                  onClick={() => removeWatcher(issueId, member.id, currentUserId)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && available.length > 0 && (
        <Select
          value=""
          onValueChange={(v) => {
            if (v) addWatcher(issueId, v, currentUserId);
          }}
        >
          <SelectTrigger className="h-7 text-xs" aria-label="Add watcher">
            <SelectValue placeholder="Add watcher…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <UserAvatar member={m} size="sm" />
                  {m.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
