'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link2, Plus, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useIssueLinksStore } from '@/lib/issue-links-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import {
  ISSUE_LINK_TYPES, ISSUE_LINK_TYPE_LABELS, STATUS_LABELS,
  type IssueLinkType,
} from '@/lib/types';
import { cn } from '@/lib/utils';

// Link types the user picks when creating a link (outbound perspective only;
// store normalises the inverse internally).
const CREATEABLE_LINK_TYPES: IssueLinkType[] = [
  'blocks',
  'is_blocked_by',
  'relates_to',
  'clones',
  'duplicates',
];

// Status badge colour hints
const STATUS_COLOURS: Record<string, string> = {
  'backlog': 'text-muted-foreground',
  'todo': 'text-blue-500',
  'in-progress': 'text-yellow-500',
  'in-review': 'text-purple-500',
  'done': 'text-green-500',
};

interface IssueLinksPanel {
  issueId: string;
  canEdit: boolean;
}

export function IssueLinksPanel({ issueId, canEdit }: IssueLinksPanel) {
  const getLinksForIssue = useIssueLinksStore((s) => s.getLinksForIssue);
  const addLink = useIssueLinksStore((s) => s.addLink);
  const removeLink = useIssueLinksStore((s) => s.removeLink);
  // Subscribe to links so the panel re-renders when the store changes.
  useIssueLinksStore((s) => s.links);
  const issues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const [adding, setAdding] = useState(false);
  const [linkType, setLinkType] = useState<IssueLinkType>('relates_to');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const links = getLinksForIssue(issueId);

  // Group by link type for display
  const grouped = useMemo(() => {
    const map = new Map<IssueLinkType, typeof links>();
    for (const link of links) {
      const arr = map.get(link.type) ?? [];
      arr.push(link);
      map.set(link.type, arr);
    }
    return map;
  }, [links]);

  // Issue search results (exclude self + already-linked)
  const linkedTargetIds = new Set(links.map((l) => l.toIssueId));
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return issues
      .filter(
        (i) =>
          i.id !== issueId &&
          !linkedTargetIds.has(i.id) &&
          (i.key.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, issues, issueId, linkedTargetIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = (toIssueId: string) => {
    if (!user) return;
    const result = addLink({ fromIssueId: issueId, toIssueId, type: linkType }, user.id);
    if (result.ok) {
      setQuery('');
      setError(null);
      setAdding(false);
    } else {
      switch (result.reason) {
        case 'short_blocks_cycle':
          setError(`Adding this link would create a circular dependency: ${result.cycle?.join(' → ')}`);
          break;
        case 'duplicate_pair':
          setError('This link already exists.');
          break;
        case 'self_link':
          setError('Cannot link an issue to itself.');
          break;
        default:
          setError('Could not add the link.');
      }
    }
  };

  const handleRemove = (linkId: string) => {
    if (!user) return;
    removeLink(linkId, user.id);
  };

  const cancelAdding = () => {
    setAdding(false);
    setQuery('');
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Links{links.length > 0 && ` (${links.length})`}
        </h3>
        {canEdit && !adding && (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add link
          </Button>
        )}
      </div>

      {/* Add link form */}
      {adding && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={linkType} onValueChange={(v) => v && setLinkType(v as IssueLinkType)}>
              <SelectTrigger className="w-[160px] text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATEABLE_LINK_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {ISSUE_LINK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Search by key or summary…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(null); }}
                className="h-8 text-xs pr-8"
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAdding(); }}
              />
            </div>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer h-8 w-8 shrink-0" onClick={cancelAdding} aria-label="Cancel">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-1.5 rounded bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Search results */}
          {suggestions.length > 0 && (
            <ul className="rounded-md border bg-background shadow-sm divide-y text-xs">
              {suggestions.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(issue.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-left"
                  >
                    <span className="font-mono text-primary shrink-0">{issue.key}</span>
                    <span className="flex-1 truncate">{issue.summary}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] shrink-0', STATUS_COLOURS[issue.status])}
                    >
                      {STATUS_LABELS[issue.status]}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1">No matching issues found.</p>
          )}
        </div>
      )}

      {/* Existing links */}
      {links.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground italic">No links</p>
      ) : (
        <div className="space-y-3">
          {(Array.from(grouped.entries()) as [IssueLinkType, typeof links][]).map(([type, typeLinks]) => (
            <div key={type} className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {ISSUE_LINK_TYPE_LABELS[type]}
              </p>
              <ul className="space-y-1">
                {typeLinks.map((link) => {
                  const target = issues.find((i) => i.id === link.toIssueId);
                  if (!target) return null;
                  return (
                    <li
                      key={link.id}
                      className="group flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs hover:bg-muted/50"
                    >
                      {/* Blocked badge */}
                      {type === 'is_blocked_by' && target.status !== 'done' && (
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" aria-label="Active blocker" />
                      )}
                      <span className="font-mono text-primary shrink-0">{target.key}</span>
                      <span className="flex-1 truncate">{target.summary}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] shrink-0', STATUS_COLOURS[target.status])}
                      >
                        {STATUS_LABELS[target.status]}
                      </Badge>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemove(link.id)}
                          className="cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove link to ${target.key}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
