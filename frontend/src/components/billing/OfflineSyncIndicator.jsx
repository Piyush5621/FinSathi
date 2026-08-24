import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import {
  subscribeToSyncState,
  syncOfflineSales,
  retryFailedBills,
  getOfflineSales,
  clearSyncedBills
} from '../../services/offlineSyncService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export default function OfflineSyncIndicator() {
  const [stats, setStats] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    syncingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    totalCount: 0,
    lastSyncTime: null
  });

  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToSyncState((newStats) => {
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenQueue = async () => {
    const items = await getOfflineSales();
    setQueueItems(items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setShowQueueModal(true);
  };

  const handleManualSync = async () => {
    await syncOfflineSales();
    const items = await getOfflineSales();
    setQueueItems(items);
  };

  const handleRetryFailed = async () => {
    await retryFailedBills();
    const items = await getOfflineSales();
    setQueueItems(items);
  };

  const handleClearSynced = async () => {
    await clearSyncedBills();
    const items = await getOfflineSales();
    setQueueItems(items);
  };

  const hasQueue = stats.pendingCount > 0 || stats.failedCount > 0 || stats.syncedCount > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Online / Offline Status Badge */}
        <div
          onClick={handleOpenQueue}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
            stats.isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 animate-pulse'
          }`}
          title="Click to view offline billing sync queue"
        >
          {stats.isOnline ? (
            <Wifi size={13} className="text-emerald-600" />
          ) : (
            <WifiOff size={13} className="text-amber-600" />
          )}
          <span>{stats.isOnline ? 'Online' : 'Offline Mode'}</span>

          {/* Queue Count Pills */}
          {stats.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-md text-[10px] font-black">
              {stats.pendingCount} Pending
            </span>
          )}

          {stats.failedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded-md text-[10px] font-black">
              {stats.failedCount} Failed
            </span>
          )}

          {stats.isSyncing && (
            <RefreshCw size={11} className="animate-spin text-brand-blue ml-0.5" />
          )}
        </div>

        {/* Quick Sync Button if pending or failed exist and online */}
        {stats.isOnline && (stats.pendingCount > 0 || stats.failedCount > 0) && (
          <button
            onClick={handleManualSync}
            disabled={stats.isSyncing}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50"
            title="Synchronize offline bills now"
          >
            <RefreshCw size={11} className={stats.isSyncing ? 'animate-spin' : ''} />
            <span>{stats.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>

      {/* Queue Details Modal */}
      {showQueueModal && (
        <Modal
          isOpen={showQueueModal}
          onClose={() => setShowQueueModal(false)}
          title="Offline POS Sync Queue"
        >
          <div className="space-y-4">
            {/* Header Summary */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                <span className="block text-lg font-black">{stats.pendingCount}</span>
                <span className="text-[10px] text-amber-600 uppercase">Pending</span>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
                <span className="block text-lg font-black">{stats.syncingCount}</span>
                <span className="text-[10px] text-blue-600 uppercase">Syncing</span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                <span className="block text-lg font-black">{stats.syncedCount}</span>
                <span className="text-[10px] text-emerald-600 uppercase">Synced</span>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                <span className="block text-lg font-black">{stats.failedCount}</span>
                <span className="text-[10px] text-rose-600 uppercase">Failed</span>
              </div>
            </div>

            {/* List of Queued Bills */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {queueItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <CheckCircle2 size={24} className="mx-auto mb-1 text-slate-300" />
                  <p>Sync queue is empty.</p>
                  <p className="text-xs text-slate-400 mt-0.5">All bills are synced with the server.</p>
                </div>
              ) : (
                queueItems.map((item) => (
                  <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{item.invoice_no}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Total: ₹{Number(item.payload?.total || 0).toLocaleString('en-IN')} • {item.payload?.items?.length || 0} items
                      </div>
                      {item.error_message && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 bg-rose-50 p-1 rounded-md">
                          Error: {item.error_message}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.status === 'synced' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md text-[10px]">
                          <CheckCircle2 size={10} /> Synced
                        </span>
                      )}
                      {item.status === 'syncing' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[10px]">
                          <RefreshCw size={10} className="animate-spin" /> Syncing
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-md text-[10px]">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px]">
                          <AlertCircle size={10} /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              {stats.syncedCount > 0 ? (
                <button
                  type="button"
                  onClick={handleClearSynced}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> Clear Synced
                </button>
              ) : <div />}

              <div className="flex gap-2">
                {stats.failedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetryFailed}
                    disabled={stats.isSyncing || !stats.isOnline}
                    className="text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    Retry Failed
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleManualSync}
                  disabled={stats.isSyncing || !stats.isOnline || (stats.pendingCount === 0 && stats.failedCount === 0)}
                  className="bg-brand-blue text-white"
                >
                  {stats.isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
