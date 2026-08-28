/* ============================================================
   PULAU UBIN HEALTH CHECK — Scientific Classifications
   ------------------------------------------------------------
   ALL scientific thresholds live in this single file so they can
   be audited against the sources documented in README.md.

   Each block cites its source. No threshold here is fabricated.
   Where a classification is context-dependent or not fully
   justified, wording is intentionally neutral / non-diagnostic.
   ============================================================ */

/* ------------------------------------------------------------
   1. ASIAN ADULT BMI CLASSIFICATION
   ------------------------------------------------------------
   Source: WHO Expert Consultation. Appropriate body-mass index
   for Asian populations and its implications for policy and
   intervention strategies. The Lancet. 2004;363(9403):157-163.
   doi:10.1016/S0140-6736(03)15268-3

   Cut-offs (public-health action points for Asian adults):
     Underweight             : BMI < 18.5
     Healthy range           : 18.5 – 22.9
     Increased risk          : 23.0 – 27.4
     High risk               : >= 27.5

   These apply to ADULTS only (age >= CONFIG.adultMinAge). They are
   NOT sex-specific — the same cut-offs apply to males and females.
   ------------------------------------------------------------ */
const BMI_ASIAN_ADULT = [
    {
        key: "underweight",
        label: "Underweight",
        max: 18.5, // BMI < 18.5
        flag: "amber",
        color: "#6ba3c4", // soft blue
        icon: "🍃",
        interpretation:
            "Your BMI is below the recommended Asian adult range. BMI is only one indicator and does not directly measure body fat or muscle."
    },
    {
        key: "healthy",
        label: "Healthy Range",
        min: 18.5,
        max: 23.0, // 18.5 to 22.9
        flag: "green",
        color: "#5a9367", // green
        icon: "🌿",
        interpretation:
            "Your BMI is within the recommended Asian adult range. BMI is one indicator and is best considered alongside body composition and other measures."
    },
    {
        key: "increased",
        label: "Increased Risk",
        min: 23.0,
        max: 27.5, // 23.0 to 27.4
        flag: "amber",
        color: "#d9a441", // amber
        icon: "🌾",
        interpretation:
            "Your BMI is above the recommended Asian adult range. BMI is only one indicator and does not directly measure body fat. Weight trends over time are more informative than a single reading."
    },
    {
        key: "high",
        label: "High Risk",
        min: 27.5, // >= 27.5
        flag: "amber",
        color: "#c97b63", // coral (not harsh red)
        icon: "🌳",
        interpretation:
            "Your BMI is well above the recommended Asian adult range. BMI is one screening indicator and is best interpreted together with body composition and clinical assessment."
    }
];

// Boundaries used for the BMI gauge visualisation (kg/m^2)
const BMI_GAUGE = { min: 15, max: 35, marks: [18.5, 23.0, 27.5] };

/**
 * Classify an adult BMI value using the WHO Asian cut-offs.
 * Returns null when age is below the adult range (handled by caller).
 */
function classifyBMI(bmi, age) {
    if (age != null && age < CONFIG.adultMinAge) return null;
    for (const band of BMI_ASIAN_ADULT) {
        const aboveMin = band.min == null || bmi >= band.min;
        const belowMax = band.max == null || bmi < band.max;
        if (aboveMin && belowMax) return band;
    }
    return BMI_ASIAN_ADULT[BMI_ASIAN_ADULT.length - 1];
}

/* ------------------------------------------------------------
   2. BODY FAT PERCENTAGE REFERENCE
   ------------------------------------------------------------
   Source: Gallagher D, Heymsfield SB, Heo M, Jebb SA, Murgatroyd PR,
   Sakamoto Y. Healthy percentage body fat ranges: an approach for
   developing guidelines based on body mass index. Am J Clin Nutr.
   2000;72(3):694-701. doi:10.1093/ajcn/72.3.694

   The Gallagher tables give sex- and age-banded healthy body-fat
   ranges. We use three age bands supported by that paper (20-39,
   40-59, 60-79) and derive four screening categories relative to
   the published healthy range:
     Low       : below the healthy range
     Healthy   : within the healthy range (recommended)
     Elevated  : above healthy but below the high threshold
     High      : at/above the high threshold

   Ranges below are the approximate healthy limits from Gallagher
   et al. (2000). Wording is non-diagnostic; body fat interpretation
   varies with age and sex.
   ------------------------------------------------------------ */
const BODY_FAT_REFERENCE = {
    male: [
        { ageMin: 20, ageMax: 39, healthyLow: 8,  healthyHigh: 20, highThreshold: 25 },
        { ageMin: 40, ageMax: 59, healthyLow: 11, healthyHigh: 22, highThreshold: 28 },
        { ageMin: 60, ageMax: 79, healthyLow: 13, healthyHigh: 25, highThreshold: 30 }
    ],
    female: [
        { ageMin: 20, ageMax: 39, healthyLow: 21, healthyHigh: 33, highThreshold: 39 },
        { ageMin: 40, ageMax: 59, healthyLow: 23, healthyHigh: 34, highThreshold: 40 },
        { ageMin: 60, ageMax: 79, healthyLow: 24, healthyHigh: 36, highThreshold: 42 }
    ]
};

const BODY_FAT_CATEGORY_META = {
    low:      { label: "Low",       flag: "amber", color: "#6ba3c4", icon: "🍃" },
    healthy:  { label: "Healthy / Recommended", flag: "green", color: "#5a9367", icon: "🌿" },
    elevated: { label: "Elevated",  flag: "amber", color: "#d9a441", icon: "🌾" },
    high:     { label: "High",      flag: "amber", color: "#c97b63", icon: "🌳" }
};

/**
 * Pick the age band for a sex. Falls back to the nearest band when the
 * participant's age is outside 20-79 (still adult). Returns null if not adult.
 */
function getBodyFatBand(gender, age) {
    if (age == null || age < CONFIG.adultMinAge) return null;
    const sex = gender === "Male" ? "male" : "female";
    const bands = BODY_FAT_REFERENCE[sex];
    for (const b of bands) {
        if (age >= b.ageMin && age <= b.ageMax) return { sex, band: b };
    }
    // Age outside 20-79: use nearest band (youngest if <20 handled earlier, oldest if >79)
    if (age < bands[0].ageMin) return { sex, band: bands[0] };
    return { sex, band: bands[bands.length - 1] };
}

/**
 * Classify body-fat % against the Gallagher healthy range for sex/age.
 * Returns { key, label, flag, color, icon, band, interpretation } or null.
 */
function classifyBodyFat(bodyFatPct, gender, age) {
    const picked = getBodyFatBand(gender, age);
    if (!picked) return null;
    const b = picked.band;

    let key;
    if (bodyFatPct < b.healthyLow) key = "low";
    else if (bodyFatPct <= b.healthyHigh) key = "healthy";
    else if (bodyFatPct < b.highThreshold) key = "elevated";
    else key = "high";

    const meta = BODY_FAT_CATEGORY_META[key];
    return {
        key,
        ...meta,
        band: b,
        interpretation:
            "Body-fat percentage provides information about body composition that BMI does not capture. Interpretation varies with age and sex; this is a screening reference, not a diagnosis."
    };
}

/* ------------------------------------------------------------
   3. BASAL METABOLIC RATE — Mifflin-St Jeor (optional estimate)
   ------------------------------------------------------------
   Source: Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA,
   Koh YO. A new predictive equation for resting energy expenditure
   in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.
   doi:10.1093/ajcn/51.2.241

   Male   : BMR = 10W + 6.25H - 5A + 5
   Female : BMR = 10W + 6.25H - 5A - 161
     W = weight (kg), H = height (cm), A = age (years)

   BMR is NOT a disease-risk indicator. It is an estimate of energy
   expenditure at rest. Differences between device-reported and
   estimated BMR are NOT a diagnosis.
   ------------------------------------------------------------ */
function estimateBMR_MifflinStJeor(weightKg, heightCm, age, gender) {
    if (weightKg == null || heightCm == null || age == null || !gender) return null;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = gender === "Male" ? base + 5 : base - 161;
    return Math.round(bmr);
}

/* ------------------------------------------------------------
   4. BLOOD PRESSURE CLASSIFICATION — ACC/AHA 2017
   ------------------------------------------------------------
   Source: Whelton PK, Carey RM, Aronow WS, et al. 2017
   ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/ASH/ASPC/NMA/PCNA Guideline for
   the Prevention, Detection, Evaluation, and Management of High
   Blood Pressure in Adults. Hypertension. 2018;71(6):e13-e115.
   doi:10.1161/HYP.0000000000000065

   Categories (single office reading):
     Normal        : SBP < 120 AND DBP < 80
     Elevated      : SBP 120-129 AND DBP < 80
     Stage 1 HTN   : SBP 130-139 OR DBP 80-89
     Stage 2 HTN   : SBP >= 140 OR DBP >= 90
     Crisis-level  : SBP > 180 AND/OR DBP > 120

   PRECEDENCE: when systolic and diastolic fall into different
   categories, the HIGHER-RISK category is used (see classifyBP).

   A single reading does not diagnose hypertension.
   ------------------------------------------------------------ */
const BP_CATEGORIES = {
    normal:   { rank: 0, label: "Normal",              flag: "green", color: "#5a9367", icon: "🌿" },
    elevated: { rank: 1, label: "Elevated",            flag: "amber", color: "#d9a441", icon: "🌾" },
    stage1:   { rank: 2, label: "Hypertension Stage 1", flag: "amber", color: "#d99441", icon: "🍂" },
    stage2:   { rank: 3, label: "Hypertension Stage 2", flag: "amber", color: "#c97b63", icon: "🌳" },
    crisis:   { rank: 4, label: "Hypertensive Crisis-Level Reading", flag: "red", color: "#b5503a", icon: "⚠️" }
};

// Gauge marks for the BP visualisation (systolic scale)
const BP_GAUGE = { min: 90, max: 190, marks: [120, 130, 140, 180] };

/**
 * Classify a single BP reading using ACC/AHA 2017 with higher-risk
 * category precedence between systolic and diastolic.
 */
function classifyBP(systolic, diastolic) {
    // Determine the systolic-implied category
    let sysCat;
    if (systolic > 180) sysCat = "crisis";
    else if (systolic >= 140) sysCat = "stage2";
    else if (systolic >= 130) sysCat = "stage1";
    else if (systolic >= 120) sysCat = "elevated";
    else sysCat = "normal";

    // Determine the diastolic-implied category
    let diaCat;
    if (diastolic > 120) diaCat = "crisis";
    else if (diastolic >= 90) diaCat = "stage2";
    else if (diastolic >= 80) diaCat = "stage1";
    else diaCat = "normal"; // ACC/AHA: elevated is defined by systolic only

    // Higher-risk category wins (precedence by rank)
    const chosenKey =
        BP_CATEGORIES[sysCat].rank >= BP_CATEGORIES[diaCat].rank ? sysCat : diaCat;

    const meta = BP_CATEGORIES[chosenKey];
    const isCrisis = chosenKey === "crisis";

    return {
        key: chosenKey,
        ...meta,
        isCrisis,
        interpretation:
            "Blood pressure classification is based on this measurement only. Hypertension diagnosis generally requires appropriate repeat measurements and clinical assessment.",
        crisisMessage: isCrisis
            ? "Very high blood pressure reading detected. Recheck the measurement after resting quietly. If the reading remains extremely high, or the person has symptoms such as chest pain, severe headache, shortness of breath, weakness, confusion or visual changes, seek urgent medical attention."
            : null
    };
}

/* ------------------------------------------------------------
   5. RESTING HEART RATE — general adult reference
   ------------------------------------------------------------
   General adult resting-heart-rate reference commonly cited by
   major clinical organisations (e.g. American Heart Association):
     Below typical resting range : < 60 bpm
     Typical adult resting range : 60 - 100 bpm
     Above typical resting range : > 100 bpm

   IMPORTANT: a rate below 60 is NOT automatically pathological
   (it can be normal in fit individuals or reflect medication).
   Wording is deliberately non-diagnostic. Applies to adults only.
   ------------------------------------------------------------ */
const RHR_CATEGORIES = {
    below:   { label: "Below typical adult resting range", flag: "amber", color: "#6ba3c4", icon: "🍃" },
    typical: { label: "Typical adult resting range",       flag: "green", color: "#5a9367", icon: "🌿" },
    above:   { label: "Above typical adult resting range", flag: "amber", color: "#d9a441", icon: "🌾" }
};

function classifyRestingHR(bpm, age) {
    if (age != null && age < CONFIG.adultMinAge) return null;
    let key;
    if (bpm < 60) key = "below";
    else if (bpm <= 100) key = "typical";
    else key = "above";

    const meta = RHR_CATEGORIES[key];
    let interpretation;
    if (key === "below") {
        interpretation =
            "A resting heart rate below the typical adult range can be normal, especially in physically fit individuals or with certain medications. One reading does not diagnose a condition.";
    } else if (key === "above") {
        interpretation =
            "A resting heart rate above the typical adult range can be affected by activity, stress, caffeine, illness and medication. Resting quietly and repeating the measurement is reasonable. One reading does not diagnose a condition.";
    } else {
        interpretation =
            "Your resting heart rate is within the typical adult range. Resting heart rate can vary with fitness, activity, stress and medication.";
    }
    return { key, ...meta, interpretation };
}

// Expose to global scope (non-module usage)
Object.assign(window, {
    BMI_ASIAN_ADULT, BMI_GAUGE, classifyBMI,
    BODY_FAT_REFERENCE, BODY_FAT_CATEGORY_META, getBodyFatBand, classifyBodyFat,
    estimateBMR_MifflinStJeor,
    BP_CATEGORIES, BP_GAUGE, classifyBP,
    RHR_CATEGORIES, classifyRestingHR
});
