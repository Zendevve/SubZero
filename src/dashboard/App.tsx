import { useQuery } from '@tanstack/react-query';
import type { Subscription } from '@/types';
import SubscriptionGrid from './components/SubscriptionGrid';

async function fetchSubscriptions(): Promise<Subscription[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_ALL_SUBSCRIPTIONS' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response?.subscriptions || []);
    });
  });
}

function App() {
  const { data: subscriptions, isLoading, error, refetch } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
  });

  const handleScanInactivity = () => {
    chrome.runtime.sendMessage({ type: 'SCAN_INACTIVITY' });
    // Refetch periodically to show updates
    const interval = setInterval(() => refetch(), 2000);
    setTimeout(() => clearInterval(interval), 60000); // Stop after 1 min
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-subzero-400 flex items-center gap-3">
          🧊 SubZero
        </h1>
        <p className="text-slate-400 mt-2">
          Your surgical YouTube subscription manager.
        </p>
      </header>

      {/* Actions Bar */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleScanInactivity}
          className="px-6 py-3 bg-subzero-600 hover:bg-subzero-700 text-white rounded-lg font-semibold transition-colors"
        >
          🔍 Scan Inactivity
        </button>
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      {subscriptions && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={subscriptions.length} color="text-white" />
          <StatCard
            label="Ghosts (>1yr)"
            value={subscriptions.filter((s) => s.activityStatus === 'ghost').length}
            color="text-ghost"
          />
          <StatCard
            label="Dormant (>6mo)"
            value={subscriptions.filter((s) => s.activityStatus === 'dormant').length}
            color="text-dormant"
          />
          <StatCard
            label="Active"
            value={subscriptions.filter((s) => s.activityStatus === 'active').length}
            color="text-active"
          />
        </div>
      )}

      {/* Main Content */}
      {isLoading && <p className="text-slate-400">Loading subscriptions...</p>}
      {error && <p className="text-red-500">Error: {(error as Error).message}</p>}
      {subscriptions && <SubscriptionGrid subscriptions={subscriptions} />}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default App;
