/* ============================================================
   PULAU UBIN HEALTH CHECK — Application Controller
   ------------------------------------------------------------
   Wires up the flow: Cover -> Demographics -> BMI ->
   Body Composition -> Blood Pressure -> Results -> Save.
   Handles state, validation, live calculation and rendering.
   ============================================================ */

(function () {
    "use strict";

    // ---- In-memory session state (separate from saved results) ----
    const state = {
        participant: { name: "", gender: "", yearOfBirth: null, age: null, location: "" },
        anthropometry: { heightCm: null, weightKg: null },
        bodyComposition: { bodyFatPercent: null, bmrKcalDay: null },
        cardiovascular: { systolicBP: null, diastolicBP: null, restingHeartRate: null },
        confirmed: {} // acknowledged "unusual value" confirmations
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const STEP_PAGES = {
        1: "page-demographics",
        2: "page-bmi",
        3: "page-bodycomp",
        4: "page-bp",
        5: "page-results"
    };
    let currentStep = 1;

    /* ============================================================
       INITIALISATION
       ============================================================ */
    function init() {
        const cover = $("#coverImage");
        if (cover && window.COVER_IMAGE) {
            cover.style.backgroundImage = `url("${window.COVER_IMAGE}")`;
        }

        const loc = $("#location");
        CONFIG.locations.forEach((l) => {
            const opt = document.createElement("option");
            opt.value = l; opt.textContent = l;
            loc.appendChild(opt);
        });

        bindEvents();
    }

    function bindEvents() {
        $("#startBtn").addEventListener("click", startFlow);

        $$("#gender .seg").forEach((btn) => {
            btn.addEventListener("click", () => {
                $$("#gender .seg").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
                state.participant.gender = btn.dataset.value;
                clearError("err-gender");
                liveBodyComp(); // body-fat classification depends on gender
            });
        });

        $("#yearOfBirth").addEventListener("input", () => {
            updateAgeHint();
            liveBodyComp(); // classification depends on age
        });

        $$("[data-next]").forEach((b) =>
            b.addEventListener("click", () => handleNext(b.dataset.next)));
        $$("[data-back]").forEach((b) => b.addEventListener("click", goBack));

        ["heightCm", "weightKg"].forEach((id) =>
            $("#" + id).addEventListener("input", liveBMI));
        ["bodyFat", "bmr"].forEach((id) =>
            $("#" + id).addEventListener("input", liveBodyComp));
        ["systolic", "diastolic", "restingHR"].forEach((id) =>
            $("#" + id).addEventListener("input", liveBP));

        $("#closeSaved").addEventListener("click", () => $("#savedModal").classList.add("hidden"));
        $("#deleteAllBtn").addEventListener("click", deleteAllSaved);
    }

    function startFlow() {
        $("#page-cover").classList.remove("active");
        $("#page-cover").classList.add("hidden");
        $("#flow").classList.remove("hidden");
        goToStep(1);
    }

    /* ============================================================
       STEP NAVIGATION
       ============================================================ */
    function goToStep(step) {
        currentStep = step;
        Object.values(STEP_PAGES).forEach((pid) => $("#" + pid).classList.add("hidden"));
        $("#" + STEP_PAGES[step]).classList.remove("hidden");
        updateProgress(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateProgress(step) {
        $$("#progressList li").forEach((li) => {
            const s = Number(li.dataset.step);
            li.classList.toggle("active", s === step);
            li.classList.toggle("done", s < step);
        });
    }

    function goBack() { if (currentStep > 1) goToStep(currentStep - 1); }

    function handleNext(section) {
        let ok = false;
        if (section === "demographics") ok = validateDemographics();
        else if (section === "bmi") ok = validateBMI();
        else if (section === "bodycomp") ok = validateBodyComp();
        else if (section === "bp") ok = validateBP();
        if (!ok) return;

        if (section === "bp") { renderResults(); goToStep(5); }
        else goToStep(currentStep + 1);
    }

    /* ============================================================
       VALIDATION HELPERS
       ============================================================ */
    function setError(id, msg) { const el = $("#" + id); if (el) el.textContent = msg || ""; }
    function clearError(id) { setError(id, ""); }
    function markInvalid(inputId, invalid) {
        const el = $("#" + inputId); if (el) el.classList.toggle("invalid", invalid);
    }
    function num(id) {
        const raw = $("#" + id).value.trim();
        if (raw === "") return null;
        const v = Number(raw);
        return isNaN(v) ? null : v;
    }
    function sanity(value, range) {
        if (value == null) return "empty";
        if (value < range.min || value > range.max) return "out";
        return "ok";
    }

    function updateAgeHint() {
        const y = num("yearOfBirth");
        const hint = $("#ageHint");
        if (y == null) { hint.textContent = ""; return; }
        const age = calculateAge(y);
        hint.textContent = (age >= 0 && age < 130) ? `Calculated age: ${age} years` : "";
    }

    function validateDemographics() {
        let valid = true;
        const name = $("#name").value.trim();
        if (!name) { setError("err-name", "Name cannot be blank."); markInvalid("name", true); valid = false; }
        else { clearError("err-name"); markInvalid("name", false); state.participant.name = name; }

        if (!state.participant.gender) { setError("err-gender", "Please select a gender."); valid = false; }
        else clearError("err-gender");

        const year = num("yearOfBirth");
        const currentYear = new Date().getFullYear();
        if (year == null) { setError("err-year", "Please enter a four-digit year of birth."); markInvalid("yearOfBirth", true); valid = false; }
        else if (year > currentYear) { setError("err-year", "Year of birth cannot be in the future."); markInvalid("yearOfBirth", true); valid = false; }
        else if (year < 1900) { setError("err-year", "Please check the year of birth."); markInvalid("yearOfBirth", true); valid = false; }
        else {
            const age = calculateAge(year);
            if (age < 0 || age > 130) { setError("err-year", "The calculated age is not plausible. Please check."); markInvalid("yearOfBirth", true); valid = false; }
            else {
                clearError("err-year"); markInvalid("yearOfBirth", false);
                state.participant.yearOfBirth = year; state.participant.age = age;
            }
        }

        const location = $("#location").value;
        if (!location) { setError("err-location", "Please select a test location."); markInvalid("location", true); valid = false; }
        else { clearError("err-location"); markInvalid("location", false); state.participant.location = location; }

        return valid;
    }

    // Generic sanity-with-confirmation validator
    function checkField(id, errId, range, confirmKey, target, targetKey, confirmMsg) {
        const v = num(id);
        const s = sanity(v, range);
        if (s === "empty") { setError(errId, "Please enter a value."); markInvalid(id, true); return false; }
        if (s === "out" && !state.confirmed[confirmKey]) {
            setError(errId, confirmMsg); state.confirmed[confirmKey] = true; return false;
        }
        clearError(errId); markInvalid(id, false); target[targetKey] = v; return true;
    }

    function validateBMI() {
        const a = checkField("heightCm", "err-height", CONFIG.inputRanges.heightCm, "height",
            state.anthropometry, "heightCm", "This value is unusual. Tap Continue again to confirm.");
        const b = checkField("weightKg", "err-weight", CONFIG.inputRanges.weightKg, "weight",
            state.anthropometry, "weightKg", "This value is unusual. Tap Continue again to confirm.");
        return a && b;
    }

    function validateBodyComp() {
        const a = checkField("bodyFat", "err-bodyfat", CONFIG.inputRanges.bodyFatPct, "bodyfat",
            state.bodyComposition, "bodyFatPercent", "This value is unusual. Tap Continue again to confirm.");
        const b = checkField("bmr", "err-bmr", CONFIG.inputRanges.bmrKcalDay, "bmr",
            state.bodyComposition, "bmrKcalDay", "This value is unusual. Tap Continue again to confirm.");
        return a && b;
    }

    function validateBP() {
        const a = checkField("systolic", "err-systolic", CONFIG.inputRanges.systolicBP, "systolic",
            state.cardiovascular, "systolicBP", "This value is unusual. Tap View Results again to confirm.");
        const b = checkField("diastolic", "err-diastolic", CONFIG.inputRanges.diastolicBP, "diastolic",
            state.cardiovascular, "diastolicBP", "This value is unusual. Tap View Results again to confirm.");
        const c = checkField("restingHR", "err-hr", CONFIG.inputRanges.restingHR, "hr",
            state.cardiovascular, "restingHeartRate", "This value is unusual. Tap View Results again to confirm.");
        return a && b && c;
    }

    /* ============================================================
       LIVE CALCULATIONS (real-time, no button press)
       ============================================================ */
    function liveBMI() {
        const h = num("heightCm"), w = num("weightKg");
        const box = $("#bmiLive");
        if (h == null || w == null || h <= 0) { box.classList.add("hidden"); return; }
        const bmi = calculateBMI(w, h);
        const age = state.participant.age;
        const cls = classifyBMI(bmi, age);

        if (!cls) {
            box.classList.remove("hidden");
            box.innerHTML =
                `<div class="live-value">${bmi} <span class="live-unit">kg/m²</span></div>
                 <div class="live-note">Adult BMI classification is not appropriate for this age group.</div>`;
            return;
        }
        box.classList.remove("hidden");
        box.innerHTML =
            `<div class="live-value">${bmi} <span class="live-unit">kg/m²</span></div>
             <span class="live-class" style="background:${cls.color}">${cls.icon} ${cls.label}</span>
             <div class="live-note">${cls.interpretation}</div>
             ${bmiGauge(bmi)}`;
    }

    function liveBodyComp() {
        const bf = num("bodyFat"), bmr = num("bmr");
        const box = $("#bodyCompLive");
        if (bf == null && bmr == null) { box.classList.add("hidden"); return; }
        let html = "";

        if (bf != null) {
            const cls = classifyBodyFat(bf, state.participant.gender, state.participant.age);
            if (cls) {
                html += `<div class="live-value">${bf}<span class="live-unit">%</span> body fat</div>
                         <span class="live-class" style="background:${cls.color}">${cls.icon} ${cls.label}</span>
                         <div class="live-note">${cls.interpretation}</div>`;
            } else {
                html += `<div class="live-value">${bf}<span class="live-unit">%</span> body fat</div>
                         <div class="live-note">A body-fat reference classification requires an adult age and gender.</div>`;
            }
        }
        if (bmr != null) {
            html += `<div class="live-note" style="margin-top:12px">
                        <strong>Device-reported BMR:</strong> ${bmr.toLocaleString()} kcal/day.
                        This is the estimated amount of energy the body uses each day at rest.
                     </div>`;
        }
        box.classList.remove("hidden");
        box.innerHTML = html;
    }

    function liveBP() {
        const sys = num("systolic"), dia = num("diastolic"), hr = num("restingHR");
        const box = $("#bpLive");
        let html = "";

        if (sys != null && dia != null) {
            const cls = classifyBP(sys, dia);
            html += `<div class="live-value">${sys} / ${dia} <span class="live-unit">mmHg</span></div>
                     <span class="live-class" style="background:${cls.color}">${cls.icon} ${cls.label}</span>
                     <div class="live-note">${cls.interpretation}</div>
                     ${bpGauge(sys)}`;
            if (cls.crisisMessage) {
                html += `<div class="confirm-note">${cls.crisisMessage}</div>`;
            }
        }
        if (hr != null) {
            const hrCls = classifyRestingHR(hr, state.participant.age);
            if (hrCls) {
                html += `<div class="live-note" style="margin-top:12px">
                            <strong>Resting heart rate:</strong> ${hr} bpm —
                            <span style="color:${hrCls.color};font-weight:700">${hrCls.label}</span>.
                            ${hrCls.interpretation}
                         </div>`;
            } else {
                html += `<div class="live-note" style="margin-top:12px">
                            <strong>Resting heart rate:</strong> ${hr} bpm. Adult interpretation is not applied for this age group.
                         </div>`;
            }
        }
        if (!html) { box.classList.add("hidden"); return; }
        box.classList.remove("hidden");
        box.innerHTML = html;
    }

    /* ============================================================
       GAUGES (text labels + colour, per accessibility rules)
       ============================================================ */
    function bmiGauge(bmi) {
        const { min, max } = BMI_GAUGE;
        const pos = gaugePosition(bmi, min, max);
        // segment widths proportional to thresholds 18.5, 23, 27.5 within [15,35]
        const segs = [
            { to: 18.5, color: "#6ba3c4" },
            { to: 23.0, color: "#5a9367" },
            { to: 27.5, color: "#d9a441" },
            { to: max,  color: "#c97b63" }
        ];
        let prev = min, bars = "";
        segs.forEach((s) => {
            const w = ((s.to - prev) / (max - min)) * 100;
            bars += `<div class="gauge-seg" style="width:${w}%;background:${s.color}"></div>`;
            prev = s.to;
        });
        return `<div class="gauge" role="img" aria-label="BMI ${bmi} on scale from underweight to high risk">
                    <div class="gauge-bar">${bars}
                        <div class="gauge-marker" style="left:${pos}%"></div>
                    </div>
                    <div class="gauge-labels">
                        <span>Underweight</span><span>Healthy</span><span>Increased</span><span>High Risk</span>
                    </div>
                </div>`;
    }

    function bodyFatGauge(bf, band) {
        // Scale 0..(highThreshold + 10) with low/healthy/elevated/high bands
        const max = band.highThreshold + 10;
        const pos = gaugePosition(bf, 0, max);
        const stops = [
            { to: band.healthyLow,   color: "#6ba3c4" },
            { to: band.healthyHigh,  color: "#5a9367" },
            { to: band.highThreshold, color: "#d9a441" },
            { to: max,               color: "#c97b63" }
        ];
        let prev = 0, bars = "";
        stops.forEach((s) => {
            const w = ((s.to - prev) / max) * 100;
            bars += `<div class="gauge-seg" style="width:${w}%;background:${s.color}"></div>`;
            prev = s.to;
        });
        return `<div class="gauge" role="img" aria-label="Body fat ${bf}% relative to reference range">
                    <div class="gauge-bar">${bars}
                        <div class="gauge-marker" style="left:${pos}%"></div>
                    </div>
                    <div class="gauge-labels">
                        <span>Low</span><span>Healthy</span><span>Elevated</span><span>High</span>
                    </div>
                </div>`;
    }

    function bpGauge(sys) {
        const { min, max } = BP_GAUGE;
        const pos = gaugePosition(sys, min, max);
        const segs = [
            { to: 120, color: "#5a9367" },
            { to: 130, color: "#d9a441" },
            { to: 140, color: "#d99441" },
            { to: 180, color: "#c97b63" },
            { to: max, color: "#b5503a" }
        ];
        let prev = min, bars = "";
        segs.forEach((s) => {
            const w = ((s.to - prev) / (max - min)) * 100;
            bars += `<div class="gauge-seg" style="width:${w}%;background:${s.color}"></div>`;
            prev = s.to;
        });
        return `<div class="gauge" role="img" aria-label="Systolic ${sys} on blood pressure scale">
                    <div class="gauge-bar">${bars}
                        <div class="gauge-marker" style="left:${pos}%"></div>
                    </div>
                    <div class="gauge-labels">
                        <span>Normal</span><span>Elevated</span><span>Stage 1</span><span>Stage 2</span><span>Crisis</span>
                    </div>
                </div>`;
    }

    /* ============================================================
       BUILD RESULT OBJECT
       ============================================================ */
    function buildResult() {
        const p = state.participant;
        const a = state.anthropometry;
        const b = state.bodyComposition;
        const c = state.cardiovascular;

        const bmi = calculateBMI(a.weightKg, a.heightCm);
        const bmiClass = classifyBMI(bmi, p.age);
        const bodyFatClass = classifyBodyFat(b.bodyFatPercent, p.gender, p.age);
        const estBmr = estimateBMR_MifflinStJeor(a.weightKg, a.heightCm, p.age, p.gender);
        const bmrDiff = bmrDifference(b.bmrKcalDay, estBmr);
        const bpClass = classifyBP(c.systolicBP, c.diastolicBP);
        const hrClass = classifyRestingHR(c.restingHeartRate, p.age);

        // Recommendation inputs
        const recInputs = {
            bmiResult: { classification: bmiClass },
            bodyFatResult: bodyFatClass,
            bpResult: bpClass,
            hrResult: hrClass
        };

        const recommendations = {
            bmiRecommendation: getBMIRecommendation({ classification: bmiClass }),
            bodyFatRecommendation: getBodyFatRecommendation(bodyFatClass),
            bloodPressureRecommendation: getBloodPressureRecommendation(bpClass),
            heartRateRecommendation: getHeartRateRecommendation(hrClass),
            overallRecommendation: getOverallRecommendation(recInputs)
        };

        const result = {
            sessionId: generateSessionId(),
            timestamp: new Date().toISOString(),
            participant: {
                name: p.name, gender: p.gender,
                yearOfBirth: p.yearOfBirth, age: p.age, location: p.location
            },
            anthropometry: {
                heightCm: a.heightCm, weightKg: a.weightKg,
                bmi: bmi,
                bmiClassification: bmiClass ? bmiClass.label : "Not applicable (non-adult)"
            },
            bodyComposition: {
                bodyFatPercent: b.bodyFatPercent,
                bodyFatClassification: bodyFatClass ? bodyFatClass.label : "Not applicable",
                bmrKcalDay: b.bmrKcalDay,
                estimatedBmrKcalDay: estBmr,
                bmrDifference: bmrDiff
            },
            cardiovascular: {
                systolicBP: c.systolicBP, diastolicBP: c.diastolicBP,
                bloodPressureClassification: bpClass.label,
                restingHeartRate: c.restingHeartRate,
                restingHeartRateClassification: hrClass ? hrClass.label : "Not applicable (non-adult)"
            },
            recommendations,
            overallFlag: getOverallFlag(recInputs),
            // keep rich objects for rendering (not sent to sheet)
            _render: { bmi, bmiClass, bodyFatClass, estBmr, bmrDiff, bpClass, hrClass }
        };
        return result;
    }

    let lastResult = null;

    /* ============================================================
       RENDER RESULTS PAGE
       ============================================================ */
    function renderResults() {
        const r = buildResult();
        lastResult = r;
        const rd = r._render;
        const p = r.participant;
        const dateStr = new Date(r.timestamp).toLocaleString();

        const flagText = {
            green: "Within reference ranges",
            amber: "Some findings worth monitoring",
            red: "A potentially significant reading was recorded"
        };

        let html = `
        <div class="results-header">
            <h1>🌿 Pulau Ubin Health Check</h1>
            <p class="sub">Results Summary</p>
        </div>`;

        // Crisis alert (BP)
        if (rd.bpClass && rd.bpClass.crisisMessage) {
            html += `<div class="crisis-alert">
                        <strong>⚠️ Very high blood pressure reading</strong>
                        ${rd.bpClass.crisisMessage}
                     </div>`;
        }

        // Overall flag banner
        html += `<div class="flag-banner flag-${r.overallFlag}">
                    ${r.overallFlag === "green" ? "✅" : r.overallFlag === "amber" ? "🟡" : "🔴"}
                    ${flagText[r.overallFlag]}
                 </div>`;

        // Participant card
        html += `<div class="participant-card">
            <dl>
                <dt>Name</dt><dd>${escapeHtml(p.name)}</dd>
                <dt>Age</dt><dd>${p.age} years</dd>
                <dt>Gender</dt><dd>${p.gender}</dd>
                <dt>Location</dt><dd>${p.location}</dd>
                <dt>Date</dt><dd>${dateStr}</dd>
            </dl>
            <div class="session-id">Session: ${r.sessionId}</div>
        </div>`;

        // Health snapshot
        html += `<div class="snapshot">
            <h2>Your Health Snapshot</h2>
            <div class="snapshot-grid">
                ${snapshotItem("⚖️", "BMI", rd.bmiClass ? rd.bmiClass.label : "N/A", rd.bmiClass ? rd.bmiClass.color : "#999")}
                ${snapshotItem("🍃", "Body Comp.", rd.bodyFatClass ? rd.bodyFatClass.label : "N/A", rd.bodyFatClass ? rd.bodyFatClass.color : "#999")}
                ${snapshotItem("🌊", "Blood Pressure", rd.bpClass.label, rd.bpClass.color)}
                ${snapshotItem("❤️", "Heart Rate", rd.hrClass ? rd.hrClass.label : "N/A", rd.hrClass ? rd.hrClass.color : "#999")}
            </div>
        </div>`;

        // ---- Result cards ----
        // BMI
        html += resultCard({
            icon: "⚖️", title: "Body Mass Index",
            value: r.anthropometry.bmi, unit: "kg/m²",
            badge: rd.bmiClass ? rd.bmiClass.label : null,
            color: rd.bmiClass ? rd.bmiClass.color : null,
            note: rd.bmiClass ? rd.bmiClass.interpretation : "Adult BMI classification is not appropriate for this age group.",
            extra: rd.bmiClass ? bmiGauge(r.anthropometry.bmi) : ""
        });

        // Body Fat
        html += resultCard({
            icon: "🍃", title: "Body Fat",
            value: r.bodyComposition.bodyFatPercent, unit: "%",
            badge: rd.bodyFatClass ? rd.bodyFatClass.label : null,
            color: rd.bodyFatClass ? rd.bodyFatClass.color : null,
            note: rd.bodyFatClass ? rd.bodyFatClass.interpretation : "A body-fat reference classification requires an adult age and gender.",
            extra: rd.bodyFatClass ? bodyFatGauge(r.bodyComposition.bodyFatPercent, rd.bodyFatClass.band) : ""
        });

        // BMR
        let bmrExtra = `<div class="rc-subvalue">Device-reported BMR.</div>`;
        if (rd.estBmr != null) {
            bmrExtra += `<div class="rc-subvalue">Estimated BMR (Mifflin-St Jeor): <strong>${rd.estBmr.toLocaleString()}</strong> kcal/day.`;
            if (rd.bmrDiff != null) {
                const sign = rd.bmrDiff >= 0 ? "+" : "";
                bmrExtra += ` Difference: ${sign}${rd.bmrDiff} kcal/day (informational only, not a diagnosis).`;
            }
            bmrExtra += `</div>`;
        }
        html += resultCard({
            icon: "🔥", title: "Basal Metabolic Rate (BMR)",
            value: r.bodyComposition.bmrKcalDay ? r.bodyComposition.bmrKcalDay.toLocaleString() : "—",
            unit: "kcal/day",
            badge: null, color: null,
            note: "This is the estimated amount of energy your body uses each day at rest. BMR is not a disease-risk indicator.",
            extra: bmrExtra
        });

        // Blood Pressure + HR
        let bpNote = rd.bpClass.interpretation;
        let hrLine = "";
        if (rd.hrClass) {
            hrLine = `<div class="rc-subvalue">Resting heart rate: <strong>${r.cardiovascular.restingHeartRate} bpm</strong> —
                      <span style="color:${rd.hrClass.color};font-weight:700">${rd.hrClass.label}</span>. ${rd.hrClass.interpretation}</div>`;
        } else {
            hrLine = `<div class="rc-subvalue">Resting heart rate: <strong>${r.cardiovascular.restingHeartRate} bpm</strong>. Adult interpretation is not applied for this age group.</div>`;
        }
        html += resultCard({
            icon: "🌊", title: "Blood Pressure & Resting Heart Rate",
            value: `${r.cardiovascular.systolicBP} / ${r.cardiovascular.diastolicBP}`, unit: "mmHg",
            badge: rd.bpClass.label, color: rd.bpClass.color,
            note: bpNote,
            extra: bpGauge(r.cardiovascular.systolicBP) + hrLine
        });

        // ---- Recommendations (prioritised order; skip empty) ----
        const rec = r.recommendations;
        const recItems = [
            { cls: "overall", text: rec.overallRecommendation },
            { cls: "", text: rec.bloodPressureRecommendation },
            { cls: "", text: rec.heartRateRecommendation },
            { cls: "", text: rec.bodyFatRecommendation },
            { cls: "", text: rec.bmiRecommendation }
        ].filter((i) => i.text && i.text.trim());
        html += `<div class="rec-card">
            <h2>Recommendations</h2>
            <ul class="rec-list">
                ${recItems.map((i) => `<li class="${i.cls}">${i.text}</li>`).join("")}
            </ul>
        </div>`;

        // ---- Disclaimer ----
        html += `<div class="disclaimer">
            <strong>Disclaimer.</strong> This health check provides general screening information based on
            the measurements entered. It is not a medical diagnosis and should not replace consultation
            with a qualified healthcare professional.
        </div>`;

        // ---- Actions ----
        html += `<div class="results-actions">
            <button class="btn btn-primary" id="saveBtn">💾 Save Result</button>
            <button class="btn btn-ghost" id="printBtn">🖨️ Print / Save as PDF</button>
            <button class="btn btn-ghost" id="viewSavedBtn">📁 View Saved Results</button>
            <button class="btn btn-ghost" id="newBtn">🔄 New Health Check</button>
        </div>`;

        $("#resultsRoot").innerHTML = html;

        $("#saveBtn").addEventListener("click", saveResult);
        $("#printBtn").addEventListener("click", () => window.print());
        $("#viewSavedBtn").addEventListener("click", openSaved);
        $("#newBtn").addEventListener("click", newHealthCheck);
    }

    function snapshotItem(icon, label, status, color) {
        return `<div class="snapshot-item">
                    <span class="snapshot-icon">${icon}</span>
                    <span>
                        <span class="snapshot-label">${label}</span><br>
                        <span class="snapshot-status" style="color:${color}">${status}</span>
                    </span>
                </div>`;
    }

    function resultCard(o) {
        return `<div class="result-card">
            <div class="rc-head">
                <div class="rc-icon">${o.icon}</div>
                <div>
                    <p class="rc-title">${o.title}</p>
                    <div class="rc-value">${o.value} <span class="rc-unit">${o.unit}</span></div>
                </div>
            </div>
            ${o.badge ? `<span class="badge" style="background:${o.color}">${o.badge}</span>` : ""}
            <p class="rc-note">${o.note}</p>
            ${o.extra || ""}
        </div>`;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (m) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
    }

    /* ============================================================
       SAVE / RESET / SAVED-RESULTS
       ============================================================ */
    async function saveResult() {
        if (!lastResult) return;
        const toStore = { ...lastResult };
        delete toStore._render; // don't persist render helpers
        const ok = STORAGE.save(toStore);

        // Optional Google Sheets submission (no-op when disabled)
        if (CONFIG.googleSheets.enabled) {
            await GOOGLE_SHEETS.submitResultToGoogleSheets(toStore);
        }

        const btn = $("#saveBtn");
        btn.textContent = ok ? "✅ Saved" : "⚠️ Save failed";
        btn.disabled = ok;
    }

    function newHealthCheck() {
        // Reset state and all inputs
        state.participant = { name: "", gender: "", yearOfBirth: null, age: null, location: "" };
        state.anthropometry = { heightCm: null, weightKg: null };
        state.bodyComposition = { bodyFatPercent: null, bmrKcalDay: null };
        state.cardiovascular = { systolicBP: null, diastolicBP: null, restingHeartRate: null };
        state.confirmed = {};
        lastResult = null;

        ["name", "yearOfBirth", "heightCm", "weightKg", "bodyFat", "bmr",
         "systolic", "diastolic", "restingHR"].forEach((id) => { $("#" + id).value = ""; });
        $("#location").value = "";
        $$("#gender .seg").forEach((b) => b.classList.remove("selected"));
        ["bmiLive", "bodyCompLive", "bpLive"].forEach((id) => {
            $("#" + id).classList.add("hidden"); $("#" + id).innerHTML = "";
        });
        $("#ageHint").textContent = "";
        $$(".field-error").forEach((e) => e.textContent = "");
        $$("input, select").forEach((e) => e.classList.remove("invalid"));

        goToStep(1);
    }

    function openSaved() {
        renderSavedList();
        $("#savedModal").classList.remove("hidden");
    }

    function renderSavedList() {
        const list = STORAGE.getAll();
        const container = $("#savedList");
        if (!list.length) {
            container.innerHTML = `<p class="empty-note">No saved results yet.</p>`;
            return;
        }
        container.innerHTML = list.slice().reverse().map((r) => {
            const d = new Date(r.timestamp).toLocaleString();
            return `<div class="saved-item">
                <div class="si-name">${escapeHtml(r.participant.name)} <span class="si-meta">(${r.participant.age}y, ${r.participant.gender})</span></div>
                <div class="si-meta">${r.participant.location} · ${d}</div>
                <div class="si-meta">BMI ${r.anthropometry.bmi} · BP ${r.cardiovascular.systolicBP}/${r.cardiovascular.diastolicBP} · ${r.overallFlag.toUpperCase()}</div>
                <div class="si-actions">
                    <button class="btn btn-danger" data-del="${r.sessionId}">Delete</button>
                </div>
            </div>`;
        }).join("");

        $$("[data-del]").forEach((b) =>
            b.addEventListener("click", () => {
                STORAGE.deleteOne(b.dataset.del);
                renderSavedList();
            }));
    }

    function deleteAllSaved() {
        if (confirm("Delete ALL saved results? This cannot be undone.")) {
            STORAGE.deleteAll();
            renderSavedList();
        }
    }

    // ---- boot ----
    // Scripts are loaded at the end of <body>, so the DOM is ready here.
    // Guard just in case this file is ever moved into <head>.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
