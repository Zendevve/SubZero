import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useCallback } from 'react';
import { Star, StarOff } from 'lucide-react';
import type { Subscription, ActivityStatus } from '@/types';

interface SubscriptionGridProps {
  subscriptions: Subscription[];
  onUnsubscribe?: (channelIds: string[]) => void;
  onToggleSafelist?: (channelId: string, isSafeListed: boolean) => void;
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  ghost: 'bg-ghost/20 text-ghost',
  dormant: 'bg-dormant/20 text-dormant',
  active: 'bg-active/20 text-active',
  unknown: 'bg-slate-700 text-slate-400',
  'no-videos': 'bg-slate-700 text-slate-400',
};

export default function SubscriptionGrid({
  subscriptions,
  onUnsubscribe,
  onToggleSafelist,
}: SubscriptionGridProps) {
  const [filter, setFilter] = useState<ActivityStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesFilter = filter === 'all' || sub.activityStatus === filter;
    const matchesSearch =
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.handle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredSubs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  const toggleSelect = useCallback((id: string, isSafeListed: boolean) => {
    // Prevent selecting safelisted channels
    if (isSafeListed) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    // Select all visible (filtered) channels that are not safe-listed
    const ids = filteredSubs.filter((s) => !s.isSafeListed).map((s) => s.id);
    setSelectedIds(new Set(ids));
  }, [filteredSubs]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleUnsubscribe = () => {
    if (selectedIds.size === 0) return;
    onUnsubscribe?.(Array.from(selectedIds));
  };

  return (
    <div>
      {/* Selection Bar */}
      <div className="flex items-center justify-between mb-4 p-4 bg-slate-800 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold">
            {selectedIds.size} selected
          </span>
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
          >
            Select All Visible
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
          >
            Clear
          </button>
        </div>
        <button
          onClick={handleUnsubscribe}
          disabled={selectedIds.size === 0}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
        >
          🗑️ Unsubscribe ({selectedIds.size})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 flex-1"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityStatus | 'all')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          <option value="all">All ({subscriptions.length})</option>
          <option value="ghost">Ghosts ({subscriptions.filter((s) => s.activityStatus === 'ghost').length})</option>
          <option value="dormant">Dormant ({subscriptions.filter((s) => s.activityStatus === 'dormant').length})</option>
          <option value="active">Active ({subscriptions.filter((s) => s.activityStatus === 'active').length})</option>
          <option value="unknown">Unknown ({subscriptions.filter((s) => s.activityStatus === 'unknown').length})</option>
        </select>
      </div>

      {/* Virtualized List */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto rounded-lg border border-slate-700"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const sub = filteredSubs[virtualItem.index];
            const isSelected = selectedIds.has(sub.id);
            return (
              <div
                key={sub.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className={`flex items-center gap-4 px-4 py-2 border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer ${isSelected ? 'bg-subzero-900/30' : ''
                  }`}
                onClick={() => toggleSelect(sub.id, sub.isSafeListed)}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={sub.isSafeListed}
                  onChange={() => toggleSelect(sub.id, sub.isSafeListed)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-subzero-500 focus:ring-subzero-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Avatar */}
                <img
                  src={sub.avatarUrl}
                  alt={sub.title}
                  className="w-12 h-12 rounded-full object-cover"
                  loading="lazy"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{sub.title}</p>
                  <p className="text-sm text-slate-400 truncate">{sub.handle}</p>
                </div>

                {/* Safe-list Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSafelist?.(sub.id, !sub.isSafeListed);
                  }}
                  title={sub.isSafeListed ? "Remove from Safelist" : "Add to Safelist"}
                  className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${sub.isSafeListed ? 'text-yellow-400' : 'text-slate-500'}`}
                >
                  {sub.isSafeListed ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                </button>

                {/* Last Upload */}
                <div className="text-right w-32">
                  <p className="text-sm text-slate-400">Last Upload</p>
                  <p className="text-white">{formatDate(sub.lastUpload)}</p>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${STATUS_COLORS[sub.activityStatus]}`}
                >
                  {sub.activityStatus}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <p className="text-slate-500 text-sm mt-4">
        Showing {filteredSubs.length} of {subscriptions.length} channels.
      </p>
    </div>
  );
}
