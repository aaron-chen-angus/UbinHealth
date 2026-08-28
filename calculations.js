/* ============================================================
   PULAU UBIN HEALTH CHECK — Pure Calculations
   ------------------------------------------------------------
   Deterministic numeric helpers only. No classification logic
   (that lives in classifications.js) and no DOM access.
   ============================================================ */

/**
 * Current age from year of birth, using the current calendar year.
 * (Age approximated from year only, per spec — no month/day.)
 */
function calculateAge(yearOfBirth) {
    const currentYear = new Date().getFullYear();
    return currentYear - yearOfBirth;
}

/**
 * BMI = weight(kg) / (height(m))^2, rounded to one decimal place.
 */
function calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
}

/**
 * Difference (device-reported minus estimated) BMR, in kcal/day.
 * Returns null if either value is missing. Purely informational.
 */
function bmrDifference(deviceBmr, estimatedBmr) {
    if (deviceBmr == null || estimatedBmr == null) return null;
    return Math.round(deviceBmr - estimatedBmr);
}

/**
 * Map a value onto a 0-100% position within [min, max], clamped.
 * Used for gauge markers.
 */
function gaugePosition(value, min, max) {
    const pct = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, pct));
}

/**
 * Generate a unique session id, e.g. PUHC-20260828-193011-AB12
 */
function generateSessionId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const datePart =
        now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    const timePart =
        pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${CONFIG.sessionPrefix}-${datePart}-${timePart}-${rand}`;
}

Object.assign(window, {
    calculateAge, calculateBMI, bmrDifference, gaugePosition, generateSessionId
});
