/* ============================================================
   PULAU UBIN HEALTH CHECK — Local Storage
   ------------------------------------------------------------
   All data stays in the browser's localStorage unless the
   optional Google Sheets integration is explicitly enabled.
   Saved results do not interfere with a new assessment (state
   is held separately in app.js).
   ============================================================ */

const STORAGE = {
    /** Return all saved results (array). */
    getAll() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to read saved results:", e);
            return [];
        }
    },

    /** Save one result object. Returns true on success. */
    save(result) {
        try {
            const all = this.getAll();
            all.push(result);
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(all));
            return true;
        } catch (e) {
            console.error("Failed to save result:", e);
            return false;
        }
    },

    /** Delete a single saved result by sessionId. */
    deleteOne(sessionId) {
        try {
            const all = this.getAll().filter((r) => r.sessionId !== sessionId);
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(all));
            return true;
        } catch (e) {
            console.error("Failed to delete result:", e);
            return false;
        }
    },

    /** Delete ALL saved results. */
    deleteAll() {
        try {
            localStorage.removeItem(CONFIG.storageKey);
            return true;
        } catch (e) {
            console.error("Failed to clear results:", e);
            return false;
        }
    },

    /** Count of saved results. */
    count() {
        return this.getAll().length;
    }
};

window.STORAGE = STORAGE;
