# Pulau Ubin Health Check

A lightweight, mobile-first, static web application for **community health
screening** at Pulau Ubin. It records basic anthropometric and cardiovascular
measurements, applies **documented, evidence-based classifications**, and
produces a clear, non-diagnostic screening summary that can be printed, saved
locally, and optionally streamed to a Google Sheet for live analysis (including
an accompanying R Shiny dashboard).

Built with plain **HTML5 + CSS3 + vanilla JavaScript (ES6+)**. No frameworks,
no build step, no backend server of its own. Deployable directly to
**GitHub Pages**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Intended Users](#2-intended-users)
3. [Application Flow](#3-application-flow)
4. [Screens / Sections](#4-screens--sections)
5. [Scientific Basis (summary)](#5-scientific-basis-summary)
6. [BMI Formula](#6-bmi-formula)
7. [BMI Classification (Asian adults)](#7-bmi-classification-asian-adults)
8. [Body Fat Interpretation](#8-body-fat-interpretation)
9. [BMR Explanation & Estimation](#9-bmr-explanation--estimation)
10. [Blood Pressure Classification](#10-blood-pressure-classification)
11. [Resting Heart Rate Interpretation](#11-resting-heart-rate-interpretation)
12. [Age & Gender Handling](#12-age--gender-handling)
13. [Recommendation Logic](#13-recommendation-logic)
14. [Result Priority Flags](#14-result-priority-flags)
15. [Data Architecture](#15-data-architecture)
16. [Complete Data Dictionary](#16-complete-data-dictionary)
17. [Local Storage](#17-local-storage)
18. [Google Sheets Integration](#18-google-sheets-integration)
19. [R Shiny Analytics Dashboard](#19-r-shiny-analytics-dashboard)
20. [Project Structure](#20-project-structure)
21. [Running Locally](#21-running-locally)
22. [GitHub Pages Deployment](#22-github-pages-deployment)
23. [Mobile Compatibility](#23-mobile-compatibility)
24. [Accessibility](#24-accessibility)
25. [Data Privacy & Governance](#25-data-privacy--governance)
26. [Clinical / Scientific Limitations](#26-clinical--scientific-limitations)
27. [Testing](#27-testing)
28. [Troubleshooting](#28-troubleshooting)
29. [Future Development](#29-future-development)
30. [Key Scientific References](#30-key-scientific-references)
31. [Disclaimer](#31-disclaimer)

---

## 1. Project Overview

Pulau Ubin Health Check guides a participant (or a volunteer assisting them)
through five short steps and generates a screening summary with gentle,
rule-based recommendations. All processing happens in the browser. Data stay
local unless the optional Google Sheets integration is enabled, in which case
each saved result is appended as a row to a Google Sheet via a Google Apps
Script Web App.

The visual identity is nature-inspired (pastel greens, muted earth tones, soft
blue-green accents, cream backgrounds, subtle leaf/island motifs) and designed
to feel calm, trustworthy and approachable for older adults.

## 2. Intended Users

- Community members attending a screening activity at Pulau Ubin.
- Volunteers / facilitators entering measurements on a mobile phone.
- The classifications used are **adult** references (age ≥ 18). For younger
  participants the app deliberately declines to apply adult interpretations.
- Age is not upper-capped for real participants: values up to 130 years are
  accepted so centenarians are supported; only impossible ages are rejected.

## 3. Application Flow

```
COVER / ENTRY
   ↓
1 Demographics
   ↓
2 Body Mass Index
   ↓
3 Body Composition
   ↓
4 Blood Pressure & Resting Heart Rate
   ↓
5 Results Summary  →  Save / Print / New / View Saved
```

A compact, responsive progress indicator sits at the top of every step.
Values are calculated **in real time** once enough inputs exist.

## 4. Screens / Sections

| Step | Screen | Collects |
|------|--------|----------|
| Cover | Entry | — |
| 1 | Demographics | name, gender, year of birth (→ age), test location |
| 2 | BMI | height (cm), weight (kg) → BMI |
| 3 | Body Composition | body fat %, device-reported BMR (kcal/day) |
| 4 | Blood Pressure | systolic, diastolic (mmHg), resting HR (bpm) |
| 5 | Results | four result cards, snapshot, recommendations, disclaimer |

## 5. Scientific Basis (summary)

All scientific thresholds live in a single auditable file,
`classifications.js`, each block citing its source. No threshold is fabricated.
Where a value is context-dependent or not fully justified, wording is
deliberately neutral and non-diagnostic. Full citations are in
[§30 Key Scientific References](#30-key-scientific-references).

| Domain | Source used | Nature of reference |
|--------|-------------|---------------------|
| BMI cut-offs (Asian adults) | WHO Expert Consultation (2004), *The Lancet* | Public-health action points |
| Body fat % ranges | Gallagher et al. (2000), *Am J Clin Nutr* | Sex- and age-banded healthy ranges |
| BMR estimation | Mifflin et al. (1990), *Am J Clin Nutr* | Predictive equation for resting energy |
| Blood pressure categories | Whelton et al. (2018), ACC/AHA 2017, *Hypertension* | Clinical guideline thresholds |
| Resting heart rate | General adult reference (e.g. AHA) | Descriptive, non-diagnostic |

## 6. BMI Formula

Body Mass Index (Quetelet index) is computed as mass divided by the square of
height:

```
heightMeters = heightCm / 100
BMI = weightKg / (heightMeters ^ 2)      (kg/m², rounded to 1 decimal place)
```

BMI is **not** sex-specific; no different formula is used for males/females.
BMI is a proxy for adiposity at the population level and does not directly
measure body fat, fat distribution, or lean mass (Keys et al., 1972; NHLBI,
1998).

## 7. BMI Classification (Asian adults)

The World Health Organization convened an expert consultation because BMI–body
fat and BMI–risk relationships differ in Asian populations, with elevated
cardiometabolic risk observed at lower BMI values than in European-ancestry
populations. The consultation identified additional public-health "action
points" rather than redefining the standard categories (WHO Expert
Consultation, 2004).

Source: **WHO Expert Consultation (2004),** *The Lancet, 363*(9403), 157–163.

| Category | Range (kg/m²) | Flag | Implemented in |
|----------|---------------|------|----------------|
| Underweight | BMI < 18.5 | amber | `BMI_ASIAN_ADULT` |
| Healthy Range | 18.5 – 22.9 | green | `BMI_ASIAN_ADULT` |
| Increased Risk | 23.0 – 27.4 | amber | `BMI_ASIAN_ADULT` |
| High Risk | ≥ 27.5 | amber | `BMI_ASIAN_ADULT` |

Notes:
- Same cut-offs apply to males and females (**not** sex-specific).
- Applied to **adults only** (age ≥ 18). Below that the app shows: *"Adult BMI
  classification is not appropriate for this age group."*
- These are Asian-adult public-health action points, **not** fabricated
  age-specific cut-offs.
- Function: `classifyBMI(bmi, age)` in `classifications.js`.

## 8. Body Fat Interpretation

Gallagher and colleagues derived healthy percentage body-fat ranges predicted
from BMI, age and sex in a large multi-ethnic sample, using body fat measured by
a four-compartment/DXA-based approach (Gallagher et al., 2000). Their tables
show that healthy body-fat ranges rise with age and are higher in women than
men — which is why the app uses sex- and age-banded references rather than a
single cut-off.

Source: **Gallagher et al. (2000),** *American Journal of Clinical Nutrition,
72*(3), 694–701.

Three age bands per sex are implemented in `BODY_FAT_REFERENCE`. Four screening
categories are derived relative to the published healthy range:

- **Low** — below the healthy range
- **Healthy / Recommended** — within the healthy range
- **Elevated** — above healthy but below the high threshold
- **High** — at/above the high threshold

Approximate limits used (%):

| Sex | Age band | Healthy low | Healthy high | High threshold |
|-----|----------|-------------|--------------|----------------|
| Male | 20–39 | 8 | 20 | 25 |
| Male | 40–59 | 11 | 22 | 28 |
| Male | 60–79 | 13 | 25 | 30 |
| Female | 20–39 | 21 | 33 | 39 |
| Female | 40–59 | 23 | 34 | 40 |
| Female | 60–79 | 24 | 36 | 42 |

Notes:
- Adult only; a body-fat classification requires an adult age and a gender.
- Ages above 79 use the nearest (60–79) band rather than being rejected.
- Sports-performance categories (Essential Fat / Athlete / Fitness) are **not**
  used — this is a community screening tool.
- Function: `classifyBodyFat(bodyFatPct, gender, age)`.

> **Threshold requiring manual review:** the numeric limits above are
> commonly-cited approximations of the Gallagher et al. (2000) healthy ranges.
> Before formal deployment, confirm each value against the original tables and
> adjust `BODY_FAT_REFERENCE` in `classifications.js` if needed.

## 9. BMR Explanation & Estimation

Basal Metabolic Rate (BMR) is the energy expended at complete rest to maintain
basic physiological function. It is an **energy quantity, not a disease-risk
indicator**, and is never classified as Low/Normal/High in this app.

The value entered by the user is treated as **Device-reported BMR** (from a
body-composition analyser). Optionally, the app also computes an **Estimated
BMR** using the Mifflin–St Jeor equation, which outperformed older equations
(e.g. Harris–Benedict) for predicting resting energy expenditure in validation
work (Mifflin et al., 1990; Frankenfield et al., 2005):

```
Male:   BMR = 10·W + 6.25·H − 5·A + 5
Female: BMR = 10·W + 6.25·H − 5·A − 161
   W = weight (kg), H = height (cm), A = age (years)
```

Both values are labelled clearly. Any difference (`bmrDifference =
deviceBMR − estimatedBMR`) is shown as *informational only* and is **not**
treated as a diagnosis. Function: `estimateBMR_MifflinStJeor(...)`.

## 10. Blood Pressure Classification

A single, clearly-documented guideline is used: the **2017 ACC/AHA** guideline
(Whelton et al., 2018). No guidelines are mixed.

| Category | Definition |
|----------|------------|
| Normal | SBP < 120 **and** DBP < 80 |
| Elevated | SBP 120–129 **and** DBP < 80 |
| Hypertension Stage 1 | SBP 130–139 **or** DBP 80–89 |
| Hypertension Stage 2 | SBP ≥ 140 **or** DBP ≥ 90 |
| Crisis-level reading | SBP > 180 **and/or** DBP > 120 |

**Higher-risk category precedence.** When systolic and diastolic fall into
different categories, the **higher-risk** category is reported. Worked example:
`128/85` — systolic (128) implies *Elevated*, diastolic (85) implies *Stage 1*,
so the reading is classified **Hypertension Stage 1**. Function: `classifyBP`.

The app explicitly states that a single reading does not diagnose hypertension:
*"Blood pressure classification is based on this measurement only. Hypertension
diagnosis generally requires appropriate repeat measurements and clinical
assessment."* This reflects the guideline's own emphasis on averaging multiple
readings obtained on separate occasions.

For crisis-level readings, a calm, non-alarming advisory recommends rechecking
after resting and seeking urgent care if the reading remains very high or if
warning symptoms are present.

## 11. Resting Heart Rate Interpretation

A general adult reference is used descriptively (widely cited by major clinical
organisations such as the American Heart Association):

| Category | Range |
|----------|-------|
| Below typical adult resting range | < 60 bpm |
| Typical adult resting range | 60 – 100 bpm |
| Above typical adult resting range | > 100 bpm |

Wording is deliberately non-diagnostic. A rate below 60 is **not** automatically
labelled pathological (it may be normal in fit individuals or reflect
medication). Elevated resting heart rate has been associated with adverse
cardiovascular outcomes in epidemiological cohorts (e.g. Cooney et al., 2010),
but a single screening reading is not diagnostic. Adult only. Function:
`classifyRestingHR(bpm, age)`.

## 12. Age & Gender Handling

- **BMI:** not sex-specific; adult-only interpretation.
- **Body fat:** sex- and age-banded (this is inherent to the Gallagher
  reference, not an artificial adjustment).
- **Blood pressure:** no artificial age- or sex-specific cut-offs are created.
  Classification uses only the ACC/AHA thresholds; age and sex appear as context
  in the report and never change the hypertension stage.
- **Resting HR:** single adult reference; not adjusted by sex.

## 13. Recommendation Logic

Recommendations are **deterministic, rule-based** (no generative AI), neutral
and non-judgemental. Per-domain functions live in `results.js`:
`getBMIRecommendation()`, `getBodyFatRecommendation()`,
`getBloodPressureRecommendation()`, `getHeartRateRecommendation()`,
`getOverallRecommendation()`.

The overall recommendation is prioritised so that significant findings surface
first:

1. Blood pressure concern (if significant)
2. Resting heart rate concern
3. Body fat concern
4. BMI concern
5. General wellness

A single mild issue never produces an alarming overall status.

## 14. Result Priority Flags

- **GREEN** — within reference range
- **AMBER** — worth monitoring / lifestyle attention
- **RED** — potentially significant reading requiring follow-up (reserved for
  genuinely important values, e.g. a hypertensive crisis-level reading)

Function: `getOverallFlag(results)`.

## 15. Data Architecture

A structured result object is created for every completed assessment:

```js
{
  sessionId,          // e.g. PUHC-20260828-193011-AB12
  timestamp,          // ISO 8601
  participant:   { name, gender, yearOfBirth, age, location },
  anthropometry: { heightCm, weightKg, bmi, bmiClassification },
  bodyComposition: {
    bodyFatPercent, bodyFatClassification,
    bmrKcalDay, estimatedBmrKcalDay, bmrDifference
  },
  cardiovascular: {
    systolicBP, diastolicBP, bloodPressureClassification,
    restingHeartRate, restingHeartRateClassification
  },
  recommendations: {
    bmiRecommendation, bodyFatRecommendation,
    bloodPressureRecommendation, heartRateRecommendation,
    overallRecommendation
  },
  overallFlag         // "green" | "amber" | "red"
}
```

When submitted to Google Sheets, this nested object is flattened into a single
row (see `google-sheets.js → formatForSheet`). The column order in the sheet is
defined by `getHeaders()` in `google-apps-script.gs`.

## 16. Complete Data Dictionary

The Google Sheet (tab **Results**) uses the human-readable headers in the
"Sheet Column" column below. The JSON/payload field name is the key sent by the
app. Types, units, allowed values and provenance are given for analysis.

| # | Sheet Column | Payload Field | Data Type | Unit / Format | Allowed values / Range | Description | Source / Calculation |
|---|--------------|---------------|-----------|---------------|------------------------|-------------|----------------------|
| 1 | Session ID | `sessionId` | string | `PUHC-YYYYMMDD-HHMMSS-XXXX` | pattern | Unique per assessment | `generateSessionId()` |
| 2 | Timestamp | `timestamp` | string | ISO 8601 datetime (UTC) | e.g. `2026-08-28T11:30:11.000Z` | When result was created | `new Date().toISOString()` |
| 3 | Name | `name` | string | free text | non-empty | Participant name (or code) | User input |
| 4 | Gender | `gender` | string (categorical) | — | `Male`, `Female` | Reported gender | User input |
| 5 | Year of Birth | `yearOfBirth` | integer | YYYY | 1900 – current year | Four-digit birth year | User input |
| 6 | Age | `age` | integer | years | 0 – 130 | Current age | `currentYear − yearOfBirth` |
| 7 | Location | `location` | string (categorical) | — | `Ubin Town Hall`, `Ubin Jetty`, `Village` | Screening site | User input |
| 8 | Height (cm) | `heightCm` | number | cm | plausibility 100–230 | Standing height | User input |
| 9 | Weight (kg) | `weightKg` | number | kg | plausibility 25–250 | Body weight | User input |
| 10 | BMI | `bmi` | number | kg/m² (1 dp) | derived | Body Mass Index | `weightKg / (heightCm/100)²` |
| 11 | BMI Classification | `bmiClassification` | string (categorical) | — | `Underweight`, `Healthy Range`, `Increased Risk`, `High Risk`, `Not applicable (non-adult)` | Asian adult BMI category | WHO 2004 (`classifyBMI`) |
| 12 | Body Fat (%) | `bodyFatPercent` | number | % | plausibility 2–70 | Body-fat percentage | User input (analyser) |
| 13 | Body Fat Classification | `bodyFatClassification` | string (categorical) | — | `Low`, `Healthy / Recommended`, `Elevated`, `High`, `Not applicable` | Sex/age body-fat category | Gallagher 2000 (`classifyBodyFat`) |
| 14 | BMR (kcal/day) | `bmrKcalDay` | number | kcal/day | plausibility 500–4000 | Device-reported BMR | User input (analyser) |
| 15 | Estimated BMR (kcal/day) | `estimatedBmrKcalDay` | number | kcal/day | derived | Estimated resting energy | Mifflin–St Jeor |
| 16 | BMR Difference | `bmrDifference` | number | kcal/day | derived (can be negative) | Device − Estimated | `bmrDifference()` |
| 17 | Systolic BP | `systolicBP` | integer | mmHg | plausibility 60–260 | Systolic pressure | User input |
| 18 | Diastolic BP | `diastolicBP` | integer | mmHg | plausibility 30–160 | Diastolic pressure | User input |
| 19 | BP Classification | `bloodPressureClassification` | string (categorical) | — | `Normal`, `Elevated`, `Hypertension Stage 1`, `Hypertension Stage 2`, `Hypertensive Crisis-Level Reading` | ACC/AHA 2017 category (higher-risk precedence) | `classifyBP` |
| 20 | Resting HR | `restingHeartRate` | integer | bpm | plausibility 30–220 | Resting heart rate | User input |
| 21 | Resting HR Classification | `restingHeartRateClassification` | string (categorical) | — | `Below typical adult resting range`, `Typical adult resting range`, `Above typical adult resting range`, `Not applicable (non-adult)` | Adult RHR band | `classifyRestingHR` |
| 22 | BMI Recommendation | `bmiRecommendation` | string | text | — | Deterministic BMI advice | `getBMIRecommendation` |
| 23 | Body Fat Recommendation | `bodyFatRecommendation` | string | text | — | Deterministic body-fat advice | `getBodyFatRecommendation` |
| 24 | Blood Pressure Recommendation | `bloodPressureRecommendation` | string | text | — | Deterministic BP advice | `getBloodPressureRecommendation` |
| 25 | Heart Rate Recommendation | `heartRateRecommendation` | string | text | — | Deterministic HR advice | `getHeartRateRecommendation` |
| 26 | Overall Recommendation | `overallRecommendation` | string | text | — | Prioritised overall advice | `getOverallRecommendation` |
| 27 | Overall Flag | `overallFlag` | string (categorical) | — | `green`, `amber`, `red` | Overall priority flag | `getOverallFlag` |

Notes for analysts:
- "plausibility" ranges are **input sanity ranges** used to catch typos, not
  diagnostic ranges. Values outside them prompt the user to confirm.
- `Age` is derived from year only (no month/day), so it may differ by up to one
  year from exact age.
- `Timestamp` is stored in UTC (ISO 8601). Convert to Singapore time
  (UTC+8) for local reporting.

## 17. Local Storage

Results are saved to `localStorage` under the key `puhc_saved_results`.
Buttons on the Results page: **Save Result**, **New Health Check**,
**View Saved Results**, **Delete All Saved Results**. Saving to Google Sheets
(when enabled) happens in addition to local saving, not instead of it.

## 18. Google Sheets Integration

Configured in `config.js`:

```js
googleSheets: { enabled: true, webAppUrl: "<YOUR_/exec_URL>" }
```

Server side: `google-apps-script.gs` is pasted into the target sheet via
**Extensions → Apps Script** and deployed as a **Web app** (Execute as: Me;
Who has access: Anyone). Because it uses `SpreadsheetApp.getActiveSpreadsheet()`,
it writes to the spreadsheet it is bound to; the **Results** tab and header row
are created automatically on the first successful POST.

The browser posts with `mode: "no-cors"` and a `text/plain` body; Apps Script
parses JSON from `e.postData.contents`. Because the response is opaque to the
browser, the UI cannot read success/failure — confirmation is the new row in the
sheet.

**Security note.** With "Anyone" access, the `/exec` URL can accept rows from
anyone who has it. For a screening tool this is generally acceptable, but since
health-related data are involved, avoid publishing the URL and consider adding a
shared-secret token if stronger control is needed.

## 19. R Shiny Analytics Dashboard

A ready-to-run dashboard is provided as **`shiny/app.R`**. It reads the same
Google Sheet live and presents medical-analysis-oriented visualisations with an
NHG/HealthHub-style theme (clean cards, calm greens/teals, KPI value boxes).

Highlights:
- Live pull from the published Google Sheet CSV (auto-refresh).
- KPI value boxes: participants screened, mean BMI, % elevated/high BP, mean RHR.
- Distributions: BMI, body fat %, BMR, systolic/diastolic BP, resting HR.
- Categorical breakdowns: BMI category, BP category, overall flag.
- Cross-analyses: BMI vs body fat, BMI vs systolic BP, age vs systolic BP,
  BMR vs weight, body fat vs BP.
- Group comparisons: by gender, age group and screening location.
- Filterable, downloadable data table.

Full setup and dependencies are documented at the top of `shiny/app.R`. In
short: publish the sheet to the web as CSV (or share read-access), paste the CSV
URL into the `SHEET_CSV_URL` constant, install the listed packages, and run
`shiny::runApp("shiny")`.

## 20. Project Structure

```
PulauUbinHealthCheck/
├── index.html            App shell + all screen markup
├── styles.css            Nature-inspired mobile-first styles + print CSS
├── config.js             App config, locations, input sanity ranges, GS toggle
├── calculations.js       Pure numeric helpers (age, BMI, session id, gauges)
├── classifications.js    ALL scientific thresholds + classify* functions
├── results.js            Deterministic recommendation engine + flags
├── storage.js            localStorage CRUD
├── google-sheets.js      Google Sheets client (formatForSheet + POST)
├── google-apps-script.gs Server-side receiver (paste into Apps Script)
├── assets/
│   └── cover.js          Embedded cover photo (Base64 data-URI)
├── shiny/
│   └── app.R             R Shiny live analytics dashboard
└── README.md
```

## 21. Running Locally

No build step. Open `index.html` in a browser, or serve the folder:

```powershell
..\.node\node-v20.18.0-win-x64\npx.cmd serve .
```

## 22. GitHub Pages Deployment

1. Commit the app files to a repository (root or a served subfolder).
2. **Settings → Pages → Deploy from a branch**, select branch and `/ (root)`.
3. After the build, open the published URL; hard-refresh (Ctrl+F5) after updates
   so cached JS (e.g. `config.js`) is replaced.

## 23. Mobile Compatibility

Mobile-first layout (max width 560px), sticky compact progress bar, correct
mobile keypads via `inputmode`, works offline once loaded (no CDNs).

## 24. Accessibility

Body font 18px; large labels; strong contrast; touch targets ≈48px; gauges
include text labels in addition to colour, with `role="img"` + `aria-label`;
clear inline error messages. Full WCAG conformance would require manual testing
with assistive technologies and expert review.

## 25. Data Privacy & Governance

- Data stay local unless Google Sheets integration is enabled.
- **No camera, no microphone, no GPS/location, no biometric capture.**
- No health data leave the browser unless submitted to the configured endpoint.
- Use only for authorised screening; prefer participant codes over names for any
  formal research; follow your institution's data-governance requirements.
- When Sheets is enabled, the sheet and the Apps Script deployment become the
  data custodians — apply appropriate Google account access controls.

## 26. Clinical / Scientific Limitations

- Classifications are screening references, **not diagnoses**.
- A single BP or HR reading cannot diagnose a condition.
- BMI does not measure body fat directly; body-fat % adds context but is
  device-dependent (e.g. bioelectrical impedance varies with hydration).
- BMR values are energy estimates, not risk indicators.
- No disease diagnoses, cardiovascular-risk percentages, mortality/diabetes/
  metabolic-syndrome estimates, medication advice, or single numeric "health
  score" are produced.

## 27. Testing

Core scientific logic is covered by a Node test harness (36 checks) spanning:
age calculation; BMI value and all Asian cut-offs incl. boundaries; body-fat
male/female and age-band and below-adult; Mifflin–St Jeor male/female; BP
normal/elevated/stage 1/stage 2/crisis and discordant systolic/diastolic
precedence; RHR below/typical/above and non-adult; recommendation
prioritisation; overall flags; and session-ID format.

Manual UI checklist: demographics (blank name, future/implausible year); BMI
(invalid/boundary/decimal); body fat (boundaries, sex logic, age-band
transitions); BMR (normal/implausible/estimate); BP (each category + discordant
readings); RHR (below/typical/above); results (print, localStorage, reset);
Google Sheets round-trip.

## 28. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Cover image blank | Ensure `assets/cover.js` loads before `app.js`. |
| "Continue" seems to do nothing | An unusual value needs a second tap to confirm. |
| Saved results empty | Browser privacy mode can block `localStorage`. |
| Nothing appears in Google Sheet | Confirm `config.js` has `enabled: true` and the correct `/exec` URL; hard-refresh; verify you are looking at the spreadsheet the Apps Script is *bound to* (rows land in that sheet's **Results** tab). |
| Sheet integration edited but no change | Redeploy: Deploy → Manage deployments → New version. |
| R Shiny shows no data | Confirm the sheet is published/shared and `SHEET_CSV_URL` is correct. |

## 29. Future Development

- Optional shared-secret token to restrict who can write to the sheet.
- Repeat-measurement support (BP averaging across readings).
- Additional locations / multilingual labels.
- Longitudinal tracking by participant code.

## 30. Key Scientific References

*(APA 7. DOIs included where available. No sources are fabricated.)*

**Asian BMI Classification**
World Health Organization Expert Consultation. (2004). Appropriate body-mass
index for Asian populations and its implications for policy and intervention
strategies. *The Lancet, 363*(9403), 157–163.
https://doi.org/10.1016/S0140-6736(03)15268-3

**General BMI context**
National Heart, Lung, and Blood Institute. (1998). *Clinical guidelines on the
identification, evaluation, and treatment of overweight and obesity in adults:
The evidence report.* NIH Publication No. 98-4083.
Keys, A., Fidanza, F., Karvonen, M. J., Kimura, N., & Taylor, H. L. (1972).
Indices of relative weight and obesity. *Journal of Chronic Diseases, 25*(6),
329–343. https://doi.org/10.1016/0021-9681(72)90027-6

**Body Fat Percentage Reference Values**
Gallagher, D., Heymsfield, S. B., Heo, M., Jebb, S. A., Murgatroyd, P. R., &
Sakamoto, Y. (2000). Healthy percentage body fat ranges: An approach for
developing guidelines based on body mass index. *American Journal of Clinical
Nutrition, 72*(3), 694–701. https://doi.org/10.1093/ajcn/72.3.694

**Basal Metabolic Rate Estimation**
Mifflin, M. D., St Jeor, S. T., Hill, L. A., Scott, B. J., Daugherty, S. A., &
Koh, Y. O. (1990). A new predictive equation for resting energy expenditure in
healthy individuals. *American Journal of Clinical Nutrition, 51*(2), 241–247.
https://doi.org/10.1093/ajcn/51.2.241
Frankenfield, D., Roth-Yousey, L., & Compher, C. (2005). Comparison of
predictive equations for resting metabolic rate in healthy nonobese and obese
adults: A systematic review. *Journal of the American Dietetic Association,
105*(5), 775–789. https://doi.org/10.1016/j.jada.2005.02.005

**Blood Pressure Classification**
Whelton, P. K., Carey, R. M., Aronow, W. S., Casey, D. E., Collins, K. J.,
Dennison Himmelfarb, C., … Wright, J. T. (2018). 2017 ACC/AHA/AAPA/ABC/ACPM/
AGS/APhA/ASH/ASPC/NMA/PCNA guideline for the prevention, detection, evaluation,
and management of high blood pressure in adults. *Hypertension, 71*(6),
e13–e115. https://doi.org/10.1161/HYP.0000000000000065

**Resting Heart Rate**
Cooney, M. T., Vartiainen, E., Laakitainen, T., Juolevi, A., Dudina, A., &
Graham, I. M. (2010). Elevated resting heart rate is an independent risk factor
for cardiovascular disease in healthy men and women. *American Heart Journal,
159*(4), 612–619.e3. https://doi.org/10.1016/j.ahj.2009.12.029

> **Thresholds requiring manual review before formal deployment:**
> 1. Body-fat numeric limits in `BODY_FAT_REFERENCE` are commonly-cited
>    approximations of Gallagher et al. (2000) — confirm against the originals.
> 2. The 60–100 bpm resting-heart-rate reference should be confirmed against your
>    preferred cited clinical source for the deployment context.

## 31. Disclaimer

This health check provides general screening information based on the
measurements entered. It is **not a medical diagnosis** and should not replace
consultation with a qualified healthcare professional. It does not estimate
disease risk, recommend medication, or produce an overall numeric health score.
Classifications are based on the single set of measurements entered during the
session. If a reading is very high or a participant has concerning symptoms,
seek appropriate medical care.

---

### Note on the cover photograph

The supplied Pulau Ubin photograph is embedded as a Base64 JPEG data-URI in
`assets/cover.js`, so the app is self-contained with no external image asset.
The app references only `window.COVER_IMAGE`; to swap the photo, replace that
data-URI value.
