/**
 * PULAU UBIN HEALTH CHECK — Google Apps Script (FUTURE integration)
 *
 * Receives POST requests from the web app and appends result data
 * to a Google Sheet. This file is NOT used until you deploy it and
 * set CONFIG.googleSheets.enabled = true with the Web App URL.
 *
 * SETUP:
 *   1. Create a new Google Sheet.
 *   2. Extensions -> Apps Script.
 *   3. Paste this entire file.
 *   4. Replace SPREADSHEET_ID with your Google Sheet ID.
 *   5. Deploy -> New deployment -> Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *   6. Copy the Web App URL into config.js -> googleSheets.webAppUrl
 *      and set googleSheets.enabled = true.
 */

const SPREADSHEET_ID = "REPLACE_WITH_YOUR_SHEET_ID";
const SHEET_NAME = "Results";

function doPost(e) {
  try {
    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
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

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
