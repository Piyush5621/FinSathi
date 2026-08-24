import { lazy } from 'react';

/**
 * Wraps React.lazy with automatic single-retry reload for stale chunk recovery.
 * When a new deployment occurs, older chunk hashes become 404, prompting a clean reload.
 * 
 * @param {Function} componentImportFn - Dynamic import function, e.g. () => import('./MyPage')
 * @returns {React.LazyExoticComponent}
 */
export function lazyWithRetry(componentImportFn) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem('karobar_chunk_reload') === 'true';

    try {
      const component = await componentImportFn();
      window.sessionStorage.removeItem('karobar_chunk_reload');
      return component;
    } catch (error) {
      console.warn('[Karobar Dynamic Import] Chunk load failed:', error?.message);

      const isChunkError = 
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('MIME type') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('text/html');

      if (!pageHasBeenForceRefreshed && isChunkError) {
        window.sessionStorage.setItem('karobar_chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {}); // Pause while page reloads
      }

      throw error;
    }
  });
}
