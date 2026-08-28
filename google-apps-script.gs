/**
 * PULAU UBIN HEALTH CHECK — Google Apps Script
 *
 * Receives POST requests from the web app and appends each result
 * as a new row in this Google Sheet.
 *
 * SETUP (do this from INSIDE the sheet you want data in):
 *   1. Open your Google Sheet.
 *   2. Extensions -> Apps Script.
 *   3. Delete any starter code, paste this ENTIRE file, click Save (disk icon).
 *   4. Deploy -> New deployment -> (gear) Web app
 *         Description : Ubin Health Check
 *         Execute as  : Me
 *         Who has access : Anyone
 *      Click Deploy, then Authorize access and allow the permissions.
 *   5. Copy the "Web app" URL (ends with /exec).
 *   6. In config.js set:
 *         googleSheets: { enabled: true, webAppUrl: "PASTE_URL_HERE" }
 *
 * Because this script is bound to the sheet, it writes to the ACTIVE
 * spreadsheet automatically — no spreadsheet ID needs to be pasted.
 */

const SHEET_NAME = "Results";

function doPost(e) {
  try {
    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error("No data received");
    }

    const sheet = getOrCreateSheet();
    ensureHeaders(sheet);
    sheet.appendRow(buildRow(data));

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Saved" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "Pulau Ubin Health Check API is running" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Writes to the spreadsheet this script is bound to. */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getRange(1, 1).getValue() === "") {
    const headers = getHeaders();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
}

function getHeaders() {
  return [
    "Session ID", "Timestamp",
    "Name", "Gender", "Year of Birth", "Age", "Location",
    "Height (cm)", "Weight (kg)", "BMI", "BMI Classification",
    "Body Fat (%)", "Body Fat Classification",
    "BMR (kcal/day)", "Estimated BMR (kcal/day)", "BMR Difference",
    "Systolic BP", "Diastolic BP", "BP Classification",
    "Resting HR", "Resting HR Classification",
    "BMI Recommendation", "Body Fat Recommendation",
    "Blood Pressure Recommendation", "Heart Rate Recommendation",
    "Overall Recommendation", "Overall Flag"
  ];
}

function buildRow(d) {
  return [
    d.sessionId || "", d.timestamp || new Date().toISOString(),
    d.name || "", d.gender || "", d.yearOfBirth || "", d.age || "", d.location || "",
    d.heightCm || "", d.weightKg || "", d.bmi || "", d.bmiClassification || "",
    d.bodyFatPercent || "", d.bodyFatClassification || "",
    d.bmrKcalDay || "", d.estimatedBmrKcalDay || "", d.bmrDifference || "",
    d.systolicBP || "", d.diastolicBP || "", d.bloodPressureClassification || "",
    d.restingHeartRate || "", d.restingHeartRateClassification || "",
    d.bmiRecommendation || "", d.bodyFatRecommendation || "",
    d.bloodPressureRecommendation || "", d.heartRateRecommendation || "",
    d.overallRecommendation || "", d.overallFlag || ""
  ];
}
