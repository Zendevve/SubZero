import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState } from 'react';
import type { Subscription, ActivityStatus } from '@/types';

interface SubscriptionGridProps {
  subscriptions: Subscription[];
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  ghost: 'bg-ghost/20 text-ghost',
  dormant: 'bg-dormant/20 text-dormant',
  active: 'bg-active/20 text-active',
  unknown: 'bg-slate-700 text-slate-400',
  'no-videos': 'bg-slate-700 text-slate-400',
};

export default function SubscriptionGrid({ subscriptions }: SubscriptionGridProps) {
  const [filter, setFilter] = useState<ActivityStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div>
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
                className="flex items-center gap-4 px-4 py-2 border-b border-slate-700 hover:bg-slate-800/50"
              >
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

                {/* Last Upload */}
                <div className="text-right">
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
