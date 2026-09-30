import API, { setAccessToken } from "../services/apiClient";

/**
 * Universal logout helper
 * Clears backend HttpOnly refresh cookie, resets in-memory access tokens,
 * wipes local credentials, and hard-redirects to login to reset all application state.
 */
export const logoutUser = async () => {
  try {
    // 1. Invalidate session on server and clear HttpOnly refresh cookie
    await API.post("/auth/logout").catch(() => {});
  } catch (e) {
    // Ignore error if network fails or server unreachable
  } finally {
    // 2. Wipe in-memory token from axios client
    setAccessToken(null);

    // 3. Clear all authentication and tenant storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("activeStoreId");
    localStorage.removeItem("store");
    localStorage.removeItem("sidebar_collapsed");
    sessionStorage.clear();

    // 4. Clean hard navigation to login page (resets React state, Query caches, stores)
    window.location.href = "/login";
  }
};
