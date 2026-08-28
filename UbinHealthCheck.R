# =============================================================================
# PULAU UBIN HEALTH CHECK — Live Analytics Dashboard (R Shiny)
# -----------------------------------------------------------------------------
# A professional, medical-analysis-oriented dashboard that pulls screening
# results LIVE from the same Google Sheet the web app writes to, and presents
# clean, NHG / HealthHub-style visualisations.
#
# -----------------------------------------------------------------------------
# 1. DEPENDENCIES  (install once)
#    install.packages(c(
#      "shiny", "bslib", "bsicons", "readr", "dplyr", "tidyr",
#      "ggplot2", "scales", "DT", "lubridate", "stringr"
#    ))
#
# 2. DATA SOURCE  (choose ONE and set SHEET_CSV_URL below)
#    Recommended (simplest, read-only, no auth):
#      In your Google Sheet:  File -> Share -> Publish to web
#        - Choose the "Results" sheet (tab)
#        - Format: Comma-separated values (.csv)
#        - Publish, then copy the generated URL. It looks like:
#          https://docs.google.com/spreadsheets/d/e/<TOKEN>/pub?gid=<GID>&single=true&output=csv
#      Paste that into SHEET_CSV_URL.
#
#    Alternative (no publishing) — export CSV endpoint of a shared sheet:
#      https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Results
#      (the sheet must be shared as "Anyone with the link: Viewer").
#
# 3. RUN
#      shiny::runApp("shiny")          # from the PulauUbinHealthCheck folder
#    The dashboard auto-refreshes every AUTO_REFRESH_SECONDS.
#
# NOTE: This app only READS data. It never writes back to the sheet.
# =============================================================================

library(shiny)
library(bslib)
library(bsicons)
library(readr)
library(dplyr)
library(tidyr)
library(ggplot2)
library(scales)
library(DT)
library(lubridate)
library(stringr)

# ---- CONFIGURE ME -----------------------------------------------------------
# Primary source: published-to-web CSV URL (File -> Share -> Publish to web).
SHEET_CSV_URL <- "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQsiHKyHuhAFumu9FowWhsO9VUKN9YPTuu8sv3gy4XGfMuKWFPm26QGfHvefaMvKg-YVXUwvChuGos/pub?gid=524680892&single=true&output=csv"

# Fallback source (used automatically if the published CSV fails): the sheet's
# gviz CSV export. Requires the sheet to be shared as "Anyone with the link:
# Viewer". Fill in your Sheet ID (the long token in the /d/<ID>/edit URL) and
# the exact tab name. Leave SHEET_ID as "" to disable the fallback.
SHEET_ID    <- ""            # e.g. "1PMJXAYMfoch_wobfw6snp4UpxHtsKr93H5iUdG3kx8w"
SHEET_TAB   <- "Results"     # the tab (sheet) name the app writes to

AUTO_REFRESH_SECONDS <- 60      # how often the dashboard re-reads the sheet
# -----------------------------------------------------------------------------

gviz_csv_url <- function() {
  if (is.null(SHEET_ID) || !nzchar(SHEET_ID)) return("")
  sprintf(
    "https://docs.google.com/spreadsheets/d/%s/gviz/tq?tqx=out:csv&sheet=%s",
    SHEET_ID, utils::URLencode(SHEET_TAB, reserved = TRUE)
  )
}

# ---- THEME (calm greens/teals, HealthHub/NHG feel) --------------------------
# Refined, HealthHub/GovTech-inspired palette: deep teal-green primary,
# clean neutrals, and a restrained data-viz accent set.
UBIN <- list(
  primary   = "#0f6e4f",  # deep HealthHub-style green
  primary_d = "#0a5540",  # darker green (gradients/hover)
  teal      = "#2f9e8f",  # secondary teal
  mint      = "#5bbfa5",
  amber     = "#e0a23a",
  coral     = "#e07a5f",
  red       = "#c0492f",
  blue      = "#4a90b8",
  slate     = "#334155",  # heading ink
  ink       = "#1f2a37",  # body ink
  muted     = "#64748b",  # secondary text
  line      = "#e6ebe8",  # hairline borders
  bg        = "#f2f5f3",  # app background
  card      = "#ffffff"
)

ubin_theme <- bs_theme(
  version      = 5,
  bg           = UBIN$bg,
  fg           = UBIN$ink,
  primary      = UBIN$primary,
  secondary    = UBIN$teal,
  success      = UBIN$primary,
  warning      = UBIN$amber,
  danger       = UBIN$red,
  base_font    = font_google("Inter"),
  heading_font = font_google("Plus Jakarta Sans"),
  "border-radius"      = "14px",
  "card-border-radius" = "16px",
  "card-border-color"  = UBIN$line,
  "card-cap-bg"        = "#ffffff"
)

# ---- ggplot base theme (clean, editorial, generous whitespace) --------------
theme_ubin <- function(base_size = 13) {
  theme_minimal(base_size = base_size, base_family = "Inter") +
    theme(
      plot.background  = element_rect(fill = "white", colour = NA),
      panel.background = element_rect(fill = "white", colour = NA),
      panel.grid.minor = element_blank(),
      panel.grid.major.x = element_blank(),
      panel.grid.major.y = element_line(colour = "#eef2f0", linewidth = .6),
      plot.title       = element_text(face = "bold", colour = UBIN$slate,
                                      size = base_size + 1),
      plot.margin      = margin(10, 14, 8, 8),
      axis.title       = element_text(colour = UBIN$muted, size = base_size - 1),
      axis.text        = element_text(colour = UBIN$muted),
      axis.ticks       = element_blank(),
      legend.position  = "bottom",
      legend.title     = element_text(colour = UBIN$muted, size = base_size - 2),
      legend.text      = element_text(colour = UBIN$slate, size = base_size - 2)
    )
}

CAT_COLORS <- c(
  # BMI
  "Underweight" = UBIN$blue, "Healthy Range" = UBIN$primary,
  "Increased Risk" = UBIN$amber, "High Risk" = UBIN$coral,
  # BP
  "Normal" = UBIN$primary, "Elevated" = UBIN$amber,
  "Hypertension Stage 1" = "#d98a3d", "Hypertension Stage 2" = UBIN$coral,
  "Hypertensive Crisis-Level Reading" = UBIN$red,
  # Flags
  "green" = UBIN$primary, "amber" = UBIN$amber, "red" = UBIN$red,
  # Body fat
  "Low" = UBIN$blue, "Healthy / Recommended" = UBIN$primary,
  "Elevated" = UBIN$amber, "High" = UBIN$coral
)

# =============================================================================
# DATA LOADING & CLEANING
# =============================================================================

# Expected sheet headers (must match google-apps-script.gs getHeaders()).
EXPECTED_COLS <- c(
  "Session ID","Timestamp","Name","Gender","Year of Birth","Age","Location",
  "Height (cm)","Weight (kg)","BMI","BMI Classification",
  "Body Fat (%)","Body Fat Classification",
  "BMR (kcal/day)","Estimated BMR (kcal/day)","BMR Difference",
  "Systolic BP","Diastolic BP","BP Classification",
  "Resting HR","Resting HR Classification",
  "BMI Recommendation","Body Fat Recommendation",
  "Blood Pressure Recommendation","Heart Rate Recommendation",
  "Overall Recommendation","Overall Flag"
)

empty_frame <- function() {
  df <- as.data.frame(matrix(nrow = 0, ncol = length(EXPECTED_COLS)))
  names(df) <- EXPECTED_COLS
  df
}

# Try to read a CSV URL. Returns a data.frame, or NULL if the response is not
# valid CSV (e.g. a Google HTML error page returned with HTTP 400).
try_read_csv <- function(url) {
  if (is.null(url) || !nzchar(url) || startsWith(url, "PASTE_")) return(NULL)
  txt <- tryCatch(
    paste(readLines(url, warn = FALSE, encoding = "UTF-8"), collapse = "\n"),
    error = function(e) NULL
  )
  if (is.null(txt) || !nzchar(txt)) return(NULL)
  # Reject HTML error pages (published link not ready / wrong gid, etc.)
  if (grepl("<!DOCTYPE html|<html", txt, ignore.case = TRUE)) return(NULL)
  raw <- tryCatch(
    readr::read_csv(I(txt), show_col_types = FALSE, progress = FALSE),
    error = function(e) NULL
  )
  if (is.null(raw) || nrow(raw) == 0) return(NULL)
  as.data.frame(raw)
}

load_data <- function() {
  # 1) Primary: published CSV
  df <- try_read_csv(SHEET_CSV_URL)
  # 2) Fallback: gviz export (needs "Anyone with link: Viewer")
  if (is.null(df)) df <- try_read_csv(gviz_csv_url())
  if (is.null(df)) return(empty_frame())
  df
}

# Standardise/parse columns into analysis-friendly types.
clean_data <- function(df) {
  if (nrow(df) == 0) {
    out <- data.frame(
      timestamp = as.POSIXct(character()),
      name = character(), gender = character(), age = numeric(),
      location = character(), height = numeric(), weight = numeric(),
      bmi = numeric(), bmi_class = character(),
      body_fat = numeric(), body_fat_class = character(),
      bmr = numeric(), est_bmr = numeric(), bmr_diff = numeric(),
      sbp = numeric(), dbp = numeric(), bp_class = character(),
      rhr = numeric(), rhr_class = character(), flag = character(),
      age_group = character(),
      stringsAsFactors = FALSE
    )
    return(out)
  }

  g <- function(col) if (col %in% names(df)) df[[col]] else rep(NA, nrow(df))
  n <- function(x) suppressWarnings(as.numeric(x))

  out <- data.frame(
    timestamp      = suppressWarnings(lubridate::ymd_hms(g("Timestamp"),
                        quiet = TRUE, tz = "UTC")),
    name           = as.character(g("Name")),
    gender         = as.character(g("Gender")),
    age            = n(g("Age")),
    location       = as.character(g("Location")),
    height         = n(g("Height (cm)")),
    weight         = n(g("Weight (kg)")),
    bmi            = n(g("BMI")),
    bmi_class      = as.character(g("BMI Classification")),
    body_fat       = n(g("Body Fat (%)")),
    body_fat_class = as.character(g("Body Fat Classification")),
    bmr            = n(g("BMR (kcal/day)")),
    est_bmr        = n(g("Estimated BMR (kcal/day)")),
    bmr_diff       = n(g("BMR Difference")),
    sbp            = n(g("Systolic BP")),
    dbp            = n(g("Diastolic BP")),
    bp_class       = as.character(g("BP Classification")),
    rhr            = n(g("Resting HR")),
    rhr_class      = as.character(g("Resting HR Classification")),
    flag           = as.character(g("Overall Flag")),
    stringsAsFactors = FALSE
  )

  # Convert UTC -> Singapore time for local reporting
  out$timestamp_sgt <- with_tz(out$timestamp, "Asia/Singapore")

  # Age groups commonly used in community health reporting
  out$age_group <- cut(
    out$age,
    breaks = c(-Inf, 39, 49, 59, 69, 79, Inf),
    labels = c("<40", "40-49", "50-59", "60-69", "70-79", "80+")
  )

  # Order categorical factors for clean plotting
  out$bmi_class <- factor(out$bmi_class,
    levels = c("Underweight","Healthy Range","Increased Risk","High Risk",
               "Not applicable (non-adult)"))
  out$bp_class <- factor(out$bp_class,
    levels = c("Normal","Elevated","Hypertension Stage 1",
               "Hypertension Stage 2","Hypertensive Crisis-Level Reading"))
  out$flag <- factor(out$flag, levels = c("green","amber","red"))

  out
}

# =============================================================================
# UI
# =============================================================================

ui <- page_navbar(
  title = tagList(
    span(bs_icon("heart-pulse-fill"), style = "margin-right:8px;"),
    span("Pulau Ubin Health Check", style = "font-weight:700;letter-spacing:.2px;")
  ),
  theme = ubin_theme,
  fillable = TRUE,
  window_title = "Pulau Ubin Health Check — Analytics",
  header = tags$head(tags$style(HTML(sprintf("
    :root { --ubin-primary:%1$s; --ubin-primary-d:%2$s; --ubin-teal:%3$s;
            --ubin-line:%4$s; --ubin-slate:%5$s; --ubin-muted:%6$s; }

    body { background: %7$s; color: %8$s; }

    /* ---- Top navigation bar ---- */
    .navbar {
      background: linear-gradient(90deg, var(--ubin-primary-d), var(--ubin-primary)) !important;
      box-shadow: 0 2px 14px rgba(15,110,79,.18);
      border: none !important;
      min-height: 60px;
    }
    .navbar .navbar-brand { color:#fff !important; font-size:1.15rem; }
    .navbar .nav-link { color: rgba(255,255,255,.82) !important; font-weight:500;
      border-radius:10px; padding:8px 14px !important; margin:0 2px; transition:all .15s ease; }
    .navbar .nav-link:hover { color:#fff !important; background: rgba(255,255,255,.12); }
    .navbar .nav-link.active { color:#fff !important; background: rgba(255,255,255,.18); font-weight:600; }

    /* ---- Sidebar ---- */
    .bslib-sidebar-layout > .sidebar {
      background:#ffffff; border-right:1px solid var(--ubin-line);
    }
    .sidebar .form-label, .sidebar label { color: var(--ubin-slate); font-weight:600; font-size:.82rem;
      text-transform:uppercase; letter-spacing:.4px; }
    .form-select, .selectize-input {
      border-radius:10px !important; border:1px solid var(--ubin-line) !important;
      box-shadow:none !important; color:var(--ubin-ink); font-weight:500;
    }
    .form-select:focus, .selectize-input.focus {
      border-color: var(--ubin-teal) !important; box-shadow:0 0 0 3px rgba(47,158,143,.18) !important;
    }

    /* ---- Cards ---- */
    .card {
      border:1px solid var(--ubin-line) !important;
      box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06);
      background:#fff; overflow:hidden;
    }
    .card > .card-header {
      background:#fff !important; color: var(--ubin-slate) !important;
      font-family:'Plus Jakarta Sans', sans-serif; font-weight:700; font-size:.95rem;
      letter-spacing:.1px; border-bottom:1px solid var(--ubin-line);
      padding:14px 18px; display:flex; align-items:center; gap:8px;
    }
    .card > .card-header::before {
      content:''; display:inline-block; width:4px; height:18px; border-radius:3px;
      background: linear-gradient(180deg, var(--ubin-primary), var(--ubin-teal));
    }
    .card-body { padding:16px 18px; }

    /* ---- KPI value boxes ---- */
    .bslib-value-box {
      border-radius:16px !important; border:1px solid var(--ubin-line) !important;
      box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 26px rgba(16,24,40,.07);
    }
    .bslib-value-box .value-box-title {
      font-size:.78rem !important; text-transform:uppercase; letter-spacing:.6px;
      font-weight:600; opacity:.92;
    }
    .bslib-value-box .value-box-value {
      font-family:'Plus Jakarta Sans', sans-serif !important;
      font-weight:800 !important; font-size:2.1rem !important; line-height:1.1;
    }
    .bslib-value-box .value-box-showcase { opacity:.9; }

    /* ---- Buttons ---- */
    .btn-primary {
      background: var(--ubin-primary); border-color: var(--ubin-primary);
      border-radius:10px; font-weight:600;
    }
    .btn-primary:hover { background: var(--ubin-primary-d); border-color: var(--ubin-primary-d); }

    /* ---- Data table ---- */
    table.dataTable thead th { color: var(--ubin-slate); font-family:'Plus Jakarta Sans',sans-serif;
      border-bottom:2px solid var(--ubin-line) !important; }
    .dataTables_wrapper .dataTables_filter input { border-radius:8px; border:1px solid var(--ubin-line); }

    .disclaimer { font-size:.82rem; color:var(--ubin-muted); line-height:1.5; }
    .last-update { font-size:.72rem; color:#94a3b8; }

    /* ---- KPI accents (white card + coloured icon + top rule) ---- */
    .kpi-accent-primary, .kpi-accent-teal, .kpi-accent-amber, .kpi-accent-coral {
      position:relative;
    }
    .kpi-accent-primary::before, .kpi-accent-teal::before,
    .kpi-accent-amber::before, .kpi-accent-coral::before {
      content:''; position:absolute; top:0; left:0; right:0; height:4px;
      border-radius:16px 16px 0 0;
    }
    .kpi-accent-primary::before { background:%1$s; }
    .kpi-accent-teal::before    { background:%3$s; }
    .kpi-accent-amber::before   { background:%9$s; }
    .kpi-accent-coral::before   { background:%10$s; }

    .bslib-value-box .value-box-showcase .bi { font-size:1.6rem; }
    .kpi-accent-primary .value-box-showcase { color:%1$s; }
    .kpi-accent-teal   .value-box-showcase { color:%3$s; }
    .kpi-accent-amber  .value-box-showcase { color:%9$s; }
    .kpi-accent-coral  .value-box-showcase { color:%10$s; }
    .bslib-value-box .value-box-showcase {
      background: rgba(15,110,79,.06); border-radius:14px; margin:14px;
      min-width:58px; display:flex; align-items:center; justify-content:center;
    }
    .kpi-accent-teal  .value-box-showcase { background: rgba(47,158,143,.08); }
    .kpi-accent-amber .value-box-showcase { background: rgba(224,162,58,.10); }
    .kpi-accent-coral .value-box-showcase { background: rgba(224,122,95,.10); }
  ", UBIN$primary, UBIN$primary_d, UBIN$teal, UBIN$line,
     UBIN$slate, UBIN$muted, UBIN$bg, UBIN$ink, UBIN$amber, UBIN$coral)))),

  # ---- Sidebar filters (shared) ----
  sidebar = sidebar(
    width = 290,
    title = tagList(bs_icon("funnel"), "Filters"),
    open = "desktop",
    selectInput("f_gender", "Gender",
                choices = c("All", "Male", "Female"), selected = "All"),
    selectInput("f_location", "Location", choices = c("All"), selected = "All"),
    selectInput("f_agegroup", "Age group",
                choices = c("All","<40","40-49","50-59","60-69","70-79","80+"),
                selected = "All"),
    hr(),
    div(class = "disclaimer",
        bs_icon("info-circle"),
        " Screening data only. Not for individual diagnosis. Auto-refreshes every ",
        AUTO_REFRESH_SECONDS, " seconds."),
    div(style = "margin-top:10px;",
        actionButton("refresh", "Refresh now",
                     icon = icon("rotate"), class = "btn-primary btn-sm")),
    div(style = "margin-top:6px; font-size:.75rem; color:#7a857e;",
        textOutput("last_update", inline = TRUE))
  ),

  # ---- TAB 1: Overview ----
  nav_panel(
    title = tagList(bs_icon("speedometer2"), "Overview"),
    layout_columns(
      fill = FALSE,
      value_box("Participants Screened", textOutput("kpi_n"),
                showcase = bs_icon("people-fill"),
                theme = value_box_theme(bg = "#ffffff", fg = UBIN$slate),
                showcase_layout = "left center",
                class = "kpi-accent-primary"),
      value_box("Mean BMI (kg/m²)", textOutput("kpi_bmi"),
                showcase = bs_icon("clipboard2-pulse"),
                theme = value_box_theme(bg = "#ffffff", fg = UBIN$slate),
                showcase_layout = "left center",
                class = "kpi-accent-teal"),
      value_box("Elevated / High BP", textOutput("kpi_bp"),
                showcase = bs_icon("activity"),
                theme = value_box_theme(bg = "#ffffff", fg = UBIN$slate),
                showcase_layout = "left center",
                class = "kpi-accent-amber"),
      value_box("Mean Resting HR (bpm)", textOutput("kpi_rhr"),
                showcase = bs_icon("heart-pulse"),
                theme = value_box_theme(bg = "#ffffff", fg = UBIN$slate),
                showcase_layout = "left center",
                class = "kpi-accent-coral")
    ),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("BMI Category Distribution"),
           plotOutput("p_bmi_cat", height = 300)),
      card(card_header("Blood Pressure Category Distribution"),
           plotOutput("p_bp_cat", height = 300))
    ),
    layout_columns(
      col_widths = c(4, 8),
      card(card_header("Overall Priority Flag"),
           plotOutput("p_flag", height = 280)),
      card(card_header("Screenings Over Time"),
           plotOutput("p_time", height = 280))
    )
  ),

  # ---- TAB 2: Distributions ----
  nav_panel(
    title = tagList(bs_icon("bar-chart-line"), "Distributions"),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("BMI (kg/m²)"), plotOutput("d_bmi", height = 280)),
      card(card_header("Body Fat (%)"), plotOutput("d_bf", height = 280))
    ),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("Systolic & Diastolic BP (mmHg)"),
           plotOutput("d_bp", height = 280)),
      card(card_header("Resting Heart Rate (bpm)"),
           plotOutput("d_rhr", height = 280))
    ),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("Basal Metabolic Rate (kcal/day)"),
           plotOutput("d_bmr", height = 280)),
      card(card_header("Age (years)"), plotOutput("d_age", height = 280))
    )
  ),

  # ---- TAB 3: Relationships ----
  nav_panel(
    title = tagList(bs_icon("graph-up"), "Relationships"),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("BMI vs Body Fat %"), plotOutput("r_bmi_bf", height = 300)),
      card(card_header("BMI vs Systolic BP"), plotOutput("r_bmi_sbp", height = 300))
    ),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("Age vs Systolic BP"), plotOutput("r_age_sbp", height = 300)),
      card(card_header("BMR vs Weight"), plotOutput("r_bmr_wt", height = 300))
    ),
    card(card_header("Body Fat % vs Systolic BP"),
         plotOutput("r_bf_sbp", height = 300))
  ),

  # ---- TAB 4: Group Comparisons ----
  nav_panel(
    title = tagList(bs_icon("people"), "Groups"),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("Mean BMI by Location"), plotOutput("g_bmi_loc", height = 300)),
      card(card_header("Mean Systolic BP by Age Group"),
           plotOutput("g_sbp_age", height = 300))
    ),
    layout_columns(
      col_widths = c(6, 6),
      card(card_header("BP Category by Gender"), plotOutput("g_bp_gender", height = 300)),
      card(card_header("BMI Category by Location"),
           plotOutput("g_bmi_cat_loc", height = 300))
    )
  ),

  # ---- TAB 5: Data ----
  nav_panel(
    title = tagList(bs_icon("table"), "Data"),
    card(
      card_header("Screening Records"),
      div(style = "margin-bottom:10px;",
          downloadButton("download_csv", "Download filtered CSV",
                         class = "btn-primary btn-sm")),
      DTOutput("tbl")
    )
  ),

  nav_spacer(),
  nav_item(tags$span(style = "color:#eaf1e6;font-size:.8rem;",
                     bs_icon("shield-check"), " Read-only view"))
)

# =============================================================================
# SERVER
# =============================================================================

server <- function(input, output, session) {

  # Auto-refreshing raw pull
  auto <- reactiveTimer(AUTO_REFRESH_SECONDS * 1000)

  raw_data <- reactive({
    auto()
    input$refresh
    clean_data(load_data())
  })

  # Populate location filter from data
  observe({
    d <- raw_data()
    locs <- sort(unique(na.omit(d$location)))
    updateSelectInput(session, "f_location",
                      choices = c("All", locs),
                      selected = isolate(input$f_location) %||% "All")
  })

  output$last_update <- renderText({
    raw_data()
    paste("Last updated:", format(Sys.time(), "%H:%M:%S"))
  })

  # Apply filters
  data <- reactive({
    d <- raw_data()
    if (nrow(d) == 0) return(d)
    if (!is.null(input$f_gender) && input$f_gender != "All")
      d <- d[d$gender == input$f_gender, ]
    if (!is.null(input$f_location) && input$f_location != "All")
      d <- d[d$location == input$f_location, ]
    if (!is.null(input$f_agegroup) && input$f_agegroup != "All")
      d <- d[as.character(d$age_group) == input$f_agegroup, ]
    d
  })

  # Helper: friendly empty-plot
  empty_plot <- function(msg = "No data yet") {
    ggplot() + annotate("text", x = 0, y = 0, label = msg,
                        colour = UBIN$forest, size = 6) +
      theme_void()
  }
  has_rows <- function(d, col = NULL) {
    if (nrow(d) == 0) return(FALSE)
    if (is.null(col)) return(TRUE)
    any(!is.na(d[[col]]))
  }

  # ---- KPIs ----
  output$kpi_n   <- renderText({ as.character(nrow(data())) })
  output$kpi_bmi <- renderText({
    d <- data(); if (!has_rows(d, "bmi")) return("—")
    sprintf("%.1f", mean(d$bmi, na.rm = TRUE))
  })
  output$kpi_bp  <- renderText({
    d <- data(); if (nrow(d) == 0) return("—")
    hi <- d$bp_class %in% c("Elevated","Hypertension Stage 1",
                            "Hypertension Stage 2",
                            "Hypertensive Crisis-Level Reading")
    sprintf("%d (%.0f%%)", sum(hi, na.rm = TRUE),
            100 * mean(hi, na.rm = TRUE))
  })
  output$kpi_rhr <- renderText({
    d <- data(); if (!has_rows(d, "rhr")) return("—")
    sprintf("%.0f", mean(d$rhr, na.rm = TRUE))
  })

  # ---- Overview plots ----
  output$p_bmi_cat <- renderPlot({
    d <- data(); if (!has_rows(d, "bmi_class")) return(empty_plot())
    d %>% filter(!is.na(bmi_class)) %>% count(bmi_class) %>%
      ggplot(aes(n, forcats_rev(bmi_class), fill = bmi_class)) +
      geom_col(width = .66) +
      geom_text(aes(label = n), hjust = -0.35, colour = UBIN$slate,
                fontface = "bold", size = 4) +
      scale_fill_manual(values = CAT_COLORS, guide = "none") +
      scale_x_continuous(expand = expansion(mult = c(0, .14))) +
      labs(x = NULL, y = NULL) +
      theme_ubin() +
      theme(panel.grid.major.y = element_blank(),
            panel.grid.major.x = element_line(colour = "#eef2f0"),
            axis.text.y = element_text(colour = UBIN$slate, face = "bold"))
  })

  output$p_bp_cat <- renderPlot({
    d <- data(); if (!has_rows(d, "bp_class")) return(empty_plot())
    d %>% filter(!is.na(bp_class)) %>% count(bp_class) %>%
      ggplot(aes(n, forcats_rev(bp_class), fill = bp_class)) +
      geom_col(width = .66) +
      geom_text(aes(label = n), hjust = -0.35, colour = UBIN$slate,
                fontface = "bold", size = 4) +
      scale_fill_manual(values = CAT_COLORS, guide = "none") +
      scale_x_continuous(expand = expansion(mult = c(0, .14))) +
      labs(x = NULL, y = NULL) +
      theme_ubin() +
      theme(panel.grid.major.y = element_blank(),
            panel.grid.major.x = element_line(colour = "#eef2f0"),
            axis.text.y = element_text(colour = UBIN$slate, face = "bold"))
  })

  output$p_flag <- renderPlot({
    d <- data(); if (!has_rows(d, "flag")) return(empty_plot())
    cnt <- d %>% filter(!is.na(flag)) %>% count(flag)
    total <- sum(cnt$n)
    labs_map <- c(green = "Within range", amber = "Monitor", red = "Follow-up")
    cnt$label <- labs_map[as.character(cnt$flag)]
    ggplot(cnt, aes(x = 2, y = n, fill = flag)) +
      geom_col(width = 1, colour = "white", linewidth = 1.5) +
      coord_polar(theta = "y") +
      xlim(0.5, 2.5) +
      annotate("text", x = 0.5, y = 0, label = total, size = 11,
               fontface = "bold", colour = UBIN$slate) +
      annotate("text", x = 0.5, y = 0, label = "\n\n\nparticipants",
               size = 3.6, colour = UBIN$muted) +
      scale_fill_manual(values = CAT_COLORS, name = NULL,
                        labels = labs_map) +
      theme_void(base_family = "Inter") +
      theme(legend.position = "right",
            legend.text = element_text(colour = UBIN$slate, size = 12))
  })

  output$p_time <- renderPlot({
    d <- data(); if (!has_rows(d, "timestamp_sgt")) return(empty_plot())
    d %>% filter(!is.na(timestamp_sgt)) %>%
      mutate(day = as.Date(timestamp_sgt)) %>% count(day) %>%
      ggplot(aes(day, n)) +
      geom_col(fill = UBIN$teal, width = .8) +
      labs(x = NULL, y = "Screenings") + theme_ubin()
  })

  # ---- Distribution plots ----
  hist_plot <- function(d, col, xlab, fill, binwidth = NULL) {
    if (!has_rows(d, col)) return(empty_plot())
    ggplot(d[!is.na(d[[col]]), ], aes(x = .data[[col]])) +
      geom_histogram(fill = fill, colour = "white", bins = 20,
                     binwidth = binwidth) +
      labs(x = xlab, y = "Count") + theme_ubin()
  }
  output$d_bmi <- renderPlot(hist_plot(data(), "bmi", "BMI (kg/m²)", UBIN$green))
  output$d_bf  <- renderPlot(hist_plot(data(), "body_fat", "Body Fat (%)", UBIN$teal))
  output$d_rhr <- renderPlot(hist_plot(data(), "rhr", "Resting HR (bpm)", UBIN$coral))
  output$d_bmr <- renderPlot(hist_plot(data(), "bmr", "BMR (kcal/day)", UBIN$amber))
  output$d_age <- renderPlot(hist_plot(data(), "age", "Age (years)", UBIN$sage))

  output$d_bp <- renderPlot({
    d <- data(); if (!has_rows(d, "sbp") && !has_rows(d, "dbp")) return(empty_plot())
    long <- d %>% select(sbp, dbp) %>%
      pivot_longer(everything(), names_to = "type", values_to = "mmHg") %>%
      filter(!is.na(mmHg)) %>%
      mutate(type = recode(type, sbp = "Systolic", dbp = "Diastolic"))
    ggplot(long, aes(mmHg, fill = type)) +
      geom_histogram(alpha = .7, position = "identity", bins = 20,
                     colour = "white") +
      scale_fill_manual(values = c("Systolic" = UBIN$coral,
                                   "Diastolic" = UBIN$blue), name = NULL) +
      labs(x = "mmHg", y = "Count") + theme_ubin()
  })

  # ---- Relationship plots ----
  scatter_plot <- function(d, xcol, ycol, xlab, ylab, colour = UBIN$green) {
    if (!has_rows(d, xcol) || !has_rows(d, ycol)) return(empty_plot())
    dd <- d[!is.na(d[[xcol]]) & !is.na(d[[ycol]]), ]
    if (nrow(dd) == 0) return(empty_plot())
    p <- ggplot(dd, aes(.data[[xcol]], .data[[ycol]])) +
      geom_point(colour = colour, alpha = .7, size = 2.4)
    if (nrow(dd) >= 3)
      p <- p + geom_smooth(method = "lm", se = TRUE, colour = UBIN$forest,
                           fill = "#cfe0cf", linewidth = .8)
    p + labs(x = xlab, y = ylab) + theme_ubin()
  }
  output$r_bmi_bf  <- renderPlot(scatter_plot(data(), "bmi", "body_fat",
                        "BMI (kg/m²)", "Body Fat (%)", UBIN$teal))
  output$r_bmi_sbp <- renderPlot(scatter_plot(data(), "bmi", "sbp",
                        "BMI (kg/m²)", "Systolic BP (mmHg)", UBIN$coral))
  output$r_age_sbp <- renderPlot(scatter_plot(data(), "age", "sbp",
                        "Age (years)", "Systolic BP (mmHg)", UBIN$blue))
  output$r_bmr_wt  <- renderPlot(scatter_plot(data(), "weight", "bmr",
                        "Weight (kg)", "BMR (kcal/day)", UBIN$amber))
  output$r_bf_sbp  <- renderPlot(scatter_plot(data(), "body_fat", "sbp",
                        "Body Fat (%)", "Systolic BP (mmHg)", UBIN$green))

  # ---- Group comparison plots ----
  output$g_bmi_loc <- renderPlot({
    d <- data(); if (!has_rows(d, "bmi")) return(empty_plot())
    d %>% filter(!is.na(bmi), !is.na(location)) %>%
      group_by(location) %>%
      summarise(mean_bmi = mean(bmi), se = sd(bmi)/sqrt(n()), .groups = "drop") %>%
      ggplot(aes(location, mean_bmi, fill = location)) +
      geom_col(width = .7) +
      geom_errorbar(aes(ymin = mean_bmi - se, ymax = mean_bmi + se), width = .2) +
      scale_fill_brewer(palette = "Greens", guide = "none") +
      labs(x = NULL, y = "Mean BMI (kg/m²)") + theme_ubin()
  })

  output$g_sbp_age <- renderPlot({
    d <- data(); if (!has_rows(d, "sbp")) return(empty_plot())
    d %>% filter(!is.na(sbp), !is.na(age_group)) %>%
      group_by(age_group) %>%
      summarise(mean_sbp = mean(sbp), se = sd(sbp)/sqrt(n()), .groups = "drop") %>%
      ggplot(aes(age_group, mean_sbp, group = 1)) +
      geom_line(colour = UBIN$teal, linewidth = 1) +
      geom_point(colour = UBIN$forest, size = 3) +
      geom_errorbar(aes(ymin = mean_sbp - se, ymax = mean_sbp + se), width = .15,
                    colour = UBIN$forest) +
      labs(x = "Age group", y = "Mean Systolic BP (mmHg)") + theme_ubin()
  })

  output$g_bp_gender <- renderPlot({
    d <- data(); if (!has_rows(d, "bp_class")) return(empty_plot())
    d %>% filter(!is.na(bp_class), !is.na(gender)) %>%
      count(gender, bp_class) %>%
      ggplot(aes(gender, n, fill = bp_class)) +
      geom_col(position = "fill", width = .7) +
      scale_y_continuous(labels = percent) +
      scale_fill_manual(values = CAT_COLORS, name = "BP Category") +
      labs(x = NULL, y = "Proportion") + theme_ubin()
  })

  output$g_bmi_cat_loc <- renderPlot({
    d <- data(); if (!has_rows(d, "bmi_class")) return(empty_plot())
    d %>% filter(!is.na(bmi_class), !is.na(location)) %>%
      count(location, bmi_class) %>%
      ggplot(aes(location, n, fill = bmi_class)) +
      geom_col(position = "fill", width = .7) +
      scale_y_continuous(labels = percent) +
      scale_fill_manual(values = CAT_COLORS, name = "BMI Category") +
      labs(x = NULL, y = "Proportion") + theme_ubin() +
      theme(axis.text.x = element_text(angle = 15, hjust = 1))
  })

  # ---- Data table ----
  table_data <- reactive({
    d <- data()
    if (nrow(d) == 0) return(d)
    d %>% transmute(
      Time = format(timestamp_sgt, "%Y-%m-%d %H:%M"),
      Name = name, Gender = gender, Age = age, Location = location,
      BMI = bmi, `BMI Class` = as.character(bmi_class),
      `Body Fat %` = body_fat,
      `BP` = ifelse(is.na(sbp) | is.na(dbp), NA, paste0(sbp, "/", dbp)),
      `BP Class` = as.character(bp_class),
      RHR = rhr, Flag = as.character(flag)
    )
  })

  output$tbl <- renderDT({
    d <- table_data()
    if (nrow(d) == 0)
      return(datatable(data.frame(Message = "No data yet — waiting for submissions."),
                       options = list(dom = "t"), rownames = FALSE))
    datatable(d, rownames = FALSE, filter = "top",
              options = list(pageLength = 15, scrollX = TRUE,
                             order = list(list(0, "desc"))))
  })

  output$download_csv <- downloadHandler(
    filename = function() paste0("ubin_health_check_", Sys.Date(), ".csv"),
    content = function(file) write.csv(table_data(), file, row.names = FALSE)
  )
}

`%||%` <- function(a, b) if (is.null(a)) b else a

# Reverse factor level order so horizontal bar charts read top-to-bottom
# in the intended sequence (without pulling in the forcats package).
forcats_rev <- function(f) {
  f <- as.factor(f)
  factor(f, levels = rev(levels(f)))
}

shinyApp(ui, server)
