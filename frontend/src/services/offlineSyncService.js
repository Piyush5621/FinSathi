import API from './apiClient';
import toast from 'react-hot-toast';

const DB_NAME = 'karobar_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_sales';

let dbPromise = null;
let isSyncing = false;
let listeners = [];
let lastSyncTime = null;

/**
 * Open or initialize IndexedDB
 */
function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('idempotency_key', 'idempotency_key', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[OfflineSync] IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Execute an IndexedDB transaction
 */
async function performDBOperation(mode, operation) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], mode);
    const store = tx.objectStore(STORE_NAME);
    let result = null;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    try {
      result = operation(store);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Notify all subscribers of state changes
 */
function notifySubscribers() {
  getSyncStats().then(stats => {
    listeners.forEach(cb => {
      try { cb(stats); } catch (e) { console.error(e); }
    });
  }).catch(() => {});
}

/**
 * Queue a sale in IndexedDB when offline or on network failure
 */
export async function queueOfflineSale(salePayload) {
  const clientId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const invoiceNo = `OFF-${Date.now().toString().slice(-6)}`;

  const offlineRecord = {
    id: clientId,
    client_id: clientId,
    idempotency_key: clientId,
    invoice_no: invoiceNo,
    payload: {
      ...salePayload,
      invoice_no: invoiceNo,
      idempotency_key: clientId,
      is_offline: true,
      client_id: clientId
    },
    status: 'pending', // 'pending' | 'syncing' | 'synced' | 'failed'
    created_at: new Date().toISOString(),
    error_message: null,
    server_sale_id: null,
    synced_at: null
  };

  await performDBOperation('readwrite', (store) => {
    store.put(offlineRecord);
  });

  notifySubscribers();

  // If online, try syncing in background
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncOfflineSales().catch(err => console.warn('[OfflineSync] Auto-sync failed:', err));
  }

  return offlineRecord;
}

/**
 * Get all offline sales
 */
export async function getOfflineSales() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Get current sync statistics
 */
export async function getSyncStats() {
  const sales = await getOfflineSales();
  const pending = sales.filter(s => s.status === 'pending');
  const syncing = sales.filter(s => s.status === 'syncing');
  const synced = sales.filter(s => s.status === 'synced');
  const failed = sales.filter(s => s.status === 'failed');

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing,
    pendingCount: pending.length,
    syncingCount: syncing.length,
    syncedCount: synced.length,
    failedCount: failed.length,
    totalCount: sales.length,
    lastSyncTime
  };
}

/**
 * Process and synchronize all pending offline bills
 */
export async function syncOfflineSales() {
  if (isSyncing) return { isSyncing: true, syncedCount: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { isOnline: false, syncedCount: 0 };

  isSyncing = true;
  notifySubscribers();

  let successCount = 0;
  let errorCount = 0;

  try {
    const allSales = await getOfflineSales();
    // Prioritize pending and failed bills in FIFO order
    const toSync = allSales
      .filter(s => s.status === 'pending' || s.status === 'syncing')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const bill of toSync) {
      // Check online state before each request
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      // Mark status as syncing
      await performDBOperation('readwrite', store => {
        bill.status = 'syncing';
        store.put(bill);
      });
      notifySubscribers();

      try {
        const response = await API.post('/sales', bill.payload);
        const serverSale = response.data;

        // Mark as synced
        await performDBOperation('readwrite', store => {
          bill.status = 'synced';
          bill.server_sale_id = serverSale?.id || bill.id;
          bill.synced_at = new Date().toISOString();
          bill.error_message = null;
          store.put(bill);
        });

        successCount++;
        lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.error(`[OfflineSync] Sync failed for bill ${bill.id}:`, err);
        const isNetworkErr = !err.response || err.code === 'ERR_NETWORK';

        if (isNetworkErr) {
          // Reset to pending so it will retry next time online
          await performDBOperation('readwrite', store => {
            bill.status = 'pending';
            store.put(bill);
          });
          break; // Stop loop until connectivity stabilizes
        } else {
          // Check if response is 409 duplicate / already recorded
          if (err.response?.status === 409 && err.response?.data?.sale) {
            await performDBOperation('readwrite', store => {
              bill.status = 'synced';
              bill.server_sale_id = err.response.data.sale.id;
              bill.synced_at = new Date().toISOString();
              store.put(bill);
            });
            successCount++;
          } else {
            // Validation or Stock error: Mark as failed and preserve in IndexedDB
            const errorReason = err.response?.data?.error || err.response?.data?.message || err.message || 'Sync failed';
            await performDBOperation('readwrite', store => {
              bill.status = 'failed';
              bill.error_message = errorReason;
              store.put(bill);
            });
            errorCount++;
          }
        }
      }
    }
  } finally {
    isSyncing = false;
    notifySubscribers();

    if (successCount > 0) {
      toast.success(`${successCount} offline bill${successCount > 1 ? 's' : ''} synced successfully!`, {
        id: 'offline-sync-success',
        duration: 4000
      });
    }
  }

  return { successCount, errorCount };
}

/**
 * Retry all failed bills
 */
export async function retryFailedBills() {
  const allSales = await getOfflineSales();
  const failed = allSales.filter(s => s.status === 'failed');

  for (const bill of failed) {
    await performDBOperation('readwrite', store => {
      bill.status = 'pending';
      bill.error_message = null;
      store.put(bill);
    });
  }

  notifySubscribers();
  return syncOfflineSales();
}

/**
 * Clear synced bills from IndexedDB
 */
export async function clearSyncedBills() {
  const allSales = await getOfflineSales();
  const synced = allSales.filter(s => s.status === 'synced');

  for (const bill of synced) {
    await performDBOperation('readwrite', store => {
      store.delete(bill.id);
    });
  }

  notifySubscribers();
}

/**
 * Subscribe to sync state changes
 */
export function subscribeToSyncState(callback) {
  listeners.push(callback);
  getSyncStats().then(stats => callback(stats)).catch(() => {});
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Initialize automatic event listeners
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Browser online event fired. Syncing queued bills...');
    syncOfflineSales().catch(e => console.warn(e));
  });

  // Trigger sync on initial startup if online
  if (navigator.onLine) {
    setTimeout(() => {
      syncOfflineSales().catch(e => console.warn(e));
    }, 1000);
  }
}
