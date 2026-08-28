/* ============================================================
   PULAU UBIN HEALTH CHECK — Recommendation Engine
   ------------------------------------------------------------
   Deterministic, rule-based recommendations. NO generative AI.
   Wording is neutral, non-judgemental and non-diagnostic.
   Significant findings (e.g. very high BP) are prioritised.
   ============================================================ */

/* ---- Per-domain recommendations ---------------------------------- */

function getBMIRecommendation(bmiResult) {
    if (!bmiResult || !bmiResult.classification) {
        return "Adult BMI classification is not appropriate for this age group.";
    }
    switch (bmiResult.classification.key) {
        case "healthy":
            return "Continue maintaining regular physical activity and a balanced diet.";
        case "underweight":
            return "Consider a balanced diet with adequate energy and protein. Weight trends over time are more informative than a single reading; discuss ongoing low weight with a healthcare professional if relevant.";
        case "increased":
            return "Consider maintaining a healthy energy balance through regular physical activity and dietary quality. Weight trends over time are more informative than a single reading.";
        case "high":
            return "Consider regular physical activity and attention to dietary quality. BMI is one indicator; discussing weight and overall health with a healthcare professional can be helpful.";
        default:
            return "";
    }
}

function getBodyFatRecommendation(bodyFatResult) {
    if (!bodyFatResult) return "";
    switch (bodyFatResult.key) {
        case "healthy":
            return "Your body-fat percentage is within the recommended reference range for your age and sex. Continue regular activity and balanced nutrition.";
        case "low":
            return "Your body-fat percentage is below the reference range for your age and sex. If this is unexpected, consider discussing it with a healthcare professional.";
        case "elevated":
            return "Consider regular aerobic and resistance exercise together with an appropriate balanced diet. Body composition changes gradually over time.";
        case "high":
            return "Consider regular aerobic and resistance exercise together with an appropriate balanced diet. Body-fat percentage is one indicator and is best considered alongside other measures.";
        default:
            return "";
    }
}

function getBloodPressureRecommendation(bpResult) {
    if (!bpResult) return "";
    switch (bpResult.key) {
        case "normal":
            return "Your blood pressure reading is within the normal range for this measurement. Continue regular activity and a balanced diet.";
        case "elevated":
        case "stage1":
        case "stage2":
            return "Consider monitoring blood pressure regularly, maintaining physical activity, moderating sodium intake and discussing persistent elevated readings with a healthcare professional.";
        case "crisis":
            return "This reading is very high. Recheck after resting quietly. If it remains extremely high, or symptoms such as chest pain, severe headache, shortness of breath, weakness, confusion or visual changes occur, seek urgent medical attention.";
        default:
            return "";
    }
}

function getHeartRateRecommendation(hrResult) {
    if (!hrResult) return "";
    switch (hrResult.key) {
        case "typical":
            return "Your resting heart rate is within the typical adult range.";
        case "below":
            return "A resting heart rate below the typical adult range can be normal, particularly in fit individuals or with certain medications. If accompanied by dizziness or fatigue, consider discussing it with a healthcare professional.";
        case "above":
            return "Rest quietly and consider repeating the measurement. Resting heart rate can be affected by activity, stress, caffeine, illness and medication.";
        default:
            return "";
    }
}

/* ---- Overall recommendation (prioritised) ------------------------ */
/*
   Priority order (per spec §39):
     1. Blood pressure concern if significant
     2. Resting heart rate concern
     3. Body fat concern
     4. BMI concern
     5. General wellness
   A single mild issue must not produce an alarming overall status.
*/
function getOverallRecommendation(results) {
    const bp = results.bpResult;
    const hr = results.hrResult;
    const bf = results.bodyFatResult;
    const bmi = results.bmiResult;

    // 1. Significant blood pressure
    if (bp && bp.key === "crisis") {
        return "A very high blood pressure reading was recorded. Please recheck after resting, and seek prompt medical attention if it remains very high or if concerning symptoms are present.";
    }
    if (bp && (bp.key === "stage2" || bp.key === "stage1")) {
        return "Your blood pressure reading is above the normal range for this measurement. Consider regular monitoring, physical activity and moderating sodium intake, and discuss persistent readings with a healthcare professional.";
    }

    // 2. Resting heart rate
    if (hr && hr.key === "above") {
        return "Your resting heart rate was above the typical adult range. Rest quietly and repeat the measurement; it can be influenced by activity, stress, caffeine, illness and medication.";
    }

    // 3. Body fat
    if (bf && (bf.key === "high" || bf.key === "elevated")) {
        return "Your body-fat percentage was above the recommended reference range for your age and sex. Consider regular aerobic and resistance exercise together with a balanced diet.";
    }

    // 4. BMI
    if (bmi && bmi.classification && (bmi.classification.key === "high" || bmi.classification.key === "increased")) {
        return "Your BMI was above the recommended Asian adult range. Consider maintaining a healthy energy balance through regular physical activity and dietary quality; weight trends over time are more informative than a single reading.";
    }

    // 5. General wellness
    return "Your current screening indicators are generally within the reference ranges used by this application. Continue maintaining an active lifestyle, balanced nutrition and regular health screening.";
}

/* ---- Overall priority flag --------------------------------------- */
/*
   GREEN  : within reference range
   AMBER  : worth monitoring / lifestyle attention
   RED    : potentially significant reading requiring follow-up
            (reserved for genuinely important values — e.g. BP crisis)
*/
function getOverallFlag(results) {
    const flags = [];
    if (results.bmiResult && results.bmiResult.classification) flags.push(results.bmiResult.classification.flag);
    if (results.bodyFatResult) flags.push(results.bodyFatResult.flag);
    if (results.bpResult) flags.push(results.bpResult.flag);
    if (results.hrResult) flags.push(results.hrResult.flag);

    if (flags.includes("red")) return "red";
    if (flags.includes("amber")) return "amber";
    return "green";
}

Object.assign(window, {
    getBMIRecommendation, getBodyFatRecommendation,
    getBloodPressureRecommendation, getHeartRateRecommendation,
    getOverallRecommendation, getOverallFlag
});
