import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UnsubscribeProgressModalProps {
  isOpen: boolean;
  processed: number;
  total: number;
  currentChannelId: string;
  isComplete: boolean;
  lastResult?: {
    success: boolean;
    error?: string;
  };
  onClose: () => void;
}

export function UnsubscribeProgressModal({
  isOpen,
  processed,
  total,
  currentChannelId,
  isComplete,
  lastResult,
  onClose,
}: UnsubscribeProgressModalProps) {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Batch Unsubscribe Complete
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              Unsubscribing...
            </>
          )}
        </h2>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Progress</span>
            <span>{processed} / {total}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {!isComplete && (
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-300">
              Processing channel ID: <span className="font-mono text-xs text-slate-500">{currentChannelId}</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Please keep the browser open. We are simulating human interactions to ensure safety.
            </p>
          </div>
        )}

        {isComplete && lastResult && !lastResult.success && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="text-sm text-red-200">
              <p className="font-semibold text-red-400">Some errors occurred during the process.</p>
              <p>{lastResult.error}</p>
            </div>
          </div>
        )}

        {isComplete && (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
