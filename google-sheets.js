/* ============================================================
   PULAU UBIN HEALTH CHECK — Google Sheets Integration (FUTURE)
   ------------------------------------------------------------
   Isolated integration layer. With CONFIG.googleSheets.enabled
   = false (default) the app works fully offline. When enabled
   later, results are POSTed to a Google Apps Script Web App.

   NO live endpoint is invented here. See google-apps-script.gs
   for the matching server-side receiver, and README §16.
   ============================================================ */

const GOOGLE_SHEETS = {
    /**
     * Submit a full result object to Google Sheets.
     * Safe no-op when integration is disabled.
     */
    async submitResultToGoogleSheets(result) {
        if (!CONFIG.googleSheets.enabled || !CONFIG.googleSheets.webAppUrl) {
            console.log("Google Sheets integration is disabled or URL not configured.");
            return { success: false, reason: "disabled" };
        }

        const payload = this.formatForSheet(result);

        try {
            // text/plain + no-cors so the body is delivered; Apps Script parses
            // JSON from e.postData.contents regardless of content type.
            await fetch(CONFIG.googleSheets.webAppUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(payload)
            });
            // no-cors gives an opaque response; if no error was thrown, assume ok
            return { success: true };
        } catch (error) {
            console.error("Google Sheets submission error:", error);
            return { success: false, reason: error.message };
        }
    },

    /**
     * Flatten the nested result object into a single row of named
     * fields. Field names match the README Data Dictionary and the
     * headers in google-apps-script.gs. This shape is intentionally
     * flat and analysis-friendly (R / R Shiny ready).
     */
    formatForSheet(r) {
        const p = r.participant || {};
        const a = r.anthropometry || {};
        const b = r.bodyComposition || {};
        const c = r.cardiovascular || {};
        const rec = r.recommendations || {};

        return {
            sessionId: r.sessionId,
            timestamp: r.timestamp,

            name: p.name,
            gender: p.gender,
            yearOfBirth: p.yearOfBirth,
            age: p.age,
            location: p.location,

            heightCm: a.heightCm,
            weightKg: a.weightKg,
            bmi: a.bmi,
            bmiClassification: a.bmiClassification,

            bodyFatPercent: b.bodyFatPercent,
            bodyFatClassification: b.bodyFatClassification,
            bmrKcalDay: b.bmrKcalDay,
            estimatedBmrKcalDay: b.estimatedBmrKcalDay,
            bmrDifference: b.bmrDifference,

            systolicBP: c.systolicBP,
            diastolicBP: c.diastolicBP,
            bloodPressureClassification: c.bloodPressureClassification,
            restingHeartRate: c.restingHeartRate,
            restingHeartRateClassification: c.restingHeartRateClassification,

            bmiRecommendation: rec.bmiRecommendation,
            bodyFatRecommendation: rec.bodyFatRecommendation,
            bloodPressureRecommendation: rec.bloodPressureRecommendation,
            heartRateRecommendation: rec.heartRateRecommendation,
            overallRecommendation: rec.overallRecommendation,
            overallFlag: r.overallFlag
        };
    }
};

window.GOOGLE_SHEETS = GOOGLE_SHEETS;
