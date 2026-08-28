/* ============================================================
   PULAU UBIN HEALTH CHECK — Configuration
   ------------------------------------------------------------
   Central configuration for the app. Nothing here contains
   scientific thresholds (those live in classifications.js).
   ============================================================ */

const CONFIG = {
    appName: "Pulau Ubin Health Check",
    subtitle: "Community Health Screening",
    version: "1.0.0",

    // Session ID prefix — e.g. PUHC-20260828-193011-AB12
    sessionPrefix: "PUHC",

    // Locations offered in the Demographics dropdown
    locations: ["Ubin Town Hall", "Ubin Jetty", "Village"],

    // Minimum adult age at which adult classifications (BMI / body fat /
    // blood pressure / resting HR) are considered appropriate. Below this,
    // the app refuses to apply adult interpretations. WHO Asian BMI and the
    // Gallagher body-fat reference are adult references.
    adultMinAge: 18,

    // Google Sheets integration (disabled by default — app works fully offline).
    // See google-sheets.js and google-apps-script.gs for the future workflow.
    googleSheets: {
        enabled: true,
        webAppUrl: "https://script.google.com/macros/s/AKfycbzdWmBP-r_K7LJK6ESo1UkZXWcLAL92DDm7CEJwh6rxZ4Kc8V4hIxLtezgxj-X2KQG5Ww/exec"
    },

    // localStorage key under which saved results are kept
    storageKey: "puhc_saved_results",

    // ----- INPUT SANITY RANGES -----------------------------------------
    // NOTE: These are PLAUSIBLE INPUT ranges used only to catch typos.
    // They are NOT diagnostic ranges. Values outside these prompt the user
    // to confirm rather than being silently rejected.
    inputRanges: {
        heightCm:      { min: 100, max: 230 },
        weightKg:      { min: 25,  max: 250 },
        bodyFatPct:    { min: 2,   max: 70 },
        bmrKcalDay:    { min: 500, max: 4000 },
        systolicBP:    { min: 60,  max: 260 },
        diastolicBP:   { min: 30,  max: 160 },
        restingHR:     { min: 30,  max: 220 }
    }
};

// Expose for non-module usage
window.CONFIG = CONFIG;
