/* ==========================================================================
   Persistence seam — the single swap-point for where chart data is stored.
   Today: localStorage under key `seatery.charts.v1`.
   Roadmap: in-memory -> localStorage -> Supabase (cross-device async handoff);
   only this file changes at each step. Signatures are async-shaped so a future
   network-backed implementation needs no call-site changes.

   Shape persisted: { charts: [{id,name,kind,state:{...}}], activeId }
   ========================================================================== */
(function () {
  const KEY = "seatery.charts.v1";

  // All access is wrapped: quota/privacy-mode failures degrade to in-memory
  // (the app keeps working for the session) rather than throwing.
  function loadAll() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.charts)) return null;
      return { charts: data.charts, activeId: data.activeId || null };
    } catch (e) {
      console.warn("Seatery: could not read saved charts —", e);
      return null;
    }
  }

  function save(payload) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({
        charts: payload.charts || [],
        activeId: payload.activeId || null,
      }));
      return true;
    } catch (e) {
      console.warn("Seatery: could not save charts (storage full or unavailable) —", e);
      return false;
    }
  }

  function clear() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* no-op */ }
  }

  window.Store = { loadAll, save, clear, KEY };
})();
