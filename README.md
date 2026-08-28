# Pulau Ubin Health Check

A lightweight, mobile-first, static web application for **community health screening**
at Pulau Ubin. It records basic anthropometric and cardiovascular measurements,
applies **documented, evidence-based classifications**, and produces a clear,
non-diagnostic screening summary that can be printed or saved locally.

Built with plain **HTML5 + CSS3 + vanilla JavaScript (ES6+)**. No frameworks,
no build step, no backend. Deployable directly to **GitHub Pages**.

---

## 1. Project Overview

Pulau Ubin Health Check guides a participant (or a volunteer assisting them)
through five short steps and generates a screening summary with gentle,
rule-based recommendations. All processing happens in the browser. Data stays
local unless an optional Google Sheets integration is explicitly enabled later.

The visual identity is nature-inspired (pastel greens, muted earth tones, soft
blue-green accents, cream backgrounds, subtle leaf/island motifs) and designed
to feel calm, trustworthy and approachable for older adults.

## 2. Intended Users

- Community members attending a screening activity at Pulau Ubin.
- Volunteers / facilitators entering measurements on a mobile phone.
- The classifications used are **adult** references (age ≥ 18). For younger
  participants the app deliberately declines to apply adult interpretations.

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

## 4. Screens / Sections

| Step | Screen | Collects |
|------|--------|----------|
| Cover | Entry | — |
| 1 | Demographics | name, gender, year of birth (→ age), test location |
| 2 | BMI | height (cm), weight (kg) → BMI |
| 3 | Body Composition | body fat %, device-reported BMR (kcal/day) |
| 4 | Blood Pressure | systolic, diastolic (mmHg), resting HR (bpm) |
| 5 | Results | four result cards, snapshot, recommendations, disclaimer |

Values are calculated **in real time** as soon as enough inputs exist — no
repeated button presses required.

## 5. Scientific Basis

All scientific thresholds live in a single auditable file, `classifications.js`,
each block citing its source. No threshold is fabricated. Where a value is
context-dependent or not fully justified, wording is deliberately neutral and
non-diagnostic. See **§27 Key Scientific References** below.

## 6. BMI Formula

```
heightMeters = heightCm / 100
BMI = weightKg / (heightMeters ^ 2)   (rounded to 1 decimal place)
```

BMI is **not** sex-specific and no different formula is used for males/females.

## 7. BMI Classification (Asian adults)

Source: WHO Expert Consultation (2004), *The Lancet*.

| Category | Range (kg/m²) | Flag |
|----------|---------------|------|
| Underweight | BMI < 18.5 | amber |
| Healthy Range | 18.5 – 22.9 | green |
| Increased Risk | 23.0 – 27.4 | amber |
| High Risk | ≥ 27.5 | amber |

- The same cut-offs apply to males and females (**not** sex-specific).
- Applied to **adults only** (age ≥ 18). For younger ages the app shows:
  *"Adult BMI classification is not appropriate for this age group."*
- These are Asian-adult public-health action points, **not** age-specific
  cut-offs (no age-specific BMI cut-offs are fabricated).

## 8. Body Fat Interpretation

Source: Gallagher et al. (2000), *American Journal of Clinical Nutrition*.

The Gallagher tables provide **sex- and age-banded** healthy body-fat ranges.
Three age bands (20–39, 40–59, 60–79) are implemented per sex in
`BODY_FAT_REFERENCE`. Four screening categories are derived relative to the
published healthy range:

- **Low** — below the healthy range
- **Healthy / Recommended** — within the healthy range
- **Elevated** — above healthy, below the high threshold
- **High** — at/above the high threshold

Approximate healthy limits used (from Gallagher et al., 2000):

| Sex | Age | Healthy low % | Healthy high % | High threshold % |
|-----|-----|---------------|----------------|------------------|
| Male | 20–39 | 8 | 20 | 25 |
| Male | 40–59 | 11 | 22 | 28 |
| Male | 60–79 | 13 | 25 | 30 |
| Female | 20–39 | 21 | 33 | 39 |
| Female | 40–59 | 23 | 34 | 40 |
| Female | 60–79 | 24 | 36 | 42 |

Sports-performance categories (Essential Fat / Athlete / Fitness) are **not**
used — this is a community screening tool, not an athletic body-composition tool.
Interpretation is presented as a screening reference, not a diagnosis. Adult only.

> **Threshold requiring manual review:** the exact numeric limits above are
> commonly-cited approximations of the Gallagher et al. (2000) healthy ranges.
> Before formal deployment, confirm each value against the original tables in
> the paper and adjust `BODY_FAT_REFERENCE` in `classifications.js` if needed.

## 9. BMR Explanation

BMR (Basal Metabolic Rate) is the estimated energy the body uses each day at
rest. **BMR is not a disease-risk indicator** and is never classified as
Low/Normal/High.

The value entered is treated as **Device-reported BMR** (from a body-composition
analyser). Optionally, the app also computes an **Estimated BMR** using the
Mifflin–St Jeor equation (Mifflin et al., 1990):

```
Male:   BMR = 10W + 6.25H − 5A + 5
Female: BMR = 10W + 6.25H − 5A − 161
   W = weight (kg), H = height (cm), A = age (years)
```

Both values are labelled clearly. Any difference is shown as *informational
only* and is **not** treated as a diagnosis.

## 10. Blood Pressure Classification

Single, clearly-documented guideline: **ACC/AHA 2017** (Whelton et al., 2018).

| Category | Definition |
|----------|------------|
| Normal | SBP < 120 **and** DBP < 80 |
| Elevated | SBP 120–129 **and** DBP < 80 |
| Hypertension Stage 1 | SBP 130–139 **or** DBP 80–89 |
| Hypertension Stage 2 | SBP ≥ 140 **or** DBP ≥ 90 |
| Crisis-level reading | SBP > 180 **and/or** DBP > 120 |

**Category precedence (§37):** when systolic and diastolic fall into different
categories, the **higher-risk** category is used. Example: 128/85 → the
systolic implies *Elevated* but the diastolic (85) implies *Stage 1*, so the
reading is classified **Hypertension Stage 1**.

A single reading does not diagnose hypertension; this is stated in the app:
*"Blood pressure classification is based on this measurement only. Hypertension
diagnosis generally requires appropriate repeat measurements and clinical
assessment."*

For crisis-level readings a clearly visible, non-panic advisory is shown
recommending a recheck after resting and urgent care if the reading remains very
high or concerning symptoms are present.

## 11. Resting Heart Rate Interpretation

General adult reference (commonly cited by major clinical organisations, e.g.
American Heart Association):

| Category | Range |
|----------|-------|
| Below typical adult resting range | < 60 bpm |
| Typical adult resting range | 60 – 100 bpm |
| Above typical adult resting range | > 100 bpm |

Wording is deliberately non-diagnostic. A rate below 60 is **not** automatically
labelled pathological — it can be normal in fit individuals or reflect
medication. Applied to adults only.

## 12. Age and Gender in Blood Pressure (§13)

No artificial age- or sex-specific BP cut-offs are created. BP classification is
based purely on the ACC/AHA 2017 thresholds. Age and sex appear only as context
in the report and never change the hypertension stage.

## 13. Recommendation Logic (§17, §38, §39)

Recommendations are **deterministic, rule-based** (no generative AI), neutral and
non-judgemental. Per-domain functions live in `results.js`:

- `getBMIRecommendation()`
- `getBodyFatRecommendation()`
- `getBloodPressureRecommendation()`
- `getHeartRateRecommendation()`
- `getOverallRecommendation()` — prioritised as:
  1. Blood pressure concern (if significant)
  2. Resting heart rate concern
  3. Body fat concern
  4. BMI concern
  5. General wellness

A single mild issue never produces an alarming overall status.

### Result priority flags (§19)

- **GREEN** — within reference range
- **AMBER** — worth monitoring / lifestyle attention
- **RED** — potentially significant reading requiring follow-up (reserved for
  genuinely important values, e.g. a hypertensive crisis-level BP reading)

## 14. Data Architecture

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

`estimatedBmrKcalDay` and `bmrDifference` are always included because the
Mifflin–St Jeor estimate is implemented.

## 15. Complete Data Dictionary

| Field Name | Data Type | Unit / Format | Description | Source / Calculation |
|------------|-----------|---------------|-------------|----------------------|
| sessionId | string | PUHC-YYYYMMDD-HHMMSS-XXXX | Unique session identifier | Generated (`generateSessionId`) |
| timestamp | string | ISO 8601 datetime | When the result was created | `new Date().toISOString()` |
| name | string | text | Participant name | User input |
| gender | string | "Male" / "Female" | Gender selection | User input |
| yearOfBirth | number | YYYY | Four-digit year of birth | User input |
| age | number | years | Current age | `currentYear − yearOfBirth` |
| location | string | text | Test location | User input (Ubin Town Hall / Ubin Jetty / Village) |
| heightCm | number | cm | Height | User input |
| weightKg | number | kg | Weight | User input |
| bmi | number | kg/m² (1 dp) | Body Mass Index | `weightKg / (heightCm/100)²` |
| bmiClassification | string | category | Asian adult BMI category | WHO 2004 (`classifyBMI`) |
| bodyFatPercent | number | % | Body fat | User input |
| bodyFatClassification | string | category | Low/Healthy/Elevated/High | Gallagher 2000 (`classifyBodyFat`) |
| bmrKcalDay | number | kcal/day | Device-reported BMR | User input (analyser) |
| estimatedBmrKcalDay | number | kcal/day | Estimated BMR | Mifflin–St Jeor (`estimateBMR_MifflinStJeor`) |
| bmrDifference | number | kcal/day | Device − Estimated | `bmrDifference()` |
| systolicBP | number | mmHg | Systolic blood pressure | User input |
| diastolicBP | number | mmHg | Diastolic blood pressure | User input |
| bloodPressureClassification | string | category | ACC/AHA 2017 category (higher-risk precedence) | `classifyBP` |
| restingHeartRate | number | bpm | Resting heart rate | User input |
| restingHeartRateClassification | string | category | Below/Typical/Above | `classifyRestingHR` |
| bmiRecommendation | string | text | BMI advice | Rule-based |
| bodyFatRecommendation | string | text | Body-fat advice | Rule-based |
| bloodPressureRecommendation | string | text | BP advice | Rule-based |
| heartRateRecommendation | string | text | HR advice | Rule-based |
| overallRecommendation | string | text | Prioritised overall advice | Rule-based |
| overallFlag | string | green/amber/red | Overall priority flag | `getOverallFlag` |

## 16. Local Storage

Results are saved to `localStorage` under the key `puhc_saved_results`
(configurable in `config.js`). Buttons on the Results page:

- **Save Result** — append the current result
- **New Health Check** — reset all state/inputs (saved results untouched)
- **View Saved Results** — list, and delete individual entries
- **Delete All Saved Results** — clear everything (with confirmation)

Saved results never interfere with a new assessment; session state is held
separately in memory.

## 17. Future Google Sheets Integration

The architecture is ready but **disabled by default** (`config.js`):

```js
googleSheets: { enabled: false, webAppUrl: "" }
```

While disabled, the app works fully offline. To enable later:

1. Open `google-apps-script.gs`, follow the setup comments, set your
   `SPREADSHEET_ID`, and **Deploy → Web app** (Execute as *Me*, Access *Anyone*).
2. Copy the Web App URL into `config.js` → `googleSheets.webAppUrl` and set
   `enabled: true`.
3. On **Save Result**, `GOOGLE_SHEETS.submitResultToGoogleSheets(result)` posts a
   flat payload (see `formatForSheet`) whose field names match the Data Dictionary
   and the Apps Script headers.

No live endpoint is included. The POST uses `mode: "no-cors"` with a
`text/plain` body, which Apps Script parses from `e.postData.contents`.

## 18. Project Structure

```
PulauUbinHealthCheck/
├── index.html            App shell + all screen markup
├── styles.css            Nature-inspired mobile-first styles + print CSS
├── config.js             App config, locations, input sanity ranges, GS toggle
├── calculations.js       Pure numeric helpers (age, BMI, session id, gauges)
├── classifications.js    ALL scientific thresholds + classify* functions
├── results.js            Deterministic recommendation engine + flags
├── storage.js            localStorage CRUD
├── google-sheets.js      Optional Google Sheets client (isolated)
├── google-apps-script.gs Server-side receiver (future; paste into Apps Script)
├── assets/
│   └── cover.js          Embedded cover image (data-URI constant)
└── README.md
```

## 19. Running Locally

No build step. Any static server works. Using the bundled Node:

```powershell
# from the PulauUbinHealthCheck folder
..\.node\node-v20.18.0-win-x64\npx.cmd serve .
# or simply open index.html directly in a browser
```

Opening `index.html` via `file://` also works because the cover image is
embedded (no external image fetch).

## 20. GitHub Pages Deployment

1. Commit the `PulauUbinHealthCheck/` contents to a repository.
   For a project-page deploy, put these files at the **repo root** (or configure
   Pages to serve from a subfolder).
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, select your branch and `/ (root)`.
3. Wait for the Pages build, then open the published URL on a phone.

Everything is relative-path and self-contained, so it works on Pages with no
server code.

## 21. Mobile Compatibility

- Mobile-first layout, max content width 560px, sticky compact progress bar.
- `inputmode` set for numeric/decimal fields to bring up the correct keypad.
- Works offline once loaded; no external assets or CDNs required.

## 22. Accessibility

- Body font 18px; large labels; strong contrast against cream backgrounds.
- Touch targets ≥ ~48px; no tiny sliders; no hover-only controls.
- Gauges include **text labels in addition to colour** and `role="img"` +
  `aria-label`. Colour is never the only signal.
- Clear inline error messages per field.

## 23. Data Privacy

- Data entered stay **local** unless Google Sheets integration is explicitly
  enabled and configured.
- **No camera, no microphone, no GPS/location, no biometric recording.**
- No health data leave the browser unless submitted to the configured endpoint.

Because health-related information is collected:
- use only for authorised screening activities;
- consider participant codes rather than names for any formal research;
- follow your institution's data-governance requirements.

## 24. Clinical / Scientific Limitations

- Classifications are screening references, **not diagnoses**.
- A single BP or HR reading cannot diagnose a condition.
- BMI does not measure body fat directly; body-fat % adds context.
- BMR values are energy estimates, not risk indicators.
- The app does **not** produce disease diagnoses, cardiovascular-risk
  percentages, mortality/diabetes/metabolic-syndrome estimates, medication advice
  or any single numeric "health score".

## 25. Testing

The scientific logic was verified with a Node harness (36 checks, all passing)
covering: age calculation; BMI value + all Asian cut-offs incl. boundaries; body
fat male/female + age-band + below-adult; Mifflin–St Jeor male/female; BP normal/
elevated/stage 1/stage 2/crisis + discordant systolic/diastolic precedence; RHR
below/typical/above + non-adult; recommendation prioritisation; overall flags;
and session-ID format.

Manual UI test checklist (§36):

- **Demographics:** blank name, invalid/future year, implausible age.
- **BMI:** invalid height/weight, exact cut-off values, decimals.
- **Body Fat:** lower/upper boundary, male/female logic, age-band transitions.
- **BMR:** normal, implausible, estimated-comparison display.
- **BP:** normal, elevated, stage 1, stage 2, crisis, discordant categories.
- **Resting HR:** below/typical/above.
- **Results:** all combinations, print view, localStorage save/delete, reset.

## 26. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Cover image blank | Ensure `assets/cover.js` loads before `app.js` (it does in `index.html`). |
| "Continue" seems to do nothing | An unusual value needs a second tap to confirm; check the field hint. |
| Saved results empty | Browser privacy mode can block `localStorage`. |
| Google Sheets not saving | Integration is disabled by default; see §17. |

## 27. Future Development / Analytics Readiness

The saved/POSTed dataset is intentionally **flat and analysis-friendly**, so a
Google Sheet can later be read directly into **R / R Shiny**. Suggested future
analyses (not built here): distributions of BMI, body fat, BMR, systolic/
diastolic BP and resting HR; results by age group, gender and screening location;
and relationships such as BMI vs body fat, BMI vs BP, body fat vs BP, age vs
systolic BP, and BMR vs weight.

## Key Scientific References

*(APA 7. DOIs included where available. No sources are fabricated.)*

**Asian BMI Classification**
WHO Expert Consultation. (2004). Appropriate body-mass index for Asian
populations and its implications for policy and intervention strategies.
*The Lancet, 363*(9403), 157–163. https://doi.org/10.1016/S0140-6736(03)15268-3
— Basis for the Asian adult BMI cut-offs (18.5 / 23.0 / 27.5).

**Body Fat Percentage Reference Values**
Gallagher, D., Heymsfield, S. B., Heo, M., Jebb, S. A., Murgatroyd, P. R., &
Sakamoto, Y. (2000). Healthy percentage body fat ranges: An approach for
developing guidelines based on body mass index. *American Journal of Clinical
Nutrition, 72*(3), 694–701. https://doi.org/10.1093/ajcn/72.3.694
— Basis for sex- and age-banded body-fat healthy ranges.

**Basal Metabolic Rate Estimation**
Mifflin, M. D., St Jeor, S. T., Hill, L. A., Scott, B. J., Daugherty, S. A., &
Koh, Y. O. (1990). A new predictive equation for resting energy expenditure in
healthy individuals. *American Journal of Clinical Nutrition, 51*(2), 241–247.
https://doi.org/10.1093/ajcn/51.2.241
— Basis for the optional estimated-BMR comparison.

**Blood Pressure Classification**
Whelton, P. K., Carey, R. M., Aronow, W. S., Casey, D. E., Collins, K. J.,
Dennison Himmelfarb, C., … Wright, J. T. (2018). 2017 ACC/AHA/AAPA/ABC/ACPM/AGS/
APhA/ASH/ASPC/NMA/PCNA guideline for the prevention, detection, evaluation, and
management of high blood pressure in adults. *Hypertension, 71*(6), e13–e115.
https://doi.org/10.1161/HYP.0000000000000065
— Basis for the BP categories and precedence rule.

**Resting Heart Rate & Community Health Screening**
The 60–100 bpm adult resting-heart-rate reference is a general clinical reference
widely stated by major organisations (e.g., the American Heart Association).
It is used here descriptively and non-diagnostically.

> **Thresholds requiring manual review before formal deployment:**
> 1. The body-fat numeric limits in `BODY_FAT_REFERENCE` are commonly-cited
>    approximations of the Gallagher et al. (2000) ranges — confirm against the
>    original tables.
> 2. The resting-heart-rate 60–100 bpm reference should be confirmed against your
>    preferred cited clinical source for the deployment context.

## Disclaimer

This health check provides general screening information based on the
measurements entered. It is **not a medical diagnosis** and should not replace
consultation with a qualified healthcare professional. It does not estimate
disease risk, does not recommend medication, and does not produce an overall
numeric health score. Classifications are based on the single set of
measurements entered during the session. If a reading is very high or a
participant has concerning symptoms, seek appropriate medical care.

---

### Note on the cover photograph

The supplied photograph was provided in chat rather than as a repository file,
so its raw pixel data could not be programmatically converted to Base64 here.
To keep the app fully self-contained with **no external image asset** (as
requested), the cover is delivered as an **embedded vector (SVG) data-URI**
constant in `assets/cover.js`, illustrating the "Welcome to Pulau Ubin" village
gate scene. To use the real photograph instead, convert it to Base64 and replace
the `COVER_IMAGE` value — instructions are in `assets/cover.js`. Nothing else
changes; the app only references `window.COVER_IMAGE`.
